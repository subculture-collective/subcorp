# Artifact Gallery Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Recommended path:
> dispatch a fresh subagent per task, review each result with `review-quality`,
> then continue. For complex multi-agent splits, use
> `parallel-feature-development`, `team-composition-patterns`, and
> `team-communication-protocols`. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Add a unified Stage gallery for browsing agent-created artifacts, including DB content drafts and workspace output files such as tweet/thread drafts.

**Architecture:** Add a read-only `/api/ops/artifacts` endpoint that normalizes `ops_content_drafts` rows and `/workspace/output` files into one `ArtifactItem` shape. Add a client `ArtifactGallery` view with type/source filters, full-text-ish client filtering over returned previews, preview drawer, and copy actions. Wire it into Stage navigation as an Output view; keep publishing/review mutations in the existing Content Pipeline.

**Tech Stack:** Next.js App Router route handlers, React client components, existing `execInToolbox` workspace access, existing Postgres `sql`, Tailwind utility classes, existing `MarkdownContent` renderer.

---

## File Structure

- Create: `src/app/api/ops/artifacts/route.ts`
  - Read DB content drafts and workspace output files.
  - Normalize both into a single JSON response.
  - Support `q`, `type`, `source`, `limit` query params.
- Create: `src/app/stage/ArtifactGallery.tsx`
  - Client UI for browse/search/filter/preview/copy.
  - Uses local fetch hook inside the component to avoid expanding the already-large `hooks.ts` unless needed.
- Modify: `src/app/stage/StageHeader.tsx`
  - Add `'artifacts'` to `ViewMode` union.
- Modify: `src/app/stage/StageSidebar.tsx`
  - Add `Artifacts` nav item to Output group.
- Modify: `src/app/stage/page.tsx`
  - Add `artifacts` to valid views, import/render `ArtifactGallery`.

---

## Contract

`GET /api/ops/artifacts?q=&type=&source=&limit=` returns:

```ts
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
```

V1 is read-only. Copy content/path happens client-side from preview text/path. Review/publish actions stay in `ContentPipeline`.

---

### Task 1: Artifact API

**Files:**
- Create: `src/app/api/ops/artifacts/route.ts`

- [ ] **Step 1: Create route with normalizers**

```ts
// /api/ops/artifacts — Unified read-only artifact gallery data
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { sql } from '@/lib/db';
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

const WORKSPACE_ROOT = '/workspace';
const OUTPUT_ROOT = '/workspace/output';
const MAX_FILE_PREVIEW_BYTES = 24 * 1024;
const MAX_WORKSPACE_FILES = 200;

function clampLimit(raw: string | null): number {
    const parsed = parseInt(raw ?? '80', 10);
    if (Number.isNaN(parsed)) return 80;
    return Math.max(1, Math.min(parsed, 200));
}

function shellEscape(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
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
    if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'document';
    return 'artifact';
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
```

- [ ] **Step 2: Add DB draft loader**

```ts
async function loadContentArtifacts(limit: number): Promise<ArtifactItem[]> {
    const rows = await sql<Array<{
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
    }>>`
        SELECT id, author_agent, content_type, title, body, status,
               source_session_id, published_at, metadata, created_at, updated_at
        FROM ops_content_drafts
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;

    return rows.map(row => ({
        id: `content:${row.id}`,
        source: 'content',
        type: row.content_type,
        title: row.title || 'Untitled draft',
        body_preview: normalizeText(row.body).slice(0, MAX_FILE_PREVIEW_BYTES),
        path: null,
        agent_id: row.author_agent,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        size_bytes: normalizeText(row.body).length,
        metadata: {
            ...(row.metadata ?? {}),
            source_session_id: row.source_session_id,
            published_at: row.published_at,
        },
    }));
}
```

- [ ] **Step 3: Add workspace output loader**

```ts
interface WorkspaceFileRow {
    relativePath: string;
    size: number;
    modifiedEpoch: number;
}

