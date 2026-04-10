// ContentPipeline — Kanban board for content drafts
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    useContent,
    type ContentDraft,
    type ContentStatus,
    type ContentType,
    type MutableContentStatus,
} from './hooks';
import { useAuth } from '@/lib/auth/client';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';
import { MarkdownContent } from '@/components/MarkdownContent';

// ─── Constants ───

const STATUS_COLUMNS: { key: ContentStatus; label: string; icon: string }[] = [
    { key: 'draft', label: 'Draft', icon: '✏️' },
    { key: 'review', label: 'In Review', icon: '🔍' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'published', label: 'Published', icon: '📢' },
];

const TYPE_BADGES: Record<ContentType, { label: string; color: string }> = {
    essay: { label: 'Essay', color: 'bg-blue-500/20 text-blue-300' },
    thread: { label: 'Thread', color: 'bg-amber-500/20 text-amber-300' },
    statement: { label: 'Statement', color: 'bg-emerald-500/20 text-emerald-300' },
    poem: { label: 'Poem', color: 'bg-purple-500/20 text-purple-300' },
    manifesto: { label: 'Manifesto', color: 'bg-rose-500/20 text-rose-300' },
};

// ─── Helpers ───

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// ─── DraftCard ───

function DraftCard({
    draft,
    onSelect,
}: {
    draft: ContentDraft;
    onSelect: (d: ContentDraft) => void;
}) {
    const agent = AGENTS[draft.author_agent as AgentId];
    const badge = TYPE_BADGES[draft.content_type] ?? TYPE_BADGES.essay;

    return (
        <button
            onClick={() => onSelect(draft)}
            className='w-full text-left rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 hover:border-zinc-600 transition-colors space-y-2'
        >
            {/* Title */}
            <p className='text-sm font-medium text-zinc-100 line-clamp-2 leading-snug'>
                {draft.title || 'Untitled'}
            </p>

            {/* Meta row */}
            <div className='flex items-center gap-2 flex-wrap'>
                {/* Agent dot + name */}
                <span className='flex items-center gap-1'>
                    <span
                        className='inline-block h-2 w-2 rounded-full'
                        style={{ backgroundColor: agent?.color ?? '#71717a' }}
                    />
                    <span className={`text-[11px] font-medium ${agent?.tailwindTextColor ?? 'text-zinc-400'}`}>
                        {agent?.displayName ?? draft.author_agent}
                    </span>
                </span>

                {/* Type badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                    {badge.label}
                </span>
            </div>

            {/* Timestamp */}
            <p className='text-[10px] text-zinc-500'>{timeAgo(draft.created_at)}</p>
        </button>
    );
}

// ─── DetailPanel ───

