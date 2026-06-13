import type { Metadata } from 'next';
import Link from 'next/link';
import { directory } from '@/data/learn/directory';
import { Breadcrumbs, CategoryBadge, ItemListJsonLd } from '../components';

const BASE = 'https://subcorp.subcult.tv';

export const metadata: Metadata = {
    title: 'AI Agent Tools Directory',
    description:
        'Curated directory of frameworks, platforms, and protocols for building AI agent systems.',
    alternates: {
        canonical: '/learn/directory',
    },
};

const CATEGORIES = [
    'all',
    'framework',
    'platform',
    'model-provider',
    'protocol',
] as const;

export default async function DirectoryIndex(props: {
    searchParams: Promise<{ category?: string }>;
}) {
    const searchParams = await props.searchParams;
    const active = searchParams.category || 'all';
    const filtered =
        active === 'all'
            ? directory
            : directory.filter(e => e.category === active);

    const sorted = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    return (
        <>
            <ItemListJsonLd
                name='AI Agent Tools Directory'
                items={directory.map(e => ({
                    url: `${BASE}/learn/directory/${e.slug}`,
                    name: e.name,
                }))}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Directory' },
                ]}
            />

            <h1 className='text-2xl font-bold tracking-tight mb-2'>
                AI Agent Tools Directory
            </h1>
            <p className='text-sm text-zinc-400 mb-8'>
                {directory.length} tools, frameworks, and platforms for building
                agent systems.
            </p>

            {/* Category filter */}
            <div className='flex flex-wrap gap-2 mb-8'>
                {CATEGORIES.map(cat => {
                    const label =
                        cat === 'all'
                            ? 'All'
                            : cat === 'model-provider'
                              ? 'Model Provider'
                              : cat.charAt(0).toUpperCase() + cat.slice(1);
                    return (
                        <Link
                            key={cat}
                            href={
                                cat === 'all'
                                    ? '/learn/directory'
                                    : `/learn/directory?category=${cat}`
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                                active === cat
                                    ? 'border-zinc-600 text-zinc-200 bg-zinc-800/60'
                                    : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>

            {/* Entries */}
            <div className='grid gap-3 sm:grid-cols-2'>
                {sorted.map(entry => (
                    <Link
                        key={entry.slug}
                        href={`/learn/directory/${entry.slug}`}
                        className='group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg hover:border-zinc-700 transition-colors'
                    >
                        <div className='flex items-start justify-between gap-3'>
                            <h2 className='text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors'>
                                {entry.name}
                            </h2>
                            <CategoryBadge category={entry.category} />
                        </div>
                        <p className='text-xs text-zinc-500 mt-1.5 leading-relaxed'>
                            {entry.shortDesc}
                        </p>
                    </Link>
                ))}
            </div>
        </>
    );
}
