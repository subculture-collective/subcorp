// /api/ops/artifacts — unified read-only artifact gallery data
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { execInToolbox } from '@/lib/tools/executor';
import { requireOpsRead } from '@/lib/auth/middleware';

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
const CONTENT_PREVIEW_BYTES = 2 * 1024;
const WORKSPACE_PREVIEW_BYTES = 128;
const MAX_WORKSPACE_FILES = 500;
const FIND_DELIMITER = '__SUBCORP_ARTIFACT__';
const log = logger.child({ module: 'ops-artifacts-route' });

function clampLimit(raw: string | null): number {
    const parsed = parseInt(raw ?? '80', 10);
    if (Number.isNaN(parsed)) return 80;
    return Math.max(1, Math.min(parsed, 500));
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
            body_preview: body.slice(0, CONTENT_PREVIEW_BYTES),
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
    const effectiveLimit = Math.min(limit, MAX_WORKSPACE_FILES);
    const command =
        `if [ ! -d ${shellEscape(OUTPUT_ROOT)} ]; then exit 0; fi; ` +
        `find ${shellEscape(OUTPUT_ROOT)} -type f ` +
        `-printf '%T@\\t%s\\t%p\\n' 2>/dev/null | sort -nr | head -n ${effectiveLimit}`;

    const result = await execInToolbox(command, 10_000);
    if (result.exitCode !== 0 || !result.stdout.trim()) return [];

    const files = result.stdout.trim().split('\n').flatMap(line => {
        const [modifiedRaw, sizeRaw, absolutePath] = line.split('\t');
        if (!absolutePath?.startsWith(`${WORKSPACE_ROOT}/`)) return [];

        const relativePath = absolutePath.replace(`${WORKSPACE_ROOT}/`, '');
        if (!relativePath || !isPreviewablePath(relativePath)) return [];

        const absolute = path.join(WORKSPACE_ROOT, relativePath);
        if (!absolute.startsWith(`${OUTPUT_ROOT}/`)) return [];

        return [{
            relativePath,
            size: parseInt(sizeRaw, 10) || 0,
            modifiedEpoch: Math.floor(parseFloat(modifiedRaw) || 0),
            preview: '',
        }];
    });

    if (files.length === 0) return files;

    const previewCommand = files.map((file, index) => {
        const absolute = path.join(WORKSPACE_ROOT, file.relativePath);
        if (!absolute.startsWith(`${OUTPUT_ROOT}/`)) return '';

        return `printf '\\n${FIND_DELIMITER}${index}\\n'; head -c ${WORKSPACE_PREVIEW_BYTES} ${shellEscape(absolute)} 2>/dev/null || true`;
    }).filter(Boolean).join('; ');

    const previewResult = await execInToolbox(previewCommand, 10_000);
    if (previewResult.exitCode !== 0 || !previewResult.stdout) return files;

    for (const chunk of previewResult.stdout.split(`\n${FIND_DELIMITER}`)) {
        const markerMatch = chunk.match(/^(\d+)\n/);
        if (!markerMatch) continue;

        const index = parseInt(markerMatch[1], 10);
        if (!Number.isInteger(index) || !files[index]) continue;

        files[index].preview = chunk.slice(markerMatch[0].length);
    }

    return files;
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
    const authResult = await requireOpsRead();
    if (authResult instanceof NextResponse) return authResult;

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