/** Valid next statuses for each draft status */
const NEXT_ACTIONS: Record<ContentStatus, { status: MutableContentStatus; label: string; style: string }[]> = {
    draft: [],
    review: [
        { status: 'approved', label: 'Approve', style: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
        { status: 'rejected', label: 'Reject', style: 'bg-rose-600 hover:bg-rose-500 text-white' },
    ],
    approved: [
        { status: 'rejected', label: 'Send Back', style: 'bg-rose-700 hover:bg-rose-600 text-white' },
    ],
    rejected: [
        { status: 'draft', label: 'Re-draft', style: 'bg-zinc-600 hover:bg-zinc-500 text-white' },
    ],
    published: [],
};

function DetailPanel({
    draft,
    onClose,
    onAction,
    onRetryGhostMirror,
}: {
    draft: ContentDraft;
    onClose: () => void;
    onAction: (id: string, status: MutableContentStatus) => Promise<void>;
    onRetryGhostMirror: (id: string) => Promise<void>;
}) {
    const { user, requireAuth } = useAuth();
    const [acting, setActing] = useState(false);
    const [actionError, setActionError] = useState('');
    const agent = AGENTS[draft.author_agent as AgentId];
    const badge = TYPE_BADGES[draft.content_type] ?? TYPE_BADGES.essay;
    const actions = NEXT_ACTIONS[draft.status] ?? [];
    const ghostMirror = draft.metadata?.publication?.ghost;
    const localPublication = draft.metadata?.publication?.local;

    const ghostBadge =
        ghostMirror?.status === 'published' ?
            {
                label: 'Ghost mirrored',
                style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            }
        : ghostMirror?.status === 'failed' ?
            {
                label: 'Ghost retry pending',
                style: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            }
        : {
            label: 'Ghost pending',
            style: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
        };

    const handleAction = useCallback(async (status: MutableContentStatus) => {
        setActionError('');
        try {
            if (!user) await requireAuth('Sign in to manage content');
            setActing(true);
            await onAction(draft.id, status);
        } catch (err) {
            setActionError((err as Error).message);
        } finally {
            setActing(false);
        }
    }, [user, requireAuth, onAction, draft.id]);

    const handleRetryGhost = useCallback(async () => {
        setActionError('');
        try {
            if (!user) await requireAuth('Sign in to manage content');
            setActing(true);
            await onRetryGhostMirror(draft.id);
        } catch (err) {
            setActionError((err as Error).message);
        } finally {
            setActing(false);
        }
    }, [user, requireAuth, onRetryGhostMirror, draft.id]);

    return (
        <div className='rounded-xl bg-zinc-800/70 border border-zinc-700/50 p-5 space-y-4'>
            {/* Header */}
            <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1 min-w-0'>
                    <h3 className='text-base font-semibold text-zinc-100 leading-snug'>
                        {draft.title || 'Untitled'}
                    </h3>
                    <div className='flex items-center gap-2'>
                        <span className='flex items-center gap-1'>
                            <span
                                className='inline-block h-2 w-2 rounded-full'
                                style={{ backgroundColor: agent?.color ?? '#71717a' }}
                            />
                            <span className={`text-xs font-medium ${agent?.tailwindTextColor ?? 'text-zinc-400'}`}>
                                {agent?.displayName ?? draft.author_agent}
                            </span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                        </span>
                        <span className='text-[10px] text-zinc-500'>{timeAgo(draft.created_at)}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className='text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none shrink-0'
                >
                    ✕
                </button>
            </div>

            {/* Body */}
            <div className='rounded-lg bg-zinc-900/50 border border-zinc-700/30 p-4 max-h-80 overflow-y-auto'>
                <div className='text-sm text-zinc-300'>
                    <MarkdownContent>{draft.body || '(empty)'}</MarkdownContent>
                </div>
            </div>

            {/* Reviewer notes */}
            {draft.reviewer_notes && draft.reviewer_notes.length > 0 && (
                <div className='space-y-2'>
                    <h4 className='text-[11px] uppercase tracking-wider text-zinc-500 font-medium'>
                        Review Notes
                    </h4>
                    <div className='space-y-2'>
                        {draft.reviewer_notes.map((note, i) => {
                            const reviewer = AGENTS[note.reviewer as AgentId];
                            return (
                                <div key={i} className='rounded-lg bg-zinc-900/40 border border-zinc-700/30 p-3'>
                                    <div className='flex items-center gap-1.5 mb-1'>
                                        <span
                                            className='inline-block h-1.5 w-1.5 rounded-full'
                                            style={{ backgroundColor: reviewer?.color ?? '#71717a' }}
                                        />
                                        <span className={`text-[11px] font-medium ${reviewer?.tailwindTextColor ?? 'text-zinc-400'}`}>
                                            {reviewer?.displayName ?? note.reviewer}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                            note.verdict === 'approve' ? 'bg-emerald-500/20 text-emerald-300'
                                            : note.verdict === 'reject' ? 'bg-rose-500/20 text-rose-300'
                                            : 'bg-zinc-500/20 text-zinc-300'
                                        }`}>
                                            {note.verdict}
                                        </span>
                                    </div>
                                    <div className='text-xs text-zinc-400'>
                                        <MarkdownContent>{note.notes}</MarkdownContent>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            {actions.length > 0 && (
                <div className='flex items-center gap-2 pt-1'>
                    {actions.map(action => (
                        <button
                            key={action.status}
                            onClick={() => handleAction(action.status)}
                            disabled={acting}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer ${action.style}`}
                        >
                            {acting ? '...' : action.label}
                        </button>
                    ))}
                    {actionError && (
                        <span className='text-xs text-rose-400'>{actionError}</span>
                    )}
                </div>
            )}

            {/* Review session link */}
            {draft.review_session_id && (
                <p className='text-[10px] text-zinc-600'>
                    Review session: <span className='text-zinc-500 font-mono'>{draft.review_session_id.slice(0, 8)}…</span>
                </p>
            )}

            {/* Published timestamp */}
            {draft.published_at && (
                <p className='text-[10px] text-zinc-500'>
                    Published {timeAgo(draft.published_at)}
                </p>
            )}

            {draft.status === 'published' && (
                <div className='rounded-lg border border-zinc-700/30 bg-zinc-900/40 p-3 space-y-2'>
                    <div className='flex items-center justify-between gap-2'>
                        <p className='text-[11px] uppercase tracking-wider text-zinc-500 font-medium'>
                            Publication Mirror
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ghostBadge.style}`}>
                            {ghostBadge.label}
                        </span>
                    </div>
                    {ghostMirror?.error && (
                        <p className='text-[11px] text-zinc-400 break-words'>
                            {ghostMirror.error === 'ghost_not_configured' ?
                                'Ghost is not configured yet. Local blog is live; mirror will backfill when Ghost keys are added.'
                            :   `Last Ghost error: ${ghostMirror.error}`}
                        </p>
                    )}
                    {ghostMirror?.next_retry_at && (
                        <p className='text-[10px] text-zinc-500'>
                            Next retry {timeAgo(ghostMirror.next_retry_at)}
                        </p>
                    )}
                    {(ghostMirror?.status === 'failed' || ghostMirror?.status === 'pending' || !ghostMirror) && (
                        <button
                            onClick={handleRetryGhost}
                            disabled={acting}
                            className='px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
                        >
                            {acting ? '...' : 'Retry Ghost Mirror'}
                        </button>
                    )}
                    {localPublication?.slug && (
                        <p className='text-[10px] text-zinc-500'>
                            Local canonical path: <span className='font-mono text-zinc-400'>/blog/{localPublication.slug}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── ContentPipelineSkeleton ───

function ContentPipelineSkeleton() {
    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse'>
            {[...Array(4)].map((_, col) => (
                <div key={col} className='space-y-3'>
                    <div className='h-5 w-20 rounded bg-zinc-700' />
                    {[...Array(2)].map((_, row) => (
                        <div key={row} className='h-24 rounded-lg bg-zinc-800/50' />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── ContentPipeline (main export) ───

export function ContentPipeline() {
    const { drafts, loading, error, updateStatus, retryGhostMirror } = useContent({
        limit: 100,
    });
    const [selected, setSelected] = useState<ContentDraft | null>(null);
    const [showRejected, setShowRejected] = useState(false);

    // Group drafts by status
    const grouped = useMemo(() => {
        const map: Record<ContentStatus, ContentDraft[]> = {
            draft: [],
            review: [],
            approved: [],
            rejected: [],
            published: [],
        };
        for (const d of drafts) {
            (map[d.status] ??= []).push(d);
        }
        return map;
    }, [drafts]);

    if (loading) return <ContentPipelineSkeleton />;

    if (error) {
        return (
            <div className='rounded-lg bg-red-900/20 border border-red-800/30 p-4 text-sm text-red-300'>
                Failed to load content: {error}
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            {/* Detail panel (above board when a card is selected) */}
            {selected && (
                <DetailPanel
                    draft={selected}
                    onClose={() => setSelected(null)}
                    onAction={async (id, status) => {
                        await updateStatus(id, status);
                        setSelected(null);
                    }}
                    onRetryGhostMirror={retryGhostMirror}
                />
            )}

            {/* Kanban columns */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
                {STATUS_COLUMNS.map(col => {
                    const items = grouped[col.key];
                    return (
                        <div key={col.key} className='space-y-2'>
                            {/* Column header */}
                            <div className='flex items-center gap-1.5 px-1'>
                                <span className='text-sm'>{col.icon}</span>
                                <span className='text-[11px] font-semibold text-zinc-300 uppercase tracking-wider'>
                                    {col.label}
                                </span>
                                <span className='text-[10px] text-zinc-600 tabular-nums'>
                                    {items.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className='space-y-2 min-h-15'>
                                {items.length === 0 && (
                                    <div className='rounded-lg border border-dashed border-zinc-700/40 p-4 text-center'>
                                        <span className='text-[10px] text-zinc-600'>No items</span>
                                    </div>
                                )}
                                {items.map(d => (
                                    <DraftCard key={d.id} draft={d} onSelect={setSelected} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rejected section (collapsed by default) */}
            {grouped.rejected.length > 0 && (
                <div className='rounded-lg border border-zinc-700/30 bg-zinc-900/30'>
                    <button
                        onClick={() => setShowRejected(r => !r)}
                        className='w-full flex items-center justify-between px-4 py-2'
                    >
                        <span className='text-[11px] font-semibold text-zinc-500 uppercase tracking-wider'>
                            ❌ Rejected ({grouped.rejected.length})
                        </span>
                        <span className='text-zinc-600 text-xs'>
                            {showRejected ? '▲' : '▼'}
                        </span>
                    </button>
                    {showRejected && (
                        <div className='px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2'>
                            {grouped.rejected.map(d => (
                                <DraftCard key={d.id} draft={d} onSelect={setSelected} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {drafts.length === 0 && (
                <div className='rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-8 text-center space-y-2'>
                    <p className='text-2xl'>📝</p>
                    <p className='text-sm text-zinc-400'>No content drafts yet</p>
                    <p className='text-[11px] text-zinc-600'>
                        Content is extracted automatically from writing_room roundtable sessions
                    </p>
                </div>
            )}

            <p className='text-[10px] text-zinc-600'>
                Publication is automatic: approved drafts are published to local `/blog` and mirrored to Ghost when configured.
            </p>
        </div>
    );
}
