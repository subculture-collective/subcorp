import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { directory, directoryLabelMap } from '@/data/learn/directory';
import { glossary } from '@/data/learn/glossary';
import {
    Breadcrumbs,
    BreadcrumbJsonLd,
    BodyText,
    CategoryBadge,
    RelatedLinks,
    CrossSectionLinks,
    JsonLd,
} from '../../components';

const BASE = 'https://subcorp.subcult.tv';

export function generateStaticParams() {
    return directory.map(e => ({ slug: e.slug }));
}

export async function generateMetadata(props: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await props.params;
    const entry = directory.find(e => e.slug === slug);
    if (!entry) return {};
    return {
        title: `${entry.name} — AI Agent Tools`,
        description: entry.shortDesc,
    };
}

// Map directory slugs to matching glossary slugs
const DIRECTORY_TO_GLOSSARY: Record<string, string> = {
    openclaw: 'openclaw',
    clawhub: 'clawhub',
    openrouter: 'openrouter',
    ollama: 'ollama',
    'anthropic-mcp': 'mcp-protocol',
};

export default async function DirectoryDetail(props: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await props.params;
    const entry = directory.find(e => e.slug === slug);
    if (!entry) notFound();

    const labelMap = directoryLabelMap;

    // Build cross-section links to glossary
    const glossaryLinks: { href: string; label: string }[] = [];
    const gSlug = DIRECTORY_TO_GLOSSARY[entry.slug];
    if (gSlug) {
        const gEntry = glossary.find(g => g.slug === gSlug);
        if (gEntry) {
            glossaryLinks.push({
                href: `/learn/glossary/${gSlug}`,
                label: gEntry.term,
            });
        }
    }

    return (
        <>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'SoftwareApplication',
                    name: entry.name,
                    description: entry.shortDesc,
                    url: entry.url,
                    applicationCategory: 'DeveloperApplication',
                    operatingSystem: 'Cross-platform',
                    offers: {
                        '@type': 'Offer',
                        price: entry.pricing === 'paid' ? undefined : '0',
                        priceCurrency: 'USD',
                    },
                }}
            />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Learn', url: `${BASE}/learn` },
                    { name: 'Directory', url: `${BASE}/learn/directory` },
                    {
                        name: entry.name,
                        url: `${BASE}/learn/directory/${entry.slug}`,
                    },
                ]}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Directory', href: '/learn/directory' },
                    { label: entry.name },
                ]}
            />

            <div className='flex items-center gap-3 mb-1'>
                <h1 className='text-2xl font-bold tracking-tight'>
                    {entry.name}
                </h1>
                <CategoryBadge category={entry.category} />
            </div>

            <a
                href={entry.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6 inline-block'
            >
                {entry.url} &rarr;
            </a>

            <div className='mt-4'>
                <BodyText text={entry.body} />
            </div>

            {/* Features */}
            <div className='mt-8'>
                <h2 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3'>
                    Key Features
                </h2>
                <ul className='space-y-1.5'>
                    {entry.features.map((f, i) => (
                        <li
                            key={i}
                            className='text-sm text-zinc-400 flex items-start gap-2'
                        >
                            <span className='text-zinc-600 mt-0.5 shrink-0'>
                                &bull;
                            </span>
                            {f}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Pros & Cons */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-8'>
                <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-5'>
                    <h3 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3'>
                        Pros
                    </h3>
                    <ul className='space-y-1.5'>
                        {entry.pros.map((p, i) => (
                            <li
                                key={i}
                                className='text-sm text-zinc-400 flex items-start gap-2'
                            >
                                <span className='text-green-500/60 mt-0.5 shrink-0'>
                                    +
                                </span>
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-5'>
                    <h3 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3'>
                        Cons
                    </h3>
                    <ul className='space-y-1.5'>
                        {entry.cons.map((c, i) => (
                            <li
                                key={i}
                                className='text-sm text-zinc-400 flex items-start gap-2'
                            >
                                <span className='text-red-400/60 mt-0.5 shrink-0'>
                                    &minus;
                                </span>
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <RelatedLinks
                slugs={entry.related}
                basePath='/learn/directory'
                labelMap={labelMap}
            />

            <CrossSectionLinks
                sections={[
                    { title: 'In the Glossary', links: glossaryLinks },
                ]}
            />
        </>
    );
}
