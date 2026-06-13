import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { alternatives, alternativesLabelMap } from '@/data/learn/alternatives';
import { directoryLabelMap } from '@/data/learn/directory';
import {
    Breadcrumbs,
    BreadcrumbJsonLd,
    BodyText,
    RelatedLinks,
    CrossSectionLinks,
    JsonLd,
} from '../../components';

const BASE = 'https://subcorp.subcult.tv';

export function generateStaticParams() {
    return alternatives.map(e => ({ slug: e.slug }));
}

export async function generateMetadata(props: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await props.params;
    const entry = alternatives.find(e => e.slug === slug);
    if (!entry) return {};
    return {
        title: `${entry.name} Alternatives — Best AI Agent Tools`,
        description: entry.shortDesc,
    };
}

export default async function AlternativesDetail(props: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await props.params;
    const entry = alternatives.find(e => e.slug === slug);
    if (!entry) notFound();

    // Cross-links to directory entries for each alternative
    const directoryLinks = entry.alternatives
        .filter(a => directoryLabelMap[a.slug])
        .map(a => ({
            href: `/learn/directory/${a.slug}`,
            label: directoryLabelMap[a.slug],
        }));

    return (
        <>
            {/* ItemList JSON-LD for alternatives */}
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: `${entry.name} Alternatives`,
                    description: entry.shortDesc,
                    numberOfItems: entry.alternatives.length,
                    itemListElement: entry.alternatives.map((alt, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: alt.name,
                        url: `${BASE}/learn/directory/${alt.slug}`,
                    })),
                }}
            />

            {/* FAQ JSON-LD */}
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: entry.faqs.map(faq => ({
                        '@type': 'Question',
                        name: faq.question,
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: faq.answer,
                        },
                    })),
                }}
            />

            <BreadcrumbJsonLd
                items={[
                    { name: 'Learn', url: `${BASE}/learn` },
                    { name: 'Alternatives', url: `${BASE}/learn/alternatives` },
                    {
                        name: `${entry.name} Alternatives`,
                        url: `${BASE}/learn/alternatives/${entry.slug}`,
                    },
                ]}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Alternatives', href: '/learn/alternatives' },
                    { label: `${entry.name} Alternatives` },
                ]}
            />

            <h1 className='text-2xl font-bold tracking-tight mb-2'>
                {entry.name} Alternatives
            </h1>
            <p className='text-sm text-zinc-400 mb-6'>
                Best alternatives to {entry.name} for building AI agent systems
            </p>

            <BodyText text={entry.body} />

            {/* Alternatives list */}
            <div className='mt-8 space-y-4'>
                <h2 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3'>
                    Top Alternatives
                </h2>
                {entry.alternatives.map((alt, i) => (
                    <div
                        key={alt.slug}
                        className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-5'
                    >
                        <div className='flex items-center gap-3 mb-2'>
                            <span className='text-xs text-zinc-600 font-mono'>
                                {i + 1}.
                            </span>
                            {directoryLabelMap[alt.slug] ? (
                                <Link
                                    href={`/learn/directory/${alt.slug}`}
                                    className='text-sm font-semibold text-zinc-200 hover:text-white transition-colors'
                                >
                                    {alt.name} &rarr;
                                </Link>
                            ) : (
                                <span className='text-sm font-semibold text-zinc-200'>
                                    {alt.name}
                                </span>
                            )}
                        </div>
                        <p className='text-sm text-zinc-400 leading-relaxed'>
                            {alt.reason}
                        </p>
                    </div>
                ))}
            </div>

            {/* FAQs */}
            <div className='mt-10'>
                <h2 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4'>
                    Frequently Asked Questions
                </h2>
                <div className='space-y-6'>
                    {entry.faqs.map((faq, i) => (
                        <div key={i}>
                            <h3 className='text-sm font-semibold text-zinc-200 mb-2'>
                                {faq.question}
                            </h3>
                            <p className='text-sm text-zinc-400 leading-relaxed'>
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <RelatedLinks
                slugs={entry.related}
                basePath='/learn/alternatives'
                labelMap={alternativesLabelMap}
            />

            <CrossSectionLinks
                sections={[
                    { title: 'In the Directory', links: directoryLinks },
                ]}
            />
        </>
    );
}
