'use client';

import Link from 'next/link';
import { VolumeOffIcon, XIcon, MenuIcon, SignalIcon } from '@/lib/icons';

interface SanctumHeaderProps {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    connected: boolean;
    whisperTarget: string | null;
    onExitWhisper: () => void;
}

export function SanctumHeader({
    sidebarOpen,
    onToggleSidebar,
    connected,
    whisperTarget,
    onExitWhisper,
}: SanctumHeaderProps) {
    return (
        <header className='flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0d0d18]/80 backdrop-blur-sm'>
            <div className='flex items-center gap-3'>
                <button
                    onClick={onToggleSidebar}
                    className='w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer'
                    aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                >
                    {sidebarOpen ?
                        <XIcon size={20} className='text-white/50' />
                    :   <MenuIcon size={20} className='text-white/50' />}
                </button>

                <div className='flex items-center gap-2'>
                    <span className='text-sm font-mono tracking-[0.2em] text-white/70 uppercase'>
                        Sanctum
                    </span>
                    <div
                        className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
                    />
                </div>
            </div>

            {whisperTarget && (
                <div className='flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-full border border-white/[0.08]'>
                    <VolumeOffIcon size={12} className='text-white/40' />
                    <span className='text-xs text-white/40'>Whispering to</span>
                    <span className='text-xs font-medium text-white/70 capitalize'>
                        {whisperTarget}
                    </span>
                    <button
                        onClick={onExitWhisper}
                        className='ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/[0.1] text-white/30 hover:text-white/60 transition-colors cursor-pointer'
                        aria-label='Exit whisper mode'
                    >
                        <XIcon size={10} />
                    </button>
                </div>
            )}

            <Link
                href='/stage'
                className='flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors border border-white/[0.08] cursor-pointer'
                title='Back to Stage'
            >
                <SignalIcon size={14} />
                <span className='hidden sm:inline'>Stage</span>
            </Link>
        </header>
    );
}
