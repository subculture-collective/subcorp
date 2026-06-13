import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { comparisons, comparisonLabelMap } from '@/data/learn/comparisons';
import { glossary } from '@/data/learn/glossary';
import { directory } from '@/data/learn/directory';
import {
    Breadcrumbs,
    BreadcrumbJsonLd,
    BodyText,
    ComparisonTable,
    RelatedLinks,
    CrossSectionLinks,
    JsonLd,
} from '../../components';

const BASE = 'https://subcorp.subcult.tv';

export function generateStaticParams() {
    return comparisons.map(e => ({ slug: e.slug }));
}

export async function generateMetadata(props: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await props.params;
    const entry = comparisons.find(e => e.slug === slug);
    if (!entry) return {};
    return {
        title: entry.title,
        description: entry.shortDesc,
    };
}

// Map comparison side names to glossary/directory slugs
const TERM_TO_GLOSSARY: Record<string, string> = {
    claude: 'tool-use',
    openai: 'function-calling',
    langchain: 'agent-orchestration',
    autogen: 'multi-agent-system',
    openclaw: 'openclaw',
    openrouter: 'openrouter',
    ollama: 'ollama',
};

const TERM_TO_DIRECTORY: Record<string, string> = {
    claude: 'claude',
    openai: 'openai-gpt',
    langchain: 'langchain',
    autogen: 'autogen',
    openclaw: 'openclaw',
    openrouter: 'openrouter',
    ollama: 'ollama',
    crewai: 'crewai',
};

function buildCrossSectionLinks(entry: (typeof comparisons)[number]) {
    const glossaryLinks: { href: string; label: string }[] = [];
    const directoryLinks: { href: string; label: string }[] = [];

    // Extract keywords from side names
    const sideNames = [entry.sideA.name, entry.sideB.name]
        .join(' ')
        .toLowerCase();

    for (const [keyword, slug] of Object.entries(TERM_TO_GLOSSARY)) {
        if (sideNames.includes(keyword)) {
            const gEntry = glossary.find(g => g.slug === slug);
            if (gEntry) {
                glossaryLinks.push({
                    href: `/learn/glossary/${slug}`,
                    label: gEntry.term,
                });
            }
        }
    }

    for (const [keyword, slug] of Object.entries(TERM_TO_DIRECTORY)) {
        if (sideNames.includes(keyword)) {
            const dEntry = directory.find(d => d.slug === slug);
            if (dEntry) {
                directoryLinks.push({
                    href: `/learn/directory/${slug}`,
                    label: dEntry.name,
                });
            }
        }
    }

    return { glossaryLinks, directoryLinks };
}

export default async function CompareDetail(props: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await props.params;
    const entry = comparisons.find(e => e.slug === slug);
    if (!entry) notFound();

    const labelMap = comparisonLabelMap;

    const { glossaryLinks, directoryLinks } = buildCrossSectionLinks(entry);

    const faqLd = {
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
    };

    return (
        <>
            <JsonLd data={faqLd} />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Learn', url: `${BASE}/learn` },
                    { name: 'Comparisons', url: `${BASE}/learn/compare` },
                    {
                        name: entry.title,
                        url: `${BASE}/learn/compare/${entry.slug}`,
                    },
                ]}
            />

            <Breadcrumbs
                items={[
                    { label: 'Learn', href: '/learn' },
                    { label: 'Comparisons', href: '/learn/compare' },
                    { label: entry.title },
                ]}
            />

            <h1 className='text-2xl font-bold tracking-tight mb-4'>
                {entry.title}
            </h1>

            <BodyText text={entry.body} />

            <ComparisonTable sideA={entry.sideA} sideB={entry.sideB} />

            {/* Verdict */}
            <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 my-8'>
                <h2 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2'>
                    Verdict
                </h2>
                <p className='text-sm text-zinc-300 leading-relaxed'>
                    {entry.verdict}
                </p>
            </div>

            {/* FAQs */}
            <section className='mt-10'>
                <h2 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4'>
                    Frequently Asked Questions
                </h2>
                <div className='space-y-4'>
                    {entry.faqs.map((faq, i) => (
                        <div key={i}>
                            <h3 className='text-sm font-semibold text-zinc-200 mb-1'>
                                {faq.question}
                            </h3>
                            <p className='text-sm text-zinc-400 leading-relaxed'>
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <RelatedLinks
                slugs={entry.related}
                basePath='/learn/compare'
                labelMap={labelMap}
            />

            <CrossSectionLinks
                sections={[
                    { title: 'In the Glossary', links: glossaryLinks },
                    { title: 'In the Directory', links: directoryLinks },
                ]}
            />
        </>
    );
}