async function listWorkspaceOutputFiles(): Promise<WorkspaceFileRow[]> {
    const command =
        `if [ ! -d ${shellEscape(OUTPUT_ROOT)} ]; then exit 0; fi; ` +
        `find ${shellEscape(OUTPUT_ROOT)} -type f ` +
        `\\( -name '*.md' -o -name '*.txt' -o -name '*.json' \\) ` +
        `-printf '%T@\\t%s\\t%p\\n' 2>/dev/null | sort -nr | head -n ${MAX_WORKSPACE_FILES}`;
    const result = await execInToolbox(command, 10_000);
    if (result.exitCode !== 0 || !result.stdout.trim()) return [];

    return result.stdout.trim().split('\n').flatMap(line => {
        const [modifiedRaw, sizeRaw, absolutePath] = line.split('\t');
        if (!absolutePath?.startsWith(`${WORKSPACE_ROOT}/`)) return [];
        return [{
            relativePath: absolutePath.replace(`${WORKSPACE_ROOT}/`, ''),
            size: parseInt(sizeRaw, 10) || 0,
            modifiedEpoch: Math.floor(parseFloat(modifiedRaw) || 0),
        }];
    });
}

async function readWorkspacePreview(relativePath: string): Promise<string> {
    const absolute = path.join(WORKSPACE_ROOT, relativePath);
    if (!absolute.startsWith(`${OUTPUT_ROOT}/`)) return '';
    const result = await execInToolbox(
        `head -c ${MAX_FILE_PREVIEW_BYTES} ${shellEscape(absolute)}`,
        5_000,
    );
    return result.exitCode === 0 ? result.stdout : '';
}

async function loadWorkspaceArtifacts(limit: number): Promise<ArtifactItem[]> {
    const files = (await listWorkspaceOutputFiles()).slice(0, limit);
    const items = await Promise.all(files.map(async file => {
        const body = await readWorkspacePreview(file.relativePath);
        const modified = new Date(file.modifiedEpoch * 1000).toISOString();
        return {
            id: `workspace:${file.relativePath}`,
            source: 'workspace' as const,
            type: inferTypeFromPath(file.relativePath),
            title: inferTitleFromPath(file.relativePath),
            body_preview: body,
            path: `/${file.relativePath}`,
            agent_id: null,
            status: null,
            created_at: modified,
            updated_at: modified,
            size_bytes: file.size,
            metadata: {},
        };
    }));
    return items;
}
```

- [ ] **Step 4: Add GET handler**

```ts
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const limit = clampLimit(searchParams.get('limit'));
    const q = searchParams.get('q')?.trim() ?? '';
    const type = searchParams.get('type')?.trim() ?? '';
    const source = searchParams.get('source')?.trim() ?? '';

    try {
        const [content, workspace] = await Promise.all([
            loadContentArtifacts(limit),
            loadWorkspaceArtifacts(limit),
        ]);

        const artifacts = [...content, ...workspace]
            .filter(item => !source || item.source === source)
            .filter(item => !type || item.type === type)
            .filter(item => matchesQuery(item, q))
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, limit);

        return NextResponse.json({ artifacts });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 5: Verify route compiles**

Run: `npm run lint -- src/app/api/ops/artifacts/route.ts`

Expected: lint command accepts file or reports only pre-existing config limitations. If project lint cannot accept a file, run `npm run lint` in validation.

---

### Task 2: Artifact Gallery UI

**Files:**
- Create: `src/app/stage/ArtifactGallery.tsx`

- [ ] **Step 1: Create component types, fetch hook, helpers**

```tsx
// ArtifactGallery — unified browser for agent-created outputs
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarkdownContent } from '@/components/MarkdownContent';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';

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

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function formatBytes(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useArtifacts(filters: { q: string; type: string; source: string }) {
    const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchArtifacts = useCallback(async () => {
        const params = new URLSearchParams();
        params.set('limit', '120');
        if (filters.q.trim()) params.set('q', filters.q.trim());
        if (filters.type) params.set('type', filters.type);
        if (filters.source) params.set('source', filters.source);

        try {
            setLoading(true);
            const res = await fetch(`/api/ops/artifacts?${params}`);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const data = await res.json() as { artifacts: ArtifactItem[] };
            setArtifacts(data.artifacts);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [filters.q, filters.type, filters.source]);

    useEffect(() => {
        fetchArtifacts();
    }, [fetchArtifacts, refreshKey]);

    return {
        artifacts,
        loading,
        error,
        refetch: () => setRefreshKey(k => k + 1),
    };
}
```

