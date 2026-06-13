import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { jsonb, sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { emitEvent } from '@/lib/ops/events';

const log = logger.child({ module: 'content-publication' });

const DEFAULT_BLOG_DIR = 'output/blog';
const MAX_BACKFILL_BATCH = 20;
/** Container/workspace root used for constructing relative output paths. */
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT?.trim() || '/workspace';

interface ContentDraftRow {
    id: string;
    author_agent: string;
    content_type: string;
    title: string;
    body: string;
    status: string;
    metadata: Record<string, unknown>;
    published_at: string | null;
    created_at: string;
}

interface LocalPublicationState {
    status: 'published';
    slug: string;
    relative_path: string;
    published_at: string;
}

interface GhostPublicationState {
    status: 'pending' | 'failed' | 'published';
    attempts: number;
    last_attempt_at: string | null;
    next_retry_at: string | null;
    error: string | null;
    post_id?: string;
    post_url?: string;
    published_at?: string;
}

interface PublicationState {
    local?: LocalPublicationState;
    ghost?: GhostPublicationState;
}

export interface PublishApprovedResult {
    published: number;
    failed: number;
}

export interface GhostBackfillResult {
    processed: number;
    mirrored: number;
    failed: number;
    skipped: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isLocalPublicationState(value: unknown): value is LocalPublicationState {
    if (!isRecord(value)) return false;
    return (
        value.status === 'published' &&
        typeof value.slug === 'string' &&
        typeof value.relative_path === 'string' &&
        typeof value.published_at === 'string'
    );
}

function isGhostPublicationState(value: unknown): value is GhostPublicationState {
    if (!isRecord(value)) return false;

    const status = value.status;
    if (status !== 'pending' && status !== 'failed' && status !== 'published') {
        return false;
    }

    if (typeof value.attempts !== 'number') return false;

    const nullableString = (v: unknown) => typeof v === 'string' || v === null;
    if (!nullableString(value.last_attempt_at)) return false;
    if (!nullableString(value.next_retry_at)) return false;
    if (!nullableString(value.error)) return false;

    if (value.post_id !== undefined && typeof value.post_id !== 'string') {
        return false;
    }
    if (value.post_url !== undefined && typeof value.post_url !== 'string') {
        return false;
    }
    if (value.published_at !== undefined && typeof value.published_at !== 'string') {
        return false;
    }

    return true;
}

function getRootMetadata(
    metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
    return isRecord(metadata) ? metadata : {};
}

function getPublicationState(
    metadata: Record<string, unknown> | null | undefined,
): PublicationState {
    const root = getRootMetadata(metadata);
    const publication =
        isRecord(root.publication) ? root.publication : ({} as Record<string, unknown>);

    return {
        local: isLocalPublicationState(publication.local) ? publication.local : undefined,
        ghost: isGhostPublicationState(publication.ghost) ? publication.ghost : undefined,
    };
}

function mergePublicationState(
    metadata: Record<string, unknown> | null | undefined,
    publication: PublicationState,
): Record<string, unknown> {
    const root = getRootMetadata(metadata);
    const currentPublication = isRecord(root.publication) ? root.publication : {};
    return {
        ...root,
        publication: {
            ...currentPublication,
            ...(publication.local ? { local: publication.local } : {}),
            ...(publication.ghost ? { ghost: publication.ghost } : {}),
        },
    };
}

function slugifyTitle(input: string): string {
    const slug = input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 70);
    return slug || 'post';
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function resolveBlogOutputDir(): Promise<string> {
    const explicit = process.env.BLOG_OUTPUT_DIR?.trim();
    if (explicit) {
        await fs.mkdir(explicit, { recursive: true });
        return explicit;
    }

    try {
        await fs.access(WORKSPACE_ROOT);
        const outputDir = path.join(WORKSPACE_ROOT, DEFAULT_BLOG_DIR);
        await fs.mkdir(outputDir, { recursive: true });
        return outputDir;
    } catch {
        const outputDir = path.join(process.cwd(), 'workspace', DEFAULT_BLOG_DIR);
        await fs.mkdir(outputDir, { recursive: true });
        return outputDir;
    }
}

function formatPublishedDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function renderLocalMarkdown(title: string, body: string, publishedAt: string): string {
    return `# ${title}\n\n_${formatPublishedDate(publishedAt)}_\n\n---\n\n${body.trim()}\n`;
}

async function resolveSlug(
    title: string,
    draftId: string,
    outputDir: string,
    existingSlug?: string,
): Promise<string> {
    if (existingSlug) return existingSlug;

    const base = slugifyTitle(title);
    const basePath = path.join(outputDir, `${base}.md`);
    if (!(await fileExists(basePath))) return base;

    return `${base}-${draftId.slice(0, 8)}`;
}

async function publishLocally(
    draft: ContentDraftRow,
    existingLocal?: LocalPublicationState,
): Promise<LocalPublicationState> {
    const outputDir = await resolveBlogOutputDir();
    const publishedAt = draft.published_at ?? new Date().toISOString();
    const slug = await resolveSlug(draft.title, draft.id, outputDir, existingLocal?.slug);
    const filename = `${slug}.md`;
    const filePath = path.join(outputDir, filename);
    const markdown = renderLocalMarkdown(draft.title, draft.body, publishedAt);

    await fs.writeFile(filePath, markdown, 'utf-8');

    // Derive relative_path from the actual output directory so that it
    // stays consistent with where the file was written, even when
    // BLOG_OUTPUT_DIR overrides the default location.
    let relativePath: string;
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedWorkspace = WORKSPACE_ROOT.replace(/\\/g, '/');
    const normalizedCwd = process.cwd().replace(/\\/g, '/');
    if (normalizedFilePath.startsWith(normalizedWorkspace + '/')) {
        relativePath = path.posix.relative(normalizedWorkspace, normalizedFilePath);
    } else if (normalizedFilePath.startsWith(normalizedCwd + '/')) {
        relativePath = path.posix.relative(normalizedCwd, normalizedFilePath);
    } else {
        // Custom BLOG_OUTPUT_DIR outside known roots — store the absolute path.
        relativePath = normalizedFilePath;
    }

    return {
        status: 'published',
        slug,
        relative_path: relativePath,
        published_at: publishedAt,
    };
}

interface GhostConfig {
    adminApiUrl: string;
    adminApiKey: string;
    siteUrl: string;
}

function normalizeGhostAdminUrl(input: string): string {
    const trimmed = input.trim().replace(/\/$/, '');
    if (trimmed.includes('/ghost/api/admin')) return trimmed;
    return `${trimmed}/ghost/api/admin`;
}

function getGhostConfig(): GhostConfig | null {
    const adminApiKey = process.env.GHOST_ADMIN_API_KEY?.trim();
    const siteUrl =
        process.env.GHOST_URL?.trim() ||
        process.env.GHOST_SITE_URL?.trim() ||
        'https://blog.subcult.tv';
    const adminApiUrl =
        process.env.GHOST_ADMIN_API_URL?.trim() ||
        normalizeGhostAdminUrl(siteUrl);

    if (!adminApiKey) return null;

    return {
        adminApiUrl: normalizeGhostAdminUrl(adminApiUrl),
        adminApiKey,
        siteUrl: siteUrl.replace(/\/$/, ''),
    };
}

function createGhostJwt(adminApiKey: string): string {
    const [keyId, secret] = adminApiKey.split(':');
    if (!keyId || !secret) {
        throw new Error('Invalid GHOST_ADMIN_API_KEY format. Expected "<id>:<secret>"');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
        JSON.stringify({ alg: 'HS256', kid: keyId, typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
        JSON.stringify({ iat: nowSeconds, exp: nowSeconds + 5 * 60, aud: '/admin/' }),
    ).toString('base64url');

    const signature = crypto
        .createHmac('sha256', Buffer.from(secret, 'hex'))
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function markdownToGhostHtml(markdown: string): string {
    const lines = markdown.split('\n');
    const html: string[] = [];
    let paragraph: string[] = [];
    let inList = false;

    const flushParagraph = () => {
        if (paragraph.length === 0) return;
        html.push(`<p>${escapeHtml(paragraph.join(' ').trim())}</p>`);
        paragraph = [];
    };

    const closeList = () => {
        if (!inList) return;
        html.push('</ul>');
        inList = false;
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        const listMatch = line.match(/^[-*]\s+(.*)$/);

        if (headingMatch) {
            flushParagraph();
            closeList();
            const level = headingMatch[1].length;
            html.push(`<h${level}>${escapeHtml(headingMatch[2].trim())}</h${level}>`);
            continue;
        }

        if (listMatch) {
            flushParagraph();
            if (!inList) {
                html.push('<ul>');
                inList = true;
            }
            html.push(`<li>${escapeHtml(listMatch[1].trim())}</li>`);
            continue;
        }

        if (line.trim() === '') {
            flushParagraph();
            closeList();
            continue;
        }

        paragraph.push(line.trim());
    }

    flushParagraph();
    closeList();

    return html.join('\n');
}

function computeNextRetryIso(attempts: number): string {
    const backoffMinutes = Math.min(240, 5 * Math.pow(2, Math.max(0, attempts - 1)));
    return new Date(Date.now() + backoffMinutes * 60_000).toISOString();
}

const GHOST_REQUEST_TIMEOUT_MS = 15_000;

async function mirrorToGhost(
    draft: ContentDraftRow,
    local: LocalPublicationState,
    previousGhost?: GhostPublicationState,
): Promise<GhostPublicationState> {
    const config = getGhostConfig();
    if (!config) {
        return {
            status: 'pending',
            attempts: previousGhost?.attempts ?? 0,
            last_attempt_at: previousGhost?.last_attempt_at ?? null,
            next_retry_at: null,
            error: 'ghost_not_configured',
            post_id: previousGhost?.post_id,
            post_url: previousGhost?.post_url,
            published_at: previousGhost?.published_at,
        };
    }

    const attempt = (previousGhost?.attempts ?? 0) + 1;
    const lastAttemptAt = new Date().toISOString();

    try {
        const jwt = createGhostJwt(config.adminApiKey);
        const endpoint = `${config.adminApiUrl}/posts/?source=html`;
        const html = markdownToGhostHtml(draft.body);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GHOST_REQUEST_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    Authorization: `Ghost ${jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    posts: [
                        {
                            title: draft.title,
                            slug: local.slug,
                            html,
                            status: 'published',
                            published_at: local.published_at,
                            tags: ['subcorp', draft.content_type, draft.author_agent],
                        },
                    ],
                }),
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ghost API ${response.status}: ${text.slice(0, 500)}`);
        }

        const payload = (await response.json()) as {
            posts?: Array<{ id?: string; url?: string }>;
        };
        const post = payload.posts?.[0];

        return {
            status: 'published',
            attempts: attempt,
            last_attempt_at: lastAttemptAt,
            next_retry_at: null,
            error: null,
            post_id: post?.id,
            post_url: post?.url,
            published_at: new Date().toISOString(),
        };
    } catch (err) {
        const isTimeout = (err as Error).name === 'AbortError';
        const message = isTimeout
            ? `Ghost API request timed out after ${GHOST_REQUEST_TIMEOUT_MS}ms`
            : (err as Error).message;
        return {
            status: 'failed',
            attempts: attempt,
            last_attempt_at: lastAttemptAt,
            next_retry_at: computeNextRetryIso(attempt),
            error: message,
            post_id: previousGhost?.post_id,
            post_url: previousGhost?.post_url,
            published_at: previousGhost?.published_at,
        };
    }
}

async function updateDraftMetadata(
    draftId: string,
    metadata: Record<string, unknown>,
): Promise<void> {
    await sql`
        UPDATE ops_content_drafts
        SET metadata = ${jsonb(metadata)}::jsonb,
            updated_at = NOW()
        WHERE id = ${draftId}
    `;
}

async function mirrorPublishedDraft(draft: ContentDraftRow): Promise<boolean> {
    const publication = getPublicationState(draft.metadata);
    const local = publication.local ?? (await publishLocally(draft));

    if (!publication.local) {
        const metadataWithLocal = mergePublicationState(draft.metadata, {
            local,
            ghost: publication.ghost,
        });
        await updateDraftMetadata(draft.id, metadataWithLocal);
        draft.metadata = metadataWithLocal;
    }

    if (publication.ghost?.status === 'published') {
        return true;
    }

    const nextGhost = await mirrorToGhost(draft, local, publication.ghost);
    const mergedMetadata = mergePublicationState(draft.metadata, {
        local,
        ghost: nextGhost,
    });
    await updateDraftMetadata(draft.id, mergedMetadata);

    if (nextGhost.status === 'published') {
        await emitEvent({
            agent_id: draft.author_agent,
            kind: 'content_mirrored_ghost',
            title: `Ghost mirror published: ${draft.title}`,
            summary: nextGhost.post_url ?? 'Ghost mirror completed',
            tags: ['content', 'ghost', 'published', draft.content_type],
            metadata: {
                draftId: draft.id,
                postId: nextGhost.post_id,
                postUrl: nextGhost.post_url,
            },
        });
        return true;
    }

    if (nextGhost.status === 'failed') {
        log.warn('Ghost mirror failed', {
            draftId: draft.id,
            attempt: nextGhost.attempts,
            error: nextGhost.error,
            nextRetryAt: nextGhost.next_retry_at,
        });
    }

    return false;
}

export async function publishApprovedDrafts(
    limit = MAX_BACKFILL_BATCH,
): Promise<PublishApprovedResult> {
    const drafts = await sql<ContentDraftRow[]>`
        SELECT id, author_agent, content_type, title, body, status, metadata, published_at, created_at
        FROM ops_content_drafts
        WHERE status = 'approved'
        ORDER BY created_at ASC
        LIMIT ${Math.max(1, Math.min(limit, MAX_BACKFILL_BATCH))}
    `;

    let published = 0;
    let failed = 0;

    for (const draft of drafts) {
        // ── Step 1: Publish locally ──
        let local: LocalPublicationState;
        try {
            const publication = getPublicationState(draft.metadata);
            local = await publishLocally(draft, publication.local);
        } catch (err) {
            failed++;
            const reason = err instanceof Error ? err.message : String(err);
            log.error('publishLocally failed', {
                draftId: draft.id,
                title: draft.title,
                error: reason,
            });
            // Record failure in metadata without changing status
            await sql`
                UPDATE ops_content_drafts
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{publication_error}',
                    ${jsonb({ step: 'publishLocally', error: reason, at: new Date().toISOString() })}::jsonb
                ),
                updated_at = NOW()
                WHERE id = ${draft.id}
            `;
            continue;
        }

        // ── Step 2: Update draft status to published ──
        try {
            const metadataWithLocal = mergePublicationState(draft.metadata, {
                local,
                ghost: getPublicationState(draft.metadata).ghost,
            });

            const result = await sql<{ id: string }[]>`
                UPDATE ops_content_drafts
                SET status = 'published',
                    published_at = ${local.published_at},
                    metadata = ${jsonb(metadataWithLocal)}::jsonb,
                    updated_at = NOW()
                WHERE id = ${draft.id}
                  AND status = 'approved'
                RETURNING id
            `;

            if (result.length === 0) {
                continue;
            }

            await emitEvent({
                agent_id: draft.author_agent,
                kind: 'content_published',
                title: `Published: ${draft.title}`,
                summary: `${draft.content_type} published by ${draft.author_agent}`,
                tags: ['content', 'published', draft.content_type],
                metadata: {
                    draftId: draft.id,
                    localPath: local.relative_path,
                    localSlug: local.slug,
                },
            });

            published++;
            draft.status = 'published';
            draft.published_at = local.published_at;
            draft.metadata = metadataWithLocal;
        } catch (err) {
            failed++;
            const reason = err instanceof Error ? err.message : String(err);
            log.error('Draft status update failed after local publish', {
                draftId: draft.id,
                title: draft.title,
                localSlug: local.slug,
                error: reason,
            });
            continue;
        }

        // ── Step 3: Mirror to Ghost (non-fatal) ──
        try {
            await mirrorPublishedDraft(draft);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            log.warn('Ghost mirror threw unexpectedly', {
                draftId: draft.id,
                title: draft.title,
                error: reason,
            });
        }
    }

    return { published, failed };
}

export async function retryGhostMirrorForDraft(draftId: string): Promise<{
    ok: boolean;
    mirrored: boolean;
    message: string;
}> {
    const [draft] = await sql<ContentDraftRow[]>`
        SELECT id, author_agent, content_type, title, body, status, metadata, published_at, created_at
        FROM ops_content_drafts
        WHERE id = ${draftId}
        LIMIT 1
    `;

    if (!draft) {
        return { ok: false, mirrored: false, message: 'Draft not found' };
    }

    if (draft.status !== 'published') {
        return {
            ok: false,
            mirrored: false,
            message: `Draft must be published before ghost mirror retry (current status: ${draft.status})`,
        };
    }

    const mirrored = await mirrorPublishedDraft(draft);
    return {
        ok: true,
        mirrored,
        message:
            mirrored ?
                'Ghost mirror published'
            :   'Ghost mirror retry scheduled',
    };
}

export async function mirrorPublishedDraftBackfill(
    limit = MAX_BACKFILL_BATCH,
): Promise<GhostBackfillResult> {
    if (!getGhostConfig()) {
        return {
            processed: 0,
            mirrored: 0,
            failed: 0,
            skipped: true,
        };
    }

    const rows = await sql<{ id: string }[]>`
        SELECT id
        FROM ops_content_drafts
        WHERE status = 'published'
          AND COALESCE(metadata->'publication'->'ghost'->>'status', 'pending') <> 'published'
          AND (
            metadata->'publication'->'ghost'->>'next_retry_at' IS NULL
            OR (metadata->'publication'->'ghost'->>'next_retry_at')::timestamptz <= NOW()
          )
        ORDER BY COALESCE(published_at, created_at) ASC
        LIMIT ${Math.max(1, Math.min(limit, MAX_BACKFILL_BATCH))}
    `;

    let mirrored = 0;
    let failed = 0;

    for (const row of rows) {
        const result = await retryGhostMirrorForDraft(row.id);
        if (!result.ok) {
            failed++;
            continue;
        }

        if (result.mirrored) mirrored++;
        else failed++;
    }

    return {
        processed: rows.length,
        mirrored,
        failed,
        skipped: false,
    };
}
