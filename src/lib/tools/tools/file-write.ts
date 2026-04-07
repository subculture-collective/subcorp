// file_write tool — write files to /workspace in the toolbox
// Enforces per-agent path ACLs and auto-appends to manifest for output/ writes.
// ACLs: static WRITE_ACLS map + dynamic ops_acl_grants from DB.
import type { NativeTool } from '../types';
import type { AgentId } from '../../types';
import { execInToolbox } from '../executor';
import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/db';
import path from 'node:path';

/**
 * Per-agent write ACLs.
 * Each entry is a prefix relative to /workspace/ that the agent may write to.
 * All agents can read all of /workspace.
 */
export const WRITE_ACLS: Record<AgentId, string[]> = {
    chora:   ['agents/chora/', 'output/reports/', 'output/briefings/', 'output/digests/'],
    subrosa: ['agents/subrosa/', 'output/reviews/', 'output/reports/'],
    thaum:   ['agents/thaum/', 'output/'],
    praxis:  ['agents/praxis/', 'output/', 'projects/subcult-corp/'],
    mux:     ['agents/mux/', 'output/', 'projects/subcult-corp/'],
    primus:  ['agents/primus/', 'shared/', 'output/'],
};

/** Droids write to their own scratch directory only */
const DROID_PREFIX = 'droids/';

/** Check static ACLs only (synchronous, for backwards compat) */
export function isPathAllowed(agentId: string, relativePath: string): boolean {
    if (agentId.startsWith('droid-')) {
        return relativePath.startsWith(`${DROID_PREFIX}${agentId}/`);
    }

    const acls = WRITE_ACLS[agentId as AgentId];
    if (!acls) return false;

    return acls.some(prefix => relativePath.startsWith(prefix));
}

// ─── Dynamic ACL grants cache (30s TTL per agent) ───

const GRANT_CACHE_TTL_MS = 30_000;
const grantCache = new Map<string, { prefixes: string[]; ts: number }>();

async function getActiveGrants(agentId: string): Promise<string[]> {
    const cached = grantCache.get(agentId);
    if (cached && Date.now() - cached.ts < GRANT_CACHE_TTL_MS) {
        return cached.prefixes;
    }

    const rows = await sql<{ path_prefix: string }[]>`
        SELECT path_prefix FROM ops_acl_grants
        WHERE agent_id = ${agentId} AND expires_at > NOW()
    `;

    const prefixes = rows.map(r => r.path_prefix);
    grantCache.set(agentId, { prefixes, ts: Date.now() });
    return prefixes;
}

/** Check both static ACLs and dynamic DB grants */
async function isPathAllowedWithGrants(agentId: string, relativePath: string): Promise<boolean> {
    // Static ACLs first (fast path)
    if (isPathAllowed(agentId, relativePath)) return true;

    // Dynamic grants from DB
    try {
        const grants = await getActiveGrants(agentId);
        return grants.some(prefix => relativePath.startsWith(prefix));
    } catch {
        // DB unavailable — deny
        return false;
    }
}

/** Append a manifest entry for artifacts written to output/ */
async function appendManifest(
    artifactId: string,
    fullPath: string,
    agentId: string,
    contentLength: number,
): Promise<void> {
    const relativePath = fullPath.replace('/workspace/', '');

    // Determine artifact type from path
    let artifactType = 'unknown';
    if (relativePath.startsWith('output/briefings/')) artifactType = 'briefing';
    else if (relativePath.startsWith('output/reports/')) artifactType = 'report';
    else if (relativePath.startsWith('output/reviews/')) artifactType = 'review';
    else if (relativePath.startsWith('output/digests/')) artifactType = 'digest';
    else if (relativePath.startsWith('output/')) artifactType = 'artifact';

    const entry = JSON.stringify({
        artifact_id: artifactId,
        path: relativePath,
        agent_id: agentId,
        type: artifactType,
        created_at: new Date().toISOString(),
        bytes: contentLength,
    });

    const b64 = Buffer.from(entry + '\n').toString('base64');
    await execInToolbox(
        `echo '${b64}' | base64 -d >> /workspace/shared/manifests/index.jsonl`,
        5_000,
    );
}

/**
 * Create a file_write execute function bound to a specific agentId.
 * The agentId is captured via closure so ACLs are enforced without
 * needing the SDK to pass context through.
 */
export function createFileWriteExecute(agentId: string) {
    return async (params: Record<string, unknown>) => {
        const rawPath = params.path as string;
        const content = params.content as string;
        const append = params.append as boolean ?? false;

        // Prevent path traversal with robust protection
        // 1. Reject paths containing .. anywhere (handles ../, ..\\, URL-encoded, etc.)
        if (rawPath.includes('..')) {
            return {
                error: 'Invalid path: path traversal sequences (..) are not allowed',
            };
        }

        // 2. Normalize and resolve the path
        const normalizedPath = path.normalize(rawPath);
        const relativePath = normalizedPath.startsWith('/workspace/')
            ? normalizedPath.replace('/workspace/', '')
            : normalizedPath.startsWith('/')
            ? normalizedPath.slice(1)
            : normalizedPath;

        // 3. Resolve to absolute path and verify it's within /workspace/
        const fullPath = path.resolve('/workspace', relativePath);
        if (!fullPath.startsWith('/workspace/')) {
            return {
                error: 'Invalid path: must be within /workspace/',
            };
        }

        // Enforce write ACLs (static + dynamic grants)
        if (!(await isPathAllowedWithGrants(agentId, relativePath))) {
            return {
                error: `Access denied: ${agentId} cannot write to ${relativePath}. Check your designated write paths.`,
            };
        }

        // Base64-encode content to avoid shell escaping issues
        const b64 = Buffer.from(content).toString('base64');
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        const op = append ? '>>' : '>';

        const command = `mkdir -p '${dir.replace(/'/g, "'\\''")}' && echo '${b64}' | base64 -d ${op} '${fullPath.replace(/'/g, "'\\''")}'`;

        const result = await execInToolbox(command, 10_000);

        if (result.exitCode !== 0) {
            return { error: `File write failed: ${result.stderr || 'unknown error'}` };
        }

        // Auto-append manifest for output/ writes
        if (relativePath.startsWith('output/')) {
            const artifactId = randomUUID();
            try {
                await appendManifest(artifactId, fullPath, agentId, content.length);
            } catch {
                // Non-fatal — don't fail the write because manifest append failed
            }
            return { path: fullPath, bytes: content.length, appended: append, artifact_id: artifactId };
        }

        return { path: fullPath, bytes: content.length, appended: append };
    };
}

export const fileWriteTool: NativeTool = {
    name: 'file_write',
    description: 'Write content to a file in the shared workspace. Creates parent directories if needed. Path access is restricted by agent role.',
    agents: ['chora', 'subrosa', 'thaum', 'praxis', 'mux', 'primus'],
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'File path relative to /workspace (e.g., "output/reports/2026-02-13__research__brief__topic__chora__v01.md")',
            },
            content: {
                type: 'string',
                description: 'The content to write to the file',
            },
            append: {
                type: 'boolean',
                description: 'If true, append to file instead of overwriting (default false)',
            },
        },
        required: ['path', 'content'],
    },
    // Default execute explicitly fails — tool must be bound to an agentId via registry
    execute: async () => {
        return {
            error: 'file_write tool must be bound to an agent ID. This tool should only be used through the registry with getAgentTools() or getDroidTools().',
        };
    },
};