- [ ] **Step 2: Add card/detail components and main gallery**

```tsx
function ArtifactCard({ artifact, selected, onSelect }: {
    artifact: ArtifactItem;
    selected: boolean;
    onSelect: (artifact: ArtifactItem) => void;
}) {
    const agent = artifact.agent_id ? AGENTS[artifact.agent_id as AgentId] : null;
    return (
        <button
            onClick={() => onSelect(artifact)}
            className={`w-full text-left rounded-xl border p-3 transition-colors space-y-2 ${
                selected
                    ? 'bg-zinc-800 border-scan/60'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
            }`}
        >
            <div className='flex items-start justify-between gap-3'>
                <h3 className='text-sm font-semibold text-zinc-100 line-clamp-2'>{artifact.title}</h3>
                <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase shrink-0'>
                    {artifact.source}
                </span>
            </div>
            <p className='text-xs text-zinc-500 line-clamp-2 whitespace-pre-wrap'>
                {artifact.body_preview || artifact.path || '(empty)'}
            </p>
            <div className='flex flex-wrap items-center gap-2 text-[10px] text-zinc-500'>
                <span className='px-1.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300'>{artifact.type}</span>
                {artifact.status && <span>{artifact.status}</span>}
                {agent && (
                    <span className={agent.tailwindTextColor}>{agent.displayName}</span>
                )}
                <span>{formatBytes(artifact.size_bytes)}</span>
                <span>{timeAgo(artifact.updated_at)}</span>
            </div>
        </button>
    );
}

function ArtifactDetail({ artifact }: { artifact: ArtifactItem | null }) {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = useCallback(async (label: string, value: string | null) => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setCopied(label);
        setTimeout(() => setCopied(null), 1600);
    }, []);

    if (!artifact) {
        return (
            <div className='rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 text-sm text-zinc-500'>
                Select an artifact to preview it.
            </div>
        );
    }

    return (
        <div className='rounded-xl bg-zinc-900/70 border border-zinc-800 p-5 space-y-4 sticky top-4'>
            <div className='space-y-2'>
                <div className='flex items-start justify-between gap-3'>
                    <h2 className='text-base font-semibold text-zinc-100'>{artifact.title}</h2>
                    <span className='text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 uppercase'>
                        {artifact.source}
                    </span>
                </div>
                <div className='flex flex-wrap gap-2 text-[11px] text-zinc-500'>
                    <span>{artifact.type}</span>
                    {artifact.status && <span>· {artifact.status}</span>}
                    {artifact.path && <span className='truncate'>· {artifact.path}</span>}
                </div>
            </div>

            <div className='flex flex-wrap gap-2'>
                <button onClick={() => copy('content', artifact.body_preview)} className='px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200'>
                    {copied === 'content' ? 'Copied content' : 'Copy content'}
                </button>
                {artifact.path && (
                    <button onClick={() => copy('path', artifact.path)} className='px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200'>
                        {copied === 'path' ? 'Copied path' : 'Copy path'}
                    </button>
                )}
            </div>

            <div className='rounded-lg bg-black/30 border border-zinc-800 p-4 max-h-[60vh] overflow-y-auto'>
                <MarkdownContent>{artifact.body_preview || '(empty)'}</MarkdownContent>
            </div>
        </div>
    );
}

export function ArtifactGallery() {
    const [q, setQ] = useState('');
    const [type, setType] = useState('');
    const [source, setSource] = useState('');
    const { artifacts, loading, error, refetch } = useArtifacts({ q, type, source });
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const types = useMemo(() => Array.from(new Set(artifacts.map(a => a.type))).sort(), [artifacts]);
    const selected = artifacts.find(a => a.id === selectedId) ?? artifacts[0] ?? null;

    useEffect(() => {
        if (selected && !selectedId) setSelectedId(selected.id);
    }, [selected, selectedId]);

    return (
        <section className='space-y-4'>
            <div className='flex items-center justify-between gap-3'>
                <div>
                    <h2 className='text-lg font-semibold text-zinc-100'>Artifact Gallery</h2>
                    <p className='text-xs text-zinc-500'>Browse DB drafts and workspace outputs from the agents.</p>
                </div>
                <button onClick={refetch} className='px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200'>Refresh</button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2'>
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder='Search title, body, type, path, agent…'
                    className='rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600'
                />
                <select value={source} onChange={e => setSource(e.target.value)} className='rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100'>
                    <option value=''>All sources</option>
                    <option value='content'>Content drafts</option>
                    <option value='workspace'>Workspace files</option>
                </select>
                <select value={type} onChange={e => setType(e.target.value)} className='rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100'>
                    <option value=''>All types</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {error && <div className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300'>{error}</div>}

            <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] gap-4'>
                <div className='space-y-2'>
                    {loading && <div className='text-sm text-zinc-500 py-8 text-center'>Loading artifacts…</div>}
                    {!loading && artifacts.length === 0 && <div className='text-sm text-zinc-500 py-8 text-center'>No artifacts found.</div>}
                    {!loading && artifacts.map(artifact => (
                        <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            selected={selected?.id === artifact.id}
                            onSelect={a => setSelectedId(a.id)}
                        />
                    ))}
                </div>
                <ArtifactDetail artifact={selected} />
            </div>
        </section>
    );
}
```

