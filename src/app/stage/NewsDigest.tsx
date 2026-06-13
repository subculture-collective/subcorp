// NewsDigest — collapsible card showing Mux's news briefing from RSS feeds
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNewsDigests, type NewsDigestEntry } from './hooks';
import { ChevronDownIcon, NewspaperIcon } from '@/lib/icons';
import { AgentAvatar } from './AgentAvatar';
import { AGENTS } from '@/lib/agents';
import { MarkdownContent } from '@/components/MarkdownContent';

// ─── Formatting helpers ───

function formatSlotLabel(slot: string): string {
    return slot === 'morning' ? 'Morning' : 'Evening';
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

// ─── Loading Skeleton ───

function NewsDigestSkeleton() {
    return (
        <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-4 animate-pulse'>
            <div className='flex items-center gap-2 mb-3'>
                <div className='h-4 w-4 rounded bg-zinc-700' />
                <div className='h-4 w-28 rounded bg-zinc-700' />
                <div className='h-3 w-20 rounded bg-zinc-800 ml-auto' />
            </div>
            <div className='space-y-2'>
                <div className='h-3 w-full rounded bg-zinc-800' />
                <div className='h-3 w-5/6 rounded bg-zinc-800' />
                <div className='h-3 w-3/6 rounded bg-zinc-800' />
            </div>
        </div>
    );
}

// ─── Digest Content ───

function DigestBody({ digest }: { digest: NewsDigestEntry }) {
    const [showSources, setShowSources] = useState(false);

    // Group items by category
    const byCategory = digest.items.reduce<Record<string, typeof digest.items>>((acc, item) => {
        const cat = item.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div className='space-y-3'>
            {/* Summary text — rendered as markdown */}
            <div className='text-sm text-zinc-300'>
                <MarkdownContent>{digest.summary}</MarkdownContent>
            </div>

            {/* Source count + toggle */}
            <button
                onClick={() => setShowSources(!showSources)}
                className='text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer'
            >
                {digest.item_count} sources {showSources ? '▾' : '▸'}
            </button>

            {/* Source links by category */}
            {showSources && (
                <div className='space-y-2'>
                    {Object.entries(byCategory).map(([category, items]) => (
                        <div key={category}>
                            <p className='text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1'>
                                {category}
                            </p>
                            <ul className='space-y-0.5'>
                                {items.map((item, i) => (
                                    <li key={i} className='text-[11px] text-zinc-400 truncate'>
                                        <span className='text-zinc-600 mr-1'>·</span>
                                        {item.link ? (
                                            <a
                                                href={item.link}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='hover:text-zinc-200 transition-colors'
                                            >
                                                {item.title}
                                            </a>
                                        ) : (
                                            item.title
                                        )}
                                        <span className='text-zinc-600 ml-1'>
                                            ({item.feed_name})
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───

export function NewsDigest() {
    const [collapsed, setCollapsed] = useState(true);
    const { digests, loading, error } = useNewsDigests(3);

    const muxColor = AGENTS.mux.color;
    const latest = digests[0] ?? null;

    if (loading) return <NewsDigestSkeleton />;
    if (error || !latest) return null; // No digest yet — show nothing

    return (
        <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 overflow-hidden'>
            {/* Header */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
                aria-label='News Briefing'
                className='w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer'
            >
                <AgentAvatar agentId='mux' size='lg' />
                <span
                    className='text-sm font-medium'
                    style={{ color: muxColor }}
                >
                    News Briefing
                </span>
                <span className='inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700/50'>
                    {formatSlotLabel(latest.slot)}
                </span>
                <span className='text-[11px] text-zinc-500 ml-1'>
                    {formatTime(latest.created_at)}
                </span>
                <Link
                    href='/stage?view=newspaper'
                    onClick={(e) => e.stopPropagation()}
                    className='ml-auto flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded border border-zinc-800 hover:border-zinc-700'
                    title='View newspaper'
                >
                    <NewspaperIcon size={11} />
                    Paper
                </Link>
                <ChevronDownIcon
                    size={16}
                    className={`text-zinc-500 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
                />
            </button>

            {/* Collapsible content */}
            {!collapsed && (
                <div className='px-4 pb-4 space-y-3'>
                    <DigestBody digest={latest} />

                    {/* Older digests */}
                    {digests.length > 1 && (
                        <div className='border-t border-zinc-800/60 pt-2 space-y-2'>
                            <p className='text-[10px] font-medium text-zinc-500 uppercase tracking-wider'>
                                Previous
                            </p>
                            {digests.slice(1).map((d) => (
                                <details key={d.id} className='group'>
                                    <summary className='text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors'>
                                        {formatSlotLabel(d.slot)} — {formatTime(d.created_at)}
                                        <span className='text-zinc-600 ml-1'>
                                            ({d.item_count} sources)
                                        </span>
                                    </summary>
                                    <div className='mt-2 ml-2'>
                                        <DigestBody digest={d} />
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
