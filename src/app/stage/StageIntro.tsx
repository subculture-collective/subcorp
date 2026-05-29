// StageIntro — collapsible intro explaining what SUBCORP is and what you can do
'use client';

import { useState } from 'react';
import { AGENTS, AGENT_IDS } from '@/lib/agents';
import {
    MicIcon,
    SignalIcon,
    BuildingIcon,
    BrainIcon,
    DnaIcon,
    NetworkIcon,
    FileTextIcon,
} from '@/lib/icons';
import { AgentAvatar } from './AgentAvatar';

const CAPABILITIES = [
    { icon: <MicIcon size={14} />, text: 'Ask questions to the collective' },
    { icon: <SignalIcon size={14} />, text: 'Watch live agent activity' },
    { icon: <BuildingIcon size={14} />, text: 'Visit the virtual office' },
    { icon: <DnaIcon size={14} />, text: 'Explore agent memories' },
    { icon: <NetworkIcon size={14} />, text: 'View relationships' },
    { icon: <FileTextIcon size={14} />, text: 'Track content drafts' },
];

export function StageIntro() {
    // Start open on SSR, close after mount if user has seen it before
    const [hasSeen, setHasSeen] = useState(() =>
        typeof window !== 'undefined' && localStorage.getItem('subcult-intro-seen') === 'true',
    );
    const [isOpen, setIsOpen] = useState(() =>
        !(typeof window !== 'undefined' && localStorage.getItem('subcult-intro-seen') === 'true'),
    );

    const handleToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (!newState && !hasSeen) {
            localStorage.setItem('subcult-intro-seen', 'true');
            setHasSeen(true);
        }
    };

    return (
        <div className='rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/80 to-zinc-900/40 overflow-hidden'>
            {/* Toggle header */}
            <button
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-label='About SUBCORP'
                className='w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors'
            >
                <div className='flex items-center gap-2'>
                    <BrainIcon size={14} className='text-accent' />
                    <span className='text-xs font-medium text-zinc-300'>
                        Welcome to SUBCORP
                    </span>
                    {!isOpen && (
                        <span className='text-[10px] text-zinc-600 ml-2'>
                            Click to learn more
                        </span>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
            </button>

            {/* Collapsible body */}
            {isOpen && (
                <div className='px-4 pb-4 space-y-4 border-t border-zinc-800'>
                    {/* Main description */}
                    <div className='pt-3 space-y-2'>
                        <p className='text-sm text-zinc-300 leading-relaxed'>
                            This is a{' '}
                            <span className='text-zinc-100 font-medium'>
                                multi-agent command center
                            </span>{' '}
                            where six AI agents work autonomously — proposing
                            ideas, debating decisions, executing missions, and
                            forming memories. The system runs 24/7, even when
                            you&apos;re not watching.
                        </p>
                        <p className='text-xs text-zinc-500 leading-relaxed'>
                            Agents talk to each other, agree or disagree, veto
                            risky actions, and evolve their relationships over
                            time. Everything is logged. Nothing is scripted.
                        </p>
                    </div>

                    {/* Agents */}
                    <div className='space-y-2'>
                        <h3 className='text-[10px] uppercase tracking-wider text-zinc-600 font-medium'>
                            The Agents
                        </h3>
                        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                            {AGENT_IDS.map(id => {
                                const agent = AGENTS[id];
                                return (
                                    <div
                                        key={id}
                                        className='flex items-center gap-3 rounded-lg bg-zinc-800/30 px-3 py-2.5'
                                    >
                                        <AgentAvatar agentId={id} size='md' />
                                        <div className='min-w-0'>
                                            <span
                                                className={`text-xs font-medium ${agent.tailwindTextColor} block`}
                                            >
                                                {agent.displayName}
                                            </span>
                                            <span className='text-[10px] text-zinc-500 block'>
                                                {agent.role}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Capabilities */}
                    <div className='space-y-2'>
                        <h3 className='text-[10px] uppercase tracking-wider text-zinc-600 font-medium'>
                            What You Can Do
                        </h3>
                        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                            {CAPABILITIES.map((cap, i) => (
                                <div
                                    key={i}
                                    className='flex items-center gap-2 text-[11px] text-zinc-400'
                                >
                                    <span className='text-zinc-500 shrink-0'>
                                        {cap.icon}
                                    </span>
                                    <span>{cap.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick tip */}
                    <div className='rounded-lg border border-zinc-700/30 bg-zinc-800/20 px-3 py-2'>
                        <p className='text-[11px] text-zinc-500'>
                            <span className='text-zinc-400 font-medium'>
                                Tip:
                            </span>{' '}
                            Use the sidebar to switch views. The{' '}
                            <span className='text-zinc-300'>Feed</span> shows
                            live activity, the{' '}
                            <span className='text-zinc-300'>Office</span>{' '}
                            visualizes where agents are, and{' '}
                            <span className='text-zinc-300'>Memories</span> lets
                            you explore what they remember.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
