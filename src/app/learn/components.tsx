import Link from 'next/link';

/* ── Breadcrumbs ── */
export function Breadcrumbs({
    items,
}: {
    items: { label: string; href?: string }[];
}) {
    return (
        <nav
            aria-label='Breadcrumb'
            className='text-xs text-zinc-500 flex items-center gap-1.5 mb-6'
        >
            {items.map((item, i) => (
                <span key={i} className='flex items-center gap-1.5'>
                    {i > 0 && <span className='text-zinc-700'>/</span>}
                    {item.href ? (
                        <Link
                            href={item.href}
                            className='hover:text-zinc-300 transition-colors'
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className='text-zinc-400'>{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}

/* ── Related Links ── */
export function RelatedLinks({
    slugs,
    basePath,
    labelMap,
}: {
    slugs: string[];
    basePath: string;
    labelMap: Record<string, string>;
}) {
    const valid = slugs.filter(s => labelMap[s]);
    if (valid.length === 0) return null;
    return (
        <div className='mt-10 pt-6 border-t border-zinc-800'>
            <h3 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3'>
                Related
            </h3>
            <div className='flex flex-wrap gap-2'>
                {valid.map(slug => (
                    <Link
                        key={slug}
                        href={`${basePath}/${slug}`}
                        className='rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors'
                    >
                        {labelMap[slug]}
                    </Link>
                ))}
            </div>
        </div>
    );
}

/* ── Playbook Card (for hub page) ── */
export function PlaybookCard({
    href,
    title,
    description,
    count,
    countLabel,
}: {
    href: string;
    title: string;
    description: string;
    count: number;
    countLabel: string;
}) {
    return (
        <Link
            href={href}
            className='group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg hover:border-zinc-700 transition-colors block'
        >
            <h2 className='text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors'>
                {title}
            </h2>
            <p className='text-sm text-zinc-400 mt-2 leading-relaxed'>
                {description}
            </p>
            <div className='mt-4 text-[10px] uppercase tracking-[0.2em] text-zinc-600'>
                {count} {countLabel}
            </div>
        </Link>
    );
}

/* ── Comparison Table ── */
export function ComparisonTable({
    sideA,
    sideB,
}: {
    sideA: { name: string; points: string[] };
    sideB: { name: string; points: string[] };
}) {
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 my-8'>
            {[sideA, sideB].map(side => (
                <div
                    key={side.name}
                    className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-5'
                >
                    <h3 className='text-sm font-semibold text-zinc-200 mb-3'>
                        {side.name}
                    </h3>
                    <ul className='space-y-2'>
                        {side.points.map((point, i) => (
                            <li
                                key={i}
                                className='text-sm text-zinc-400 flex items-start gap-2'
                            >
                                <span className='text-zinc-600 mt-0.5 shrink-0'>
                                    &bull;
                                </span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

/* ── JSON-LD Script ── */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type='application/ld+json'
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, '\\u003c'),
            }}
        />
    );
}

/* ── Body Text Renderer ── */
export function BodyText({ text }: { text: string }) {
    return (
        <div className='space-y-4'>
            {text.split('\n\n').map((para, i) => (
                <p key={i} className='text-sm text-zinc-400 leading-relaxed'>
                    {para}
                </p>
            ))}
        </div>
    );
}

/* ── Category Badge ── */
export function CategoryBadge({ category }: { category: string }) {
    return (
        <span className='inline-block rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500'>
            {category}
        </span>
    );
}

/* ── Cross-Section Links (glossary ↔ directory ↔ compare) ── */
export function CrossSectionLinks({
    sections,
}: {
    sections: { title: string; links: { href: string; label: string }[] }[];
}) {
    const nonEmpty = sections.filter(s => s.links.length > 0);
    if (nonEmpty.length === 0) return null;
    return (
        <div className='mt-6 pt-6 border-t border-zinc-800'>
            {nonEmpty.map(section => (
                <div key={section.title} className='mb-4 last:mb-0'>
                    <h3 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2'>
                        {section.title}
                    </h3>
                    <div className='flex flex-wrap gap-2'>
                        {section.links.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className='rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors'
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Breadcrumb JSON-LD ── */
export function BreadcrumbJsonLd({
    items,
}: {
    items: { name: string; url: string }[];
}) {
    return (
        <JsonLd
            data={{
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: items.map((item, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: item.name,
                    item: item.url,
                })),
            }}
        />
    );
}

/* ── ItemList JSON-LD (for index pages) ── */
export function ItemListJsonLd({
    name,
    items,
}: {
    name: string;
    items: { url: string; name: string }[];
}) {
    return (
        <JsonLd
            data={{
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name,
                numberOfItems: items.length,
                itemListElement: items.map((item, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    url: item.url,
                    name: item.name,
                })),
            }}
        />
    );
}
