// ArtifactGallery — unified browser for agent-created outputs
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarkdownContent } from '@/components/MarkdownContent';
import { AGENTS } from '@/lib/agents';
import { useAuth } from '@/lib/auth/client';
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

const ARTIFACT_TYPES = [
    'blog',
    'briefing',
    'digest',
    'document',
    'report',
    'review',
    'thread',
    'artifact',
];

function timeAgo(dateStr: string): string {
    const timestamp = new Date(dateStr).getTime();
    if (Number.isNaN(timestamp)) return 'unknown';

    const diff = Date.now() - timestamp;
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

function isFiltered(filters: { q: string; type: string; source: string }) {
    return Boolean(filters.q.trim() || filters.type || filters.source);
}

function useDebouncedValue(value: string, delayMs: number): string {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}

function useArtifacts(
    filters: { q: string; type: string; source: string },
    enabled: boolean,
) {
    const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    const fetchArtifacts = useCallback(async (signal?: AbortSignal) => {
        const requestId = ++requestIdRef.current;
        if (!enabled) {
            setArtifacts([]);
            setError(null);
            setLoading(false);
            return;
        }

        const params = new URLSearchParams();
        params.set('limit', '120');
        if (filters.q.trim()) params.set('q', filters.q.trim());
        if (filters.type) params.set('type', filters.type);
        if (filters.source) params.set('source', filters.source);

        try {
            setLoading(true);
            const res = await fetch(`/api/ops/artifacts?${params}`, { signal });
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

            const data = (await res.json()) as { artifacts: ArtifactItem[] };
            if (requestId !== requestIdRef.current) return;

            setArtifacts(data.artifacts);
            setError(null);
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            if (requestId !== requestIdRef.current) return;
            setError((err as Error).message);
        } finally {
            if (!signal?.aborted && requestId === requestIdRef.current) setLoading(false);
        }
    }, [enabled, filters.q, filters.type, filters.source]);

    useEffect(() => {
        const controller = new AbortController();
        fetchArtifacts(controller.signal);
        return () => controller.abort();
    }, [fetchArtifacts]);

    const refetch = useCallback(() => fetchArtifacts(), [fetchArtifacts]);

    return { artifacts, loading, error, refetch };
}

function ArtifactCard({
    artifact,
    selected,
    onSelect,
}: {
    artifact: ArtifactItem;
    selected: boolean;
    onSelect: (artifact: ArtifactItem) => void;
}) {
    const agent = artifact.agent_id ? AGENTS[artifact.agent_id as AgentId] : null;

    return (
        <button
            type='button'
            onClick={() => onSelect(artifact)}
            aria-pressed={selected}
            className={`w-full text-left rounded-xl border p-3 transition-all duration-150 space-y-3 outline-none ${
                selected
                    ? 'bg-zinc-800/90 border-scan/70 shadow-[0_0_0_1px_rgba(34,197,94,0.16),0_12px_24px_rgba(0,0,0,0.24)]'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
            }`}
        >
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0 space-y-1'>
                    <h3 className='text-sm font-semibold text-zinc-100 line-clamp-2'>
                        {artifact.title}
                    </h3>
                    <div className='flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500'>
                        <span className='rounded-full bg-zinc-800/80 px-1.5 py-0.5 text-zinc-300 uppercase'>
                            {artifact.source}
                        </span>
                        {artifact.status && <span>{artifact.status}</span>}
                    </div>
                </div>
                <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase shrink-0'>
                    {artifact.type}
                </span>
            </div>

            <p className='text-xs text-zinc-400 line-clamp-3 whitespace-pre-wrap leading-5'>
                {artifact.body_preview || artifact.path || '(empty)'}
            </p>

            <div className='grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-zinc-500 sm:grid-cols-4'>
                <span className='truncate'>{agent ? agent.displayName : '—'}</span>
                <span className='truncate'>{formatBytes(artifact.size_bytes)}</span>
                <span className='truncate'>{timeAgo(artifact.updated_at)}</span>
                <span className='truncate'>{artifact.path || 'no path'}</span>
            </div>
        </button>
    );
}

function ArtifactDetail({ artifact }: { artifact: ArtifactItem | null }) {
    const [copied, setCopied] = useState<string | null>(null);
    const [copyError, setCopyError] = useState(false);
    const copyTimerRef = useRef<number | null>(null);

    const copy = useCallback(async (label: string, value: string | null) => {
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            setCopied(label);
            setCopyError(false);
        } catch {
            setCopyError(true);
        }

        if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = window.setTimeout(() => {
            setCopied(null);
            setCopyError(false);
        }, 1600);
    }, []);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
        };
    }, []);

    if (!artifact) {
        return (
            <div className='rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 text-sm text-zinc-500 lg:sticky lg:top-4'>
                <div className='space-y-2'>
                    <p className='text-zinc-300'>No artifact selected.</p>
                    <p>Select one to inspect the preview, metadata, and copy actions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className='rounded-xl bg-zinc-900/70 border border-zinc-800 p-5 space-y-4 lg:sticky lg:top-4'>
            <div className='space-y-2'>
                <div className='flex items-start justify-between gap-3'>
                    <h2 className='text-base font-semibold text-zinc-100'>{artifact.title}</h2>
                    <span className='text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 uppercase'>
                        {artifact.source}
                    </span>
                </div>
                <div className='flex flex-wrap gap-2 text-[11px] text-zinc-500'>
                    <span className='rounded-full bg-zinc-800/70 px-2 py-0.5 text-zinc-300'>{artifact.type}</span>
                    {artifact.status && <span className='rounded-full bg-zinc-800/70 px-2 py-0.5 text-zinc-300'>{artifact.status}</span>}
                    {artifact.path && <span className='truncate rounded-full bg-zinc-800/70 px-2 py-0.5 text-zinc-300'>path: {artifact.path}</span>}
                </div>
            </div>

            <div className='flex flex-wrap gap-2'>
                <button
                    type='button'
                    onClick={() => copy('content', artifact.body_preview)}
                    className='px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors'
                >
                    {copied === 'content' ? 'Copied content' : 'Copy content'}
                </button>
                {artifact.path && (
                    <button
                        type='button'
                        onClick={() => copy('path', artifact.path)}
                        className='px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors'
                    >
                        {copied === 'path' ? 'Copied path' : 'Copy path'}
                    </button>
                )}
                {copyError && <span className='self-center text-xs text-rose-300'>Copy failed</span>}
            </div>

            <div className='rounded-lg bg-black/30 border border-zinc-800 p-4 max-h-[60vh] overflow-y-auto'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                    <span className='text-[11px] uppercase tracking-wider text-zinc-500'>Preview</span>
                    <span className='text-[11px] text-zinc-600'>Updated {timeAgo(artifact.updated_at)}</span>
                </div>
                <MarkdownContent>{artifact.body_preview || '(empty)'}</MarkdownContent>
            </div>
        </div>
    );
}

