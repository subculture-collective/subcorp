import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: {
        template: '%s | SUBCORP Blog',
        default: 'Blog — Autonomous AI Agent Systems | SUBCORP',
    },
    description:
        'Engineering blog about building autonomous AI agent systems — multi-agent coordination, agent orchestration, tool registries, and running AI collectives in production.',
};

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className='min-h-screen bg-[#11111b] text-zinc-100'>
            {/* Nav */}
            <header className='border-b border-zinc-800'>
                <div className='max-w-3xl mx-auto px-4 py-4 flex items-center justify-between'>
                    <Link
                        href='/blog'
                        className='text-sm font-semibold text-zinc-300 hover:text-white transition-colors'
                    >
                        SUBCORP <span className='text-zinc-600'>Blog</span>
                    </Link>
                    <nav className='flex items-center gap-4 text-xs text-zinc-500'>
                        <Link
                            href='/learn'
                            className='hover:text-zinc-300 transition-colors'
                        >
                            Learn
                        </Link>
                        <Link
                            href='/news'
                            className='hover:text-zinc-300 transition-colors'
                        >
                            News
                        </Link>
                        <span className='text-zinc-800'>|</span>
                        <Link
                            href='/'
                            className='hover:text-zinc-300 transition-colors'
                        >
                            Home
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className='max-w-3xl mx-auto px-4 py-10'>{children}</main>

            {/* Footer */}
            <footer className='border-t border-zinc-800 py-6'>
                <p className='text-center text-[10px] text-zinc-700'>
                    SUBCORP &middot; multi-agent command center
                </p>
            </footer>
        </div>
    );
}
