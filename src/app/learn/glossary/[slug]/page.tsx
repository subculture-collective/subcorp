import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { glossary, glossaryLabelMap } from '@/data/learn/glossary';
import { directory } from '@/data/learn/directory';
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
    return glossary.map(e => ({ slug: e.slug }));
}

export async function generateMetadata(props: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await props.params;
    const entry = glossary.find(e => e.slug === slug);
    if (!entry) return {};
    return {
        title: `${entry.term} — AI Agent Glossary`,
        description: entry.shortDef,
    };
}

// Map glossary slugs that have a matching directory entry
const GLOSSARY_TO_DIRECTORY: Record<string, string> = {
    openclaw: 'openclaw',
    openrouter: 'openrouter',
    ollama: 'ollama',
    'mcp-protocol': 'anthropic-mcp',
};

export default async function GlossaryDetail(props: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await props.params;
    const entry = glossary.find(e => e.slug === slug);
    if (!entry) notFound();

    const labelMap = glossaryLabelMap;

    // Build cross-section links to directory
    const directoryLinks: { href: string; label: string }[] = [];
    // Check if this glossary entry has a matching directory entry
    const dirSlug = GLOSSARY_TO_DIRECTORY[entry.slug];
    if (dirSlug) {
        const dirEntry = directory.find(d => d.slug === dirSlug);
        if (dirEntry) {
            directoryLinks.push({
                href: `/learn/directory/${dirSlug}`,
                label: dirEntry.name,
            });
        }
    }
    // Check related slugs for directory matches
    for (const rel of entry.related) {
        const relDirSlug = GLOSSARY_TO_DIRECTORY[rel];
        if (relDirSlug && relDirSlug !== dirSlug) {
            const dirEntry = directory.find(d => d.slug === relDirSlug);
            if (dirEntry) {
                directoryLinks.push({
                    href: `/learn/directory/${relDirSlug}`,
                    label: dirEntry.name,
                });
            }
        }
    }

    return (
        <>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'DefinedTerm',
                    name: entry.term,
                    description: entry.shortDef,
                    url: `${BASE}/learn/glossary/${entry.slug}`,
                    inDefinedTermSet: {
                        '@type': 'DefinedTermSet',
                        name: 'SUBCORP AI Agent Glossary',
                        url: `${BASE}/learn/glossary`,
                    },
                }}
            />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Learn', url: `${BASE}/learn` },
                    { name: 'Glossary', url: `${BASE}/learn/glossary` },
                    {
                        name: entry.term,
                        url: `${BASE}/learn/glossary/${entry.slug}`,
                    },
                ]}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Glossary', href: '/learn/glossary' },
                    { label: entry.term },
                ]}
            />

            <div className='flex items-center gap-3 mb-4'>
                <h1 className='text-2xl font-bold tracking-tight'>
                    {entry.term}
                </h1>
                <CategoryBadge category={entry.category} />
            </div>

            <p className='text-sm text-zinc-300 mb-8 leading-relaxed'>
                {entry.shortDef}
            </p>

            <BodyText text={entry.body} />

            <RelatedLinks
                slugs={entry.related}
                basePath='/learn/glossary'
                labelMap={labelMap}
            />

            <CrossSectionLinks
                sections={[
                    { title: 'In the Directory', links: directoryLinks },
                ]}
            />
        </>
    );
}