export function ArtifactGallery() {
    const { user, loading: authLoading, requireAuth } = useAuth();
    const [q, setQ] = useState('');
    const [type, setType] = useState('');
    const [source, setSource] = useState('');
    const debouncedQ = useDebouncedValue(q, 250);
    const { artifacts, loading, error, refetch } = useArtifacts(
        { q: debouncedQ, type, source },
        Boolean(user),
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const types = useMemo(
        () => Array.from(new Set([...ARTIFACT_TYPES, ...artifacts.map(a => a.type)])).sort(),
        [artifacts],
    );
    const selected = useMemo(
        () => artifacts.find(a => a.id === selectedId) ?? artifacts[0] ?? null,
        [artifacts, selectedId],
    );
    const filtered = isFiltered({ q, type, source });

    const clearFilters = useCallback(() => {
        setQ('');
        setType('');
        setSource('');
    }, []);

    const showSkeleton = loading && artifacts.length === 0;
    const showEmpty = !loading && !error && artifacts.length === 0;

    const handleSignIn = useCallback(async () => {
        try {
            await requireAuth('Sign in to browse private agent artifacts');
            refetch();
        } catch {
            // User cancelled auth modal.
        }
    }, [requireAuth, refetch]);

    if (authLoading) {
        return (
            <section className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-500'>
                Checking session…
            </section>
        );
    }

    if (!user) {
        return (
            <section className='rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3'>
                <div>
                    <h2 className='text-lg font-semibold text-zinc-100'>Artifact Gallery</h2>
                    <p className='text-sm text-zinc-500'>Sign in to browse private DB drafts and workspace outputs.</p>
                </div>
                <button
                    type='button'
                    onClick={handleSignIn}
                    className='px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-medium text-zinc-900 hover:bg-white transition-colors'
                >
                    Sign in
                </button>
            </section>
        );
    }

    return (
        <section className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                    <div className='flex items-center gap-2'>
                        <h2 className='text-lg font-semibold text-zinc-100'>Artifact Gallery</h2>
                        <span className='rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-0.5 text-[11px] text-zinc-400'>
                            {artifacts.length}
                        </span>
                    </div>
                    <p className='text-xs text-zinc-500'>Browse DB drafts and workspace outputs from the agents.</p>
                </div>
                <div className='flex items-center gap-2'>
                    {filtered && (
                        <button
                            type='button'
                            onClick={clearFilters}
                            className='px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 transition-colors'
                        >
                            Clear filters
                        </button>
                    )}
                    <button
                        type='button'
                        onClick={refetch}
                        className='px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors'
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className='grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]'>
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder='Search title, body, type, path, agent…'
                    className='rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600'
                />
                <select
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className='rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100'
                >
                    <option value=''>All sources</option>
                    <option value='content'>Content drafts</option>
                    <option value='workspace'>Workspace files</option>
                </select>
                <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className='rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100'
                >
                    <option value=''>All types</option>
                    {types.map(t => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className='flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300'>
                    <span>{error}</span>
                    <button type='button' onClick={refetch} className='shrink-0 text-xs text-rose-200 hover:text-white'>
                        Try again
                    </button>
                </div>
            )}

            <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] gap-4'>
                <div className='space-y-2'>
                    {showSkeleton &&
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className='animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='h-4 w-2/3 rounded bg-zinc-800' />
                                    <div className='h-4 w-14 rounded-full bg-zinc-800' />
                                </div>
                                <div className='h-3 w-full rounded bg-zinc-800' />
                                <div className='h-3 w-5/6 rounded bg-zinc-800' />
                                <div className='grid grid-cols-4 gap-2'>
                                    <div className='h-3 rounded bg-zinc-800' />
                                    <div className='h-3 rounded bg-zinc-800' />
                                    <div className='h-3 rounded bg-zinc-800' />
                                    <div className='h-3 rounded bg-zinc-800' />
                                </div>
                            </div>
                        ))}

                    {showEmpty && (
                        <div className='rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center space-y-2'>
                            <p className='text-sm text-zinc-200'>No artifacts found.</p>
                            <p className='text-xs text-zinc-500'>
                                {filtered ? 'Try fewer filters or a broader search.' : 'Artifacts will appear here once the agents create them.'}
                            </p>
                            {filtered && (
                                <button
                                    type='button'
                                    onClick={clearFilters}
                                    className='mt-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors'
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}

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
