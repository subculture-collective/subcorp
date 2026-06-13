// Missions List — expandable mission cards with status badges
'use client';

import { useState } from 'react';
import { useMissions, useMissionSteps } from './hooks';
import { MissionsListSkeleton } from './StageSkeletons';
import {
    ClipboardListIcon,
    ZapIcon,
    CheckCircleIcon,
    XCircleIcon,
    BanIcon,
} from '@/lib/icons';
import type { Mission, MissionStep } from '@/lib/types';
import { MarkdownContent } from '@/components/MarkdownContent';

const STATUS_STYLES: Record<string, string> = {
    approved: 'bg-accent-blue/30 text-accent-blue border-accent-blue/30',
    running: 'bg-accent-yellow/30 text-accent-yellow border-accent-yellow/30',
    succeeded: 'bg-accent-green/30 text-accent-green border-accent-green/30',
    failed: 'bg-accent-red/30 text-accent-red border-accent-red/30',
    cancelled: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    approved: <ClipboardListIcon size={16} className='text-accent-blue' />,
    running: <ZapIcon size={16} className='text-accent-yellow' />,
    succeeded: <CheckCircleIcon size={16} className='text-accent-green' />,
    failed: <XCircleIcon size={16} className='text-accent-red' />,
    cancelled: <BanIcon size={16} className='text-zinc-500' />,
};

const STEP_STATUS_DOT: Record<string, string> = {
    queued: 'bg-zinc-500',
    running: 'bg-accent-yellow animate-pulse',
    succeeded: 'bg-accent-green',
    failed: 'bg-accent-red',
    skipped: 'bg-zinc-600',
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function MissionCard({
    mission,
    expanded,
    onToggle,
    onPlayback,
}: {
    mission: Mission;
    expanded: boolean;
    onToggle: () => void;
    onPlayback: () => void;
}) {
    const { steps, loading: stepsLoading } = useMissionSteps(
        expanded ? mission.id : null,
    );

    const statusStyle =
        STATUS_STYLES[mission.status] ?? STATUS_STYLES.cancelled;
    const statusIcon = STATUS_ICONS[mission.status] ?? <ClipboardListIcon size={16} className='text-zinc-400' />;

    return (
        <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-colors hover:border-zinc-700'>
            {/* Header */}
            <button
                onClick={onToggle}
                className='flex w-full items-center justify-between px-4 py-3 text-left'
            >
                <div className='flex items-center gap-3 min-w-0'>
                    <span className='shrink-0'>{statusIcon}</span>
                    <div className='min-w-0'>
                        <p className='text-sm font-medium text-zinc-200 truncate'>
                            {mission.title}
                        </p>
                        <p className='text-[11px] text-zinc-500 mt-0.5'>
                            {mission.created_by} &middot;{' '}
                            {formatDate(mission.created_at)}
                        </p>
                    </div>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                    <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle}`}
                    >
                        {mission.status}
                    </span>
                    <svg
                        className={`h-4 w-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 9l-7 7-7-7'
                        />
                    </svg>
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className='border-t border-zinc-800 px-4 py-3 space-y-3'>
                    {mission.description && (
                        <div className='text-xs text-zinc-400'>
                            <MarkdownContent>{mission.description}</MarkdownContent>
                        </div>
                    )}

                    {/* Steps */}
                    {stepsLoading ?
                        <div className='animate-pulse space-y-2'>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className='h-8 rounded bg-zinc-800'
                                />
                            ))}
                        </div>
                    : steps.length > 0 ?
                        <div className='space-y-1'>
                            <div className='text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5'>
                                Steps
                            </div>
                            {steps.map(step => (
                                <StepRow key={step.id} step={step} />
                            ))}
                        </div>
                    :   null}

                    {/* Actions */}
                    <div className='flex gap-2 pt-1'>
                        <button
                            onClick={onPlayback}
                            className='rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700'
                        >
                            ▶ Playback
                        </button>
                    </div>

                    {mission.failure_reason && (
                        <div className='rounded bg-accent-red/20 border border-accent-red/30 px-3 py-2 text-xs text-accent-red'>
                            {mission.failure_reason}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StepRow({ step }: { step: MissionStep }) {
    const dotColor = STEP_STATUS_DOT[step.status] ?? STEP_STATUS_DOT.queued;

    return (
        <div className='flex items-center gap-2 rounded bg-zinc-800/50 px-3 py-2'>
            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
            <span className='text-xs text-zinc-300 font-mono'>{step.kind}</span>
            <span className='text-[10px] text-zinc-500 ml-auto'>
                {step.status}
            </span>
        </div>
    );
}

export function MissionsList({
    onPlayback,
}: {
    onPlayback: (missionId: string) => void;
}) {
    const { missions, loading, error } = useMissions();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (loading) return <MissionsListSkeleton />;

    if (error) {
        return (
            <div className='rounded-lg border border-accent-red/50 bg-accent-red/10 p-4'>
                <p className='text-sm text-accent-red'>
                    Failed to load missions: {error}
                </p>
            </div>
        );
    }

    if (missions.length === 0) {
        return (
            <div className='rounded-lg border border-zinc-800 p-8 text-center text-sm text-zinc-500'>
                No missions yet. Proposals that get approved become missions.
            </div>
        );
    }

    return (
        <div className='space-y-2'>
            {missions.map(mission => (
                <MissionCard
                    key={mission.id}
                    mission={mission}
                    expanded={expandedId === mission.id}
                    onToggle={() =>
                        setExpandedId(
                            expandedId === mission.id ? null : mission.id,
                        )
                    }
                    onPlayback={() => onPlayback(mission.id)}
                />
            ))}
        </div>
    );
}
