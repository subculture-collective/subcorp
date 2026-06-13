import type { Metadata } from 'next';
import Link from 'next/link';
import { glossary } from '@/data/learn/glossary';
import { Breadcrumbs, CategoryBadge, ItemListJsonLd } from '../components';

const BASE = 'https://subcorp.subcult.tv';

export const metadata: Metadata = {
    title: 'AI Agent Glossary',
    description:
        'Definitions for key terms in autonomous AI systems — agents, tool use, function calling, orchestration, memory, and more.',
    alternates: {
        canonical: '/learn/glossary',
    },
};

const CATEGORIES = ['all', 'concept', 'pattern', 'tool'] as const;

export default async function GlossaryIndex(props: {
    searchParams: Promise<{ category?: string }>;
}) {
    const searchParams = await props.searchParams;
    const active = searchParams.category || 'all';
    const filtered =
        active === 'all'
            ? glossary
            : glossary.filter(e => e.category === active);

    const sorted = [...filtered].sort((a, b) =>
        a.term.localeCompare(b.term)
    );

    return (
        <>
            <ItemListJsonLd
                name='AI Agent Glossary'
                items={glossary.map(e => ({
                    url: `${BASE}/learn/glossary/${e.slug}`,
                    name: e.term,
                }))}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Glossary' },
                ]}
            />

            <h1 className='text-2xl font-bold tracking-tight mb-2'>
                AI Agent Glossary
            </h1>
            <p className='text-sm text-zinc-400 mb-8'>
                {glossary.length} terms covering autonomous agents, tool use,
                orchestration, and the tools that power them.
            </p>

            {/* Category filter */}
            <div className='flex gap-2 mb-8'>
                {CATEGORIES.map(cat => (
                    <Link
                        key={cat}
                        href={
                            cat === 'all'
                                ? '/learn/glossary'
                                : `/learn/glossary?category=${cat}`
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                            active === cat
                                ? 'border-zinc-600 text-zinc-200 bg-zinc-800/60'
                                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Link>
                ))}
            </div>

            {/* Entries */}
            <div className='space-y-3'>
                {sorted.map(entry => (
                    <Link
                        key={entry.slug}
                        href={`/learn/glossary/${entry.slug}`}
                        className='group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg hover:border-zinc-700 transition-colors'
                    >
                        <div className='flex items-start justify-between gap-4'>
                            <div>
                                <h2 className='text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors'>
                                    {entry.term}
                                </h2>
                                <p className='text-xs text-zinc-500 mt-1 leading-relaxed'>
                                    {entry.shortDef}
                                </p>
                            </div>
                            <CategoryBadge category={entry.category} />
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}
