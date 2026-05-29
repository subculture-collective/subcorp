// /api/ops/artifacts — unified read-only artifact gallery data
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { execInToolbox } from '@/lib/tools/executor';

export const dynamic = 'force-dynamic';

type ArtifactSource = 'content' | 'workspace';

interface ArtifactItem {
    id: string;
    source: ArtifactSource;
    type: string;
    title: string;
    body_preview: string;
    path: string | null;
    agent_id: string | null;
    status: string | null;
    created_at: string;
    updated_at: string;
    size_bytes: number | null;
    metadata: Record<string, unknown>;
}

interface ContentArtifactRow {
    id: string;
    author_agent: string;
    content_type: string;
    title: string;
    body: string;
    status: string;
    source_session_id: string | null;
    published_at: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

interface WorkspaceFileRow {
    relativePath: string;
    size: number;
    modifiedEpoch: number;
    preview: string;
}

const WORKSPACE_ROOT = '/workspace';
const OUTPUT_ROOT = '/workspace/output';
const MAX_FILE_PREVIEW_BYTES = 2 * 1024;
const MAX_WORKSPACE_FILES = 200;
const MAX_WORKSPACE_PREVIEW_FILES = 20;
const FIND_DELIMITER = '__SUBCORP_ARTIFACT__';
const log = logger.child({ module: 'ops-artifacts-route' });

function clampLimit(raw: string | null): number {
    const parsed = parseInt(raw ?? '80', 10);
    if (Number.isNaN(parsed)) return 80;
    return Math.max(1, Math.min(parsed, 200));
}

function shellEscape(value: string): string {
    return "'" + value.replace(/'/g, "'\\''") + "'";
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function inferTitleFromPath(relativePath: string): string {
    const base = relativePath.split('/').pop() ?? relativePath;

    return base
        .replace(/\.[^.]+$/, '')
        .replace(/^\d{4}-\d{2}-\d{2}__?/, '')
        .replace(/__/g, ' · ')
        .replace(/[_-]+/g, ' ')
        .trim() || base;
}

function inferTypeFromPath(relativePath: string): string {
    const lower = relativePath.toLowerCase();

    if (lower.includes('thread') || lower.includes('tweet')) return 'thread';
    if (lower.startsWith('output/blog/')) return 'blog';
    if (lower.startsWith('output/briefings/')) return 'briefing';
    if (lower.startsWith('output/reports/')) return 'report';
    if (lower.startsWith('output/reviews/')) return 'review';
    if (lower.startsWith('output/digests/')) return 'digest';
    if (lower.startsWith('output/newsletters/')) return 'newsletter';
    if (lower.startsWith('output/newspapers/')) return 'newspaper';
    if (lower.startsWith('output/projects/')) return 'project';
    if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'document';
    return 'artifact';
}

function isPreviewablePath(relativePath: string): boolean {
    const lower = relativePath.toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.json');
}

function matchesQuery(item: ArtifactItem, query: string): boolean {
    if (!query) return true;

    const haystack = [
        item.title,
        item.type,
        item.agent_id ?? '',
        item.status ?? '',
        item.path ?? '',
        item.body_preview,
    ].join('\n').toLowerCase();

    return haystack.includes(query.toLowerCase());
}

async function loadContentArtifacts(limit: number): Promise<ArtifactItem[]> {
    const rows = await sql<ContentArtifactRow[]>`
        SELECT id, author_agent, content_type, title, body, status,
               source_session_id, published_at, metadata, created_at, updated_at
        FROM ops_content_drafts
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;

    return rows.map(row => {
        const body = normalizeText(row.body);

        return {
            id: `content:${row.id}`,
            source: 'content' as const,
            type: row.content_type,
            title: row.title || 'Untitled draft',
            body_preview: body.slice(0, MAX_FILE_PREVIEW_BYTES),
            path: null,
            agent_id: row.author_agent,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            size_bytes: body.length,
            metadata: {
                ...(row.metadata ?? {}),
                source_session_id: row.source_session_id,
                published_at: row.published_at,
            },
        };
    });
}

async function listWorkspaceOutputFiles(limit: number): Promise<WorkspaceFileRow[]> {
    const effectiveLimit = Math.min(limit, MAX_WORKSPACE_FILES, MAX_WORKSPACE_PREVIEW_FILES);
    const command =
        `if [ ! -d ${shellEscape(OUTPUT_ROOT)} ]; then exit 0; fi; ` +
        `find ${shellEscape(OUTPUT_ROOT)} -type f ` +
        `\( -name '*.md' -o -name '*.txt' -o -name '*.json' \) ` +
        `-printf '%T@\\t%s\\t%p\\0' 2>/dev/null | sort -z -nr | head -z -n ${effectiveLimit} | ` +
        `while IFS= read -r -d '' record; do ` +
        `modified="\${record%%$'\\t'*}"; ` +
        `rest="\${record#*$'\\t'}"; ` +
        `size="\${rest%%$'\\t'*}"; ` +
        `absolutePath="\${rest#*$'\\t'}"; ` +
        `relativePath="\${absolutePath#${WORKSPACE_ROOT}/}"; ` +
        `printf '\\n${FIND_DELIMITER}%s\\t%s\\t%s\\n' "$modified" "$size" "$relativePath"; ` +
        `head -c ${MAX_FILE_PREVIEW_BYTES} "$absolutePath" 2>/dev/null || true; ` +
        `done`;

    const result = await execInToolbox(command, 10_000);
    if (result.exitCode !== 0 || !result.stdout.trim()) return [];

    return result.stdout.split(`\n${FIND_DELIMITER}`).flatMap(chunk => {
        if (!chunk) return [];

        const firstNewline = chunk.indexOf('\n');
        if (firstNewline < 0) return [];

        const [modifiedRaw, sizeRaw, relativePath] = chunk.slice(0, firstNewline).split('\t');
        if (!relativePath || !isPreviewablePath(relativePath)) return [];

        const absolute = path.join(WORKSPACE_ROOT, relativePath);
        if (!absolute.startsWith(`${OUTPUT_ROOT}/`)) return [];

        return [{
            relativePath,
            size: parseInt(sizeRaw, 10) || 0,
            modifiedEpoch: Math.floor(parseFloat(modifiedRaw) || 0),
            preview: chunk.slice(firstNewline + 1),
        }];
    });
}

async function loadWorkspaceArtifacts(limit: number): Promise<ArtifactItem[]> {
    const files = await listWorkspaceOutputFiles(limit);

    return files.map(file => {
        const modified = new Date(file.modifiedEpoch * 1000).toISOString();

        return {
            id: `workspace:${file.relativePath}`,
            source: 'workspace' as const,
            type: inferTypeFromPath(file.relativePath),
            title: inferTitleFromPath(file.relativePath),
            body_preview: file.preview,
            path: `/${file.relativePath}`,
            agent_id: null,
            status: null,
            created_at: modified,
            updated_at: modified,
            size_bytes: file.size,
            metadata: {},
        };
    });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const limit = clampLimit(searchParams.get('limit'));
    const q = searchParams.get('q')?.trim() ?? '';
    const type = searchParams.get('type')?.trim() ?? '';
    const source = searchParams.get('source')?.trim() ?? '';

    try {
        const [content, workspace] = await Promise.all([
            source === 'workspace' ? Promise.resolve([]) : loadContentArtifacts(limit),
            source === 'content' ? Promise.resolve([]) : loadWorkspaceArtifacts(limit),
        ]);

        const artifacts = [...content, ...workspace]
            .filter(item => !source || item.source === source)
            .filter(item => !type || item.type === type)
            .filter(item => matchesQuery(item, q))
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, limit);

        return NextResponse.json({ artifacts });
    } catch (err) {
        log.error('failed to load artifacts', { err });
        return NextResponse.json(
            { error: 'Failed to load artifacts' },
            { status: 500 },
        );
    }
}
