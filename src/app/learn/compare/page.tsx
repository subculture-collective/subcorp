import type { Metadata } from 'next';
import Link from 'next/link';
import { comparisons } from '@/data/learn/comparisons';
import { Breadcrumbs, ItemListJsonLd } from '../components';

const BASE = 'https://subcorp.subcult.tv';

export const metadata: Metadata = {
    title: 'AI Tool Comparisons',
    description:
        'Side-by-side comparisons of AI agent frameworks, LLM providers, and architectural patterns.',
};

export default function CompareIndex() {
    return (
        <>
            <ItemListJsonLd
                name='AI Tool Comparisons'
                items={comparisons.map(e => ({
                    url: `${BASE}/learn/compare/${e.slug}`,
                    name: e.title,
                }))}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Comparisons' },
                ]}
            />

            <h1 className='text-2xl font-bold tracking-tight mb-2'>
                AI Tool Comparisons
            </h1>
            <p className='text-sm text-zinc-400 mb-8'>
                {comparisons.length} side-by-side breakdowns of frameworks,
                models, and patterns.
            </p>

            <div className='space-y-3'>
                {comparisons.map(entry => (
                    <Link
                        key={entry.slug}
                        href={`/learn/compare/${entry.slug}`}
                        className='group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg hover:border-zinc-700 transition-colors'
                    >
                        <h2 className='text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors'>
                            {entry.title}
                        </h2>
                        <p className='text-xs text-zinc-500 mt-1 leading-relaxed'>
                            {entry.shortDesc}
                        </p>
                        <div className='mt-3 flex gap-2 text-[10px] text-zinc-600'>
                            <span className='rounded border border-zinc-800 px-2 py-0.5'>
                                {entry.sideA.name}
                            </span>
                            <span className='text-zinc-700'>vs</span>
                            <span className='rounded border border-zinc-800 px-2 py-0.5'>
                                {entry.sideB.name}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}
