'use client';

import { useEffect, useState } from 'react';

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export function SimulationBadge() {
    const [since, setSince] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/ops/stats')
            .then(r => r.json())
            .then(d => {
                if (d.simulationStartedAt) setSince(d.simulationStartedAt);
            })
            .catch(() => {});
    }, []);

    return (
        <div className='inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/30 px-3 py-1'>
            <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500' />
            </span>
            <span className='text-[11px] text-zinc-400'>
                System Active{since ? ` · Online since ${relativeTime(since)}` : ''}
            </span>
        </div>
    );
}
