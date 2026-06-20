// file_write tool — write files to /workspace in the toolbox
// Enforces per-agent path ACLs and writes raw files to /workspace.
// ACLs: static WRITE_ACLS map + dynamic ops_acl_grants from DB.
import type { NativeTool } from '../types';
import type { AgentId } from '../../types';
import { execInToolbox } from '../executor';
import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/db';
import path from 'node:path';
import { createLogger } from '@/lib/logger';
import { tenantCacheKey } from '@/lib/tenant/cache-key';

/**
 * Per-agent write ACLs.
 * Each entry is a prefix relative to /workspace/ that the agent may write to.
 * All agents can read all of /workspace.
 */
export const WRITE_ACLS: Record<AgentId, string[]> = {
    chora: [],
    subrosa: [],
    thaum: [],
    praxis: ['agents/praxis/', 'output/', 'shared/', 'projects/'],
    mux: ['agents/mux/', 'output/', 'shared/', 'projects/'],
    primus: ['agents/primus/', 'output/', 'shared/', 'projects/'],
};

const log = createLogger({ service: 'file_write' });

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
    const cacheKey = tenantCacheKey('acl-grants', agentId);
    const cached = grantCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < GRANT_CACHE_TTL_MS) {
        return cached.prefixes;
    }

    const rows = await sql<{ path_prefix: string }[]>`
        SELECT path_prefix FROM ops_acl_grants
        WHERE agent_id = ${agentId} AND expires_at > NOW()
    `;

    const prefixes = rows.map(r => r.path_prefix);
    grantCache.set(cacheKey, { prefixes, ts: Date.now() });
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
    } catch (grantErr) {
        // DB unavailable — deny
        log.warn('ACL grant lookup failed (non-fatal)', {
            error: grantErr,
            agentId,
            relativePath,
        });
        return false;
    }
}

function forbiddenWorkspaceProjectRootWritePath(relativePath: string): string | null {
    if (/^shared\/manifests(?:\/|$)/i.test(relativePath)) {
        return 'trusted artifact manifests are orchestrator-managed and cannot be written through file_write';
    }

    const outputProjectsTarget = /^output\/projects\//i;
    if (outputProjectsTarget.test(relativePath)) {
        return 'product code writes must not be placed under /workspace/output/projects; use a mission-specific /workspace/projects/<slug>/ directory for code and output/reports or output/reviews for artifacts';
    }

    if (/^projects\/agents\//i.test(relativePath)) {
        return 'agent notes and inbox handoffs must be written under agents/<agent>/, not /workspace/projects/agents';
    }

    const directProjectsRootTarget = /^projects\/(?:package\.json|README\.md|app\.py|server\.js|index\.[a-z]+|src(?:\/|$)|tests?(?:\/|$)|config(?:\/|$))/i;
    if (directProjectsRootTarget.test(relativePath)) {
        return 'product code writes must target a mission-specific /workspace/projects/<slug>/ directory, not /workspace/projects root';
    }

    return null;
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

        const workspaceProjectRootWrite = forbiddenWorkspaceProjectRootWritePath(relativePath);
        if (workspaceProjectRootWrite) {
            return { error: workspaceProjectRootWrite, denied: true, policy: 'workspace_project_root_boundary' };
        }

        // Base64-encode content to avoid shell escaping issues
        const b64 = Buffer.from(content).toString('base64');
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        const op = append ? '>>' : '>';

        const escapedDir = dir.replace(/'/g, "'\\''");
        const escapedPath = fullPath.replace(/'/g, "'\\''");
        const command = `mkdir -p '${escapedDir}' && echo '${b64}' | base64 -d ${op} '${escapedPath}' && chmod 0644 '${escapedPath}'`;

        const result = await execInToolbox(command, 10_000);

        if (result.exitCode !== 0) {
            return { error: `File write failed: ${result.stderr || 'unknown error'}` };
        }

        return relativePath.startsWith('output/')
            ? { path: fullPath, bytes: content.length, appended: append, artifact_id: randomUUID() }
            : { path: fullPath, bytes: content.length, appended: append };
    };
}

export const fileWriteTool: NativeTool = {
    name: 'file_write',
    description: 'Write content to a file in the shared workspace. Creates parent directories if needed. Path access is restricted by agent role.',
    agents: ['praxis', 'mux', 'primus'],
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