- [ ] **Step 3: Verify component compiles**

Run: `npm run lint -- src/app/stage/ArtifactGallery.tsx`

Expected: no new lint issues.

---

### Task 3: Stage Navigation Wiring

**Files:**
- Modify: `src/app/stage/StageHeader.tsx`
- Modify: `src/app/stage/StageSidebar.tsx`
- Modify: `src/app/stage/page.tsx`

- [ ] **Step 1: Extend view type**

In `src/app/stage/StageHeader.tsx`, add `| 'artifacts'` after `| 'content'`.

- [ ] **Step 2: Add sidebar nav**

In `src/app/stage/StageSidebar.tsx`, add `{ key: 'artifacts', label: 'Artifacts', icon: <ArchiveIcon size={16} /> },` in the Output group before `Content`.

- [ ] **Step 3: Render view**

In `src/app/stage/page.tsx`:

```ts
import { ArtifactGallery } from './ArtifactGallery';
```

Add `'artifacts'` to `VALID_VIEWS` near `'content'`.

Add render block before Content view:

```tsx
{view === 'artifacts' && (
    <SectionErrorBoundary label='Artifact Gallery'>
        <ArtifactGallery />
    </SectionErrorBoundary>
)}
```

- [ ] **Step 4: Validate route manually**

Start dev server if needed: `npm run dev`

Open: `/stage?view=artifacts`

Expected: Artifact Gallery view loads from sidebar/URL, search box appears, empty/error state is graceful if DB/toolbox unavailable.

---

### Task 4: Validation

**Files:**
- All modified files above

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: PASS or only pre-existing issues unrelated to artifact gallery.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS. If build fails due live DB/toolbox env unavailable during static analysis, confirm route is dynamic and document env failure.

- [ ] **Step 3: Smoke API**

With app running, request: `/api/ops/artifacts?limit=5`

Expected response shape:

```json
{
  "artifacts": []
}
```

or populated `ArtifactItem[]`. Errors should be JSON with `error` string.

---

## Self-Review

- Spec coverage: artifact gallery chosen; includes DB + files; supports browse, preview, copy, and search/filter.
- No publish/review mutations in v1; existing Content Pipeline remains responsible for workflow actions.
- Placeholder scan: no `TBD`/generic implementation placeholders remain.
- Type consistency: route and UI use the same `ArtifactItem` contract.
