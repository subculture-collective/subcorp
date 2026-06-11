// StageSidebar — grouped icon sidebar for view navigation
'use client';

import { useRef, useCallback } from 'react';
import type { ViewMode } from './StageHeader';
import {
    SignalIcon,
    MessageCircleIcon,
    TargetIcon,
    BuildingIcon,
    BrainIcon,
    DnaIcon,
    NetworkIcon,
    CloudIcon,
    ArchiveIcon,
    FileTextIcon,
    FolderIcon,
    ScaleIcon,
    WalletIcon,
    UsersIcon,
    NewspaperIcon,
    MailIcon,
} from '@/lib/icons';

type NavItem = { key: ViewMode; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Ops',
        items: [
            { key: 'feed', label: 'Feed', icon: <SignalIcon size={16} /> },
            { key: 'questions', label: 'Q&A', icon: <MessageCircleIcon size={16} /> },
            { key: 'missions', label: 'Missions', icon: <TargetIcon size={16} /> },
            { key: 'office', label: 'Office', icon: <BuildingIcon size={16} /> },
        ],
    },
    {
        label: 'Intel',
        items: [
            { key: 'logs', label: 'Cortex', icon: <BrainIcon size={16} /> },
            { key: 'memories', label: 'Memories', icon: <DnaIcon size={16} /> },
            { key: 'relationships', label: 'Graph', icon: <NetworkIcon size={16} /> },
            { key: 'dreams', label: 'Dreams', icon: <CloudIcon size={16} /> },
            { key: 'archaeology', label: 'Archaeology', icon: <ArchiveIcon size={16} /> },
        ],
    },
    {
        label: 'Output',
        items: [
            { key: 'newspaper', label: 'Newspaper', icon: <NewspaperIcon size={16} /> },
            { key: 'newsletter', label: 'Newsletter', icon: <MailIcon size={16} /> },
            { key: 'content', label: 'Content', icon: <FileTextIcon size={16} /> },
            { key: 'files', label: 'Files', icon: <FolderIcon size={16} /> },
            { key: 'governance', label: 'Governance', icon: <ScaleIcon size={16} /> },
        ],
    },
    {
        label: 'System',
        items: [
            { key: 'costs', label: 'Costs', icon: <WalletIcon size={16} /> },
            { key: 'agent-designer', label: 'Agents', icon: <UsersIcon size={16} /> },
        ],
    },
];

export function StageSidebar({
    view,
    onViewChange,
}: {
    view: ViewMode;
    onViewChange: (v: ViewMode) => void;
}) {
    const mobileNavRef = useRef<HTMLElement>(null);
    const activeButtonRef = useCallback((el: HTMLButtonElement | null) => {
        if (el) {
            // Delay to ensure the layout is settled after mount
            requestAnimationFrame(() => {
                el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
            });
        }
    }, []);

    return (
        <>
            {/* Desktop — fixed left rail with text labels */}
            <nav className='hidden md:flex fixed left-0 top-0 z-40 h-screen w-36 flex-col bg-soot border-r border-smoke overflow-y-auto'>
                {NAV_GROUPS.map((group, gi) => (
                    <div key={group.label}>
                        {gi > 0 && <div className='mx-3 border-t border-smoke' />}
                        <div className='px-3 pt-2.5 pb-1'>
                            <span className='block text-[9px] uppercase tracking-wider text-dust font-medium select-none'>
                                {group.label}
                            </span>
                        </div>
                        <div className='flex flex-col gap-0.5 px-1.5 pb-1'>
                            {group.items.map(item => {
                                const active = view === item.key;
                                return (
                                    <div key={item.key} className='relative'>
                                        {/* Active pill indicator */}
                                        {active && (
                                            <span className='absolute -left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-scan rounded-r-full' />
                                        )}
                                        <button
                                            onClick={() => onViewChange(item.key)}
                                            aria-label={item.label}
                                            aria-current={active ? 'page' : undefined}
                                            className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                                active
                                                    ? 'bg-ash text-scan'
                                                    : 'text-stone hover:text-bone hover:bg-ash/60'
                                            }`}
                                        >
                                            <span className='shrink-0'>{item.icon}</span>
                                            <span className='text-[11px] font-medium truncate'>{item.label}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Mobile — horizontal scrollable bar with labels */}
            <nav
                ref={mobileNavRef}
                className='md:hidden sticky top-0 z-40 flex items-center gap-0.5 bg-soot border-b border-smoke px-2 py-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-smoke'
                style={{ maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)' }}
            >
                {NAV_GROUPS.map((group, gi) => (
                    <div key={group.label} className='flex items-center gap-0.5 shrink-0'>
                        {gi > 0 && <div className='w-px h-6 bg-smoke mx-1 shrink-0' />}
                        {group.items.map(item => {
                            const active = view === item.key;
                            return (
                                <button
                                    key={item.key}
                                    ref={active ? activeButtonRef : undefined}
                                    onClick={() => onViewChange(item.key)}
                                    aria-label={item.label}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex items-center gap-1.5 px-2.5 py-2.5 sm:py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                                        active
                                            ? 'bg-ash text-scan'
                                            : 'text-stone hover:text-bone hover:bg-ash/60'
                                    }`}
                                >
                                    {item.icon}
                                    <span className='text-[10px] font-medium'>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </>
    );
}
