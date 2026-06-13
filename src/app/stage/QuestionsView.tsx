// QuestionsView — shows user-submitted questions and their roundtable responses
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInterval } from './hooks';
import { TranscriptViewer } from './TranscriptViewer';
import { AgentAvatarStack } from './AgentAvatar';
import type { RoundtableSession } from '@/lib/types';
import {
    MessageCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    HourglassIcon,
    RefreshIcon,
} from '@/lib/icons';

// ─── Helpers ───

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

const STATUS_CONFIG: Record<
    string,
    { icon: React.ReactNode; color: string; label: string }
> = {
    pending: {
        icon: <HourglassIcon size={14} />,
        color: 'text-accent-yellow',
        label: 'Queued',
    },
    running: {
        icon: <RefreshIcon size={14} className='animate-spin' />,
        color: 'text-accent-blue',
        label: 'In progress',
    },
    completed: {
        icon: <CheckCircleIcon size={14} />,
        color: 'text-accent-green',
        label: 'Answered',
    },
    failed: {
        icon: <XCircleIcon size={14} />,
        color: 'text-accent-red',
        label: 'Failed',
    },
};

// ─── Question Card ───

function QuestionCard({
    session,
    isExpanded,
    onToggle,
}: {
    session: RoundtableSession;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const status = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.pending;
    const question =
        (session.metadata?.userQuestion as string) ?? session.topic;

    return (
        <div className='rounded-lg border border-zinc-700/50 bg-zinc-800/30 overflow-hidden'>
            {/* Question header */}
            <div
                onClick={onToggle}
                className='flex items-start gap-3 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors'
            >
                {/* Status icon */}
                <div className={`shrink-0 pt-0.5 ${status.color}`}>
                    {status.icon}
                </div>

                {/* Content */}
                <div className='flex-1 min-w-0'>
                    <p className='text-sm text-zinc-100 leading-snug'>
                        {question}
                    </p>
                    <div className='flex items-center gap-2 mt-2 flex-wrap'>
                        <span className='text-[10px] text-zinc-500 font-mono uppercase'>
                            {session.format}
                        </span>
                        <span className='text-[10px] text-zinc-600'>
                            &middot;
                        </span>
                        <span className={`text-[10px] font-medium ${status.color}`}>
                            {status.label}
                        </span>
                        {session.turn_count > 0 && (
                            <>
                                <span className='text-[10px] text-zinc-600'>
                                    &middot;
                                </span>
                                <span className='text-[10px] text-zinc-500'>
                                    {session.turn_count} turns
                                </span>
                            </>
                        )}
                        <span className='text-[10px] text-zinc-600'>
                            &middot;
                        </span>
                        <AgentAvatarStack
                            agentIds={session.participants}
                            size='md'
                        />
                        <span className='text-[10px] text-zinc-600 ml-auto'>
                            {formatDateTime(session.created_at)}
                        </span>
                    </div>
                </div>

                {/* Expand indicator */}
                <div className='shrink-0 pt-1'>
                    <svg
                        className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M19 9l-7 7-7-7'
                        />
                    </svg>
                </div>
            </div>

            {/* Transcript (expanded) */}
            {isExpanded && (
                <div className='border-t border-zinc-700/50 p-4'>
                    {session.status === 'pending' && (
                        <p className='text-xs text-zinc-500 text-center py-4'>
                            Waiting for agents to pick up this question...
                        </p>
                    )}
                    {session.status === 'running' && (
                        <p className='text-xs text-accent-blue text-center py-4'>
                            Agents are discussing this now...
                        </p>
                    )}
                    {(session.status === 'completed' ||
                        session.status === 'failed') && (
                        <TranscriptViewer
                            session={session}
                            onClose={onToggle}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───

export function QuestionsView() {
    const [sessions, setSessions] = useState<RoundtableSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchQuestions = useCallback(async () => {
        try {
            const res = await fetch(
                '/api/ops/roundtable?source=user_question&limit=50',
            );
            if (!res.ok) return;
            const data = await res.json();
            setSessions(data.sessions);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Poll for updates every 10s
    useInterval(fetchQuestions, 10_000);

    // Force re-render for relative timestamps
    const [, setTick] = useState(0);
    useInterval(() => setTick(t => t + 1), 10_000);

    if (loading) {
        return (
            <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-4'>
                <div className='space-y-3'>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className='h-20 rounded-lg bg-zinc-800/40 animate-pulse'
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            {/* Header */}
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <MessageCircleIcon
                        size={16}
                        className='text-purple-400'
                    />
                    <h2 className='text-sm font-semibold text-zinc-200'>
                        User Questions
                    </h2>
                    <span className='text-[10px] text-zinc-600 tabular-nums'>
                        {sessions.length} total
                    </span>
                </div>
                <div className='flex items-center gap-3 text-[10px] text-zinc-500'>
                    <span className='flex items-center gap-1'>
                        <span className='h-1.5 w-1.5 rounded-full bg-accent-green' />
                        {sessions.filter(s => s.status === 'completed').length}{' '}
                        answered
                    </span>
                    {sessions.filter(
                        s => s.status === 'pending' || s.status === 'running',
                    ).length > 0 && (
                        <span className='flex items-center gap-1'>
                            <span className='h-1.5 w-1.5 rounded-full bg-accent-yellow' />
                            {
                                sessions.filter(
                                    s =>
                                        s.status === 'pending' ||
                                        s.status === 'running',
                                ).length
                            }{' '}
                            in progress
                        </span>
                    )}
                </div>
            </div>

            {/* Question list */}
            {sessions.length === 0 ?
                <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center'>
                    <MessageCircleIcon
                        size={24}
                        className='text-zinc-700 mx-auto mb-2'
                    />
                    <p className='text-sm text-zinc-500'>
                        No questions submitted yet.
                    </p>
                    <p className='text-xs text-zinc-600 mt-1'>
                        Use &ldquo;Ask the Collective&rdquo; on the feed to
                        submit a question.
                    </p>
                </div>
            :   <div className='space-y-2'>
                    {sessions.map(session => (
                        <QuestionCard
                            key={session.id}
                            session={session}
                            isExpanded={expandedId === session.id}
                            onToggle={() =>
                                setExpandedId(prev =>
                                    prev === session.id ? null : session.id,
                                )
                            }
                        />
                    ))}
                </div>
            }
        </div>
    );
}
