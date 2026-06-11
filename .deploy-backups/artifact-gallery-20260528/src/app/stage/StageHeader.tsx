// Stage Header — title bar, stats, and view toggle
'use client';

import { useState, useCallback } from 'react';
import {
    useSystemStats,
    type SystemStats,
    type ConnectionStatus,
} from './hooks';
import { StatsBarSkeleton } from './StageSkeletons';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';
import { LinkIcon, CheckIcon, MessageCircleIcon } from '@/lib/icons';
import Link from 'next/link';
import { AgentAvatar } from './AgentAvatar';

export type ViewMode =
    | 'feed'
    | 'missions'
    | 'office'
    | 'logs'
    | 'costs'
    | 'memories'
    | 'relationships'
    | 'content'
    | 'files'
    | 'governance'
    | 'dreams'
    | 'agent-designer'
    | 'archaeology'
    | 'questions'
    | 'newspaper'
    | 'newsletter';

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
    const config: Record<
        ConnectionStatus,
        { color: string; pulse: boolean; label: string; tooltip: string }
    > = {
        connected: {
            color: 'bg-accent-green',
            pulse: false,
            label: 'Live',
            tooltip: 'SSE connection active — real-time updates',
        },
        reconnecting: {
            color: 'bg-accent-yellow',
            pulse: true,
            label: 'Reconnecting...',
            tooltip: 'SSE connection lost — attempting to reconnect',
        },
        polling: {
            color: 'bg-zinc-500',
            pulse: false,
            label: 'Polling',
            tooltip: 'SSE unavailable — using HTTP polling fallback',
        },
    };

    const { color, pulse, label, tooltip } = config[status];

    return (
        <span
            className='flex items-center gap-1.5 cursor-default'
            title={tooltip}
        >
            <span className='relative flex h-2 w-2'>
                {pulse && (
                    <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
                    />
                )}
                <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${color}`}
                />
            </span>
            <span className='text-[10px] text-zinc-500 font-medium'>
                {label}
            </span>
        </span>
    );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className='flex-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-3'>
            <div className='text-[10px] uppercase tracking-wider text-zinc-500'>
                {label}
            </div>
            <div className='text-lg font-semibold text-zinc-100 tabular-nums'>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
}

export function StageHeader({
    connectionStatus,
}: {
    connectionStatus?: ConnectionStatus;
}) {
    const { stats, loading } = useSystemStats();
    const [copied, setCopied] = useState(false);

    const handleShareClick = useCallback((e: React.MouseEvent) => {
        const liveUrl = `${window.location.origin}/live`;

        // Alt-click opens in new tab
        if (e.altKey) {
            window.open(liveUrl, '_blank');
            return;
        }

        navigator.clipboard.writeText(liveUrl).then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            () => {
                // Clipboard API not available (HTTP context, permissions denied)
            },
        );
    }, []);

    return (
        <header className='space-y-4'>
            {/* Title row */}
            <div className='flex items-center justify-between'>
                <div>
                    <div className='flex items-center gap-2'>
                        <h1 className='text-xl font-bold text-zinc-100 tracking-tight'>
                            SUBCORP
                        </h1>
                        {connectionStatus && (
                            <ConnectionIndicator status={connectionStatus} />
                        )}
                    </div>
                    <p className='text-xs text-zinc-500 mt-0.5'>
                        Multi-agent command center
                    </p>
                </div>

                {/* Navigation buttons */}
                <div className='flex items-center gap-2'>
                    <Link
                        href='/sanctum'
                        className='flex items-center gap-1.5 rounded-md px-2.5 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700/50 cursor-pointer'
                        title='Open Sanctum chat'
                    >
                        <MessageCircleIcon size={14} />
                        <span className='hidden sm:inline'>Sanctum</span>
                    </Link>
                    <button
                        onClick={handleShareClick}
                        className='flex items-center gap-1.5 rounded-md px-2.5 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700/50 cursor-pointer'
                        title='Copy /live link (Alt+click to open)'
                    >
                        {copied ?
                            <>
                                <CheckIcon
                                    size={14}
                                    className='text-accent-green'
                                />
                                <span className='text-accent-green'>
                                    Copied!
                                </span>
                            </>
                        :   <>
                                <LinkIcon size={14} />
                                <span className='hidden sm:inline'>
                                    Share Live
                                </span>
                            </>
                        }
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {loading ?
                <StatsBarSkeleton />
            : stats ?
                <StatsBar stats={stats} />
            :   null}
        </header>
    );
}

function StatsBar({ stats }: { stats: SystemStats }) {
    return (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3'>
            <StatCard label='Events' value={stats.totalEvents} />
            <StatCard label='Active Missions' value={stats.activeMissions} />
            <StatCard label='Conversations' value={stats.totalConversations} />
            <div className='flex-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-3 min-w-0'>
                <div className='text-[10px] uppercase tracking-wider text-zinc-500'>
                    Agent Memories
                </div>
                <div className='flex gap-x-3 gap-y-1 mt-1 flex-wrap'>
                    {Object.entries(stats.agentMemories).map(
                        ([agent, count]) => {
                            const agentId = agent as AgentId;
                            const color =
                                AGENTS[agentId]?.tailwindTextColor ??
                                'text-zinc-400';
                            return (
                                <span
                                    key={agent}
                                    className={`flex items-center gap-1 text-xs font-medium ${color}`}
                                >
                                    <AgentAvatar
                                        agentId={agentId}
                                        size='xs'
                                        showBorder={false}
                                    />
                                    {count}
                                </span>
                            );
                        },
                    )}
                    {Object.keys(stats.agentMemories).length === 0 && (
                        <span className='text-xs text-zinc-500'>None yet</span>
                    )}
                </div>
            </div>
        </div>
    );
}
