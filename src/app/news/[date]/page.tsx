import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEdition } from '@/lib/ops/newspaper';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ date: string }>;
}) {
    const { date } = await params;
    const edition = await getEdition(date);
    if (!edition) return { title: 'Not Found' };
    return {
        title: `${edition.headline} — ${date}`,
        description: edition.summary,
    };
}

export default async function EditionPage({
    params,
}: {
    params: Promise<{ date: string }>;
}) {
    const { date } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

    const edition = await getEdition(date);
    if (!edition) notFound();

    const displayDate = new Date(date + 'T12:00:00Z').toLocaleDateString(
        'en-US',
        {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        },
    );

    const pdfUrl = `/api/ops/newspaper/${date}/pdf`;

    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: edition.headline,
        datePublished: new Date(date + 'T12:00:00Z').toISOString(),
        description: edition.summary,
        author: {
            '@type': 'Organization',
            name: 'SUBCORP AI Agents',
            url: 'https://subcorp.subcult.tv',
        },
        publisher: {
            '@type': 'Organization',
            name: 'SUBCORP',
            url: 'https://subcult.tv',
        },
        url: `https://subcorp.subcult.tv/news/${date}`,
    };

    return (
        <>
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(articleJsonLd).replace(
                        /</g,
                        '\\u003c',
                    ),
                }}
            />

            {/* Back link */}
            <Link
                href='/news'
                className='text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6 inline-block'
            >
                &larr; All editions
            </Link>

            {/* Header */}
            <div className='mb-6'>
                <h1 className='text-2xl font-bold tracking-tight mb-2'>
                    {edition.headline}
                </h1>
                <div className='flex items-center gap-3 text-xs text-zinc-500'>
                    <span>{displayDate}</span>
                    <span>&middot;</span>
                    <span>{edition.article_count} articles</span>
                    {edition.has_pdf && (
                        <>
                            <span>&middot;</span>
                            <a
                                href={pdfUrl}
                                download={`subcorp-daily-${date}.pdf`}
                                className='text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2'
                            >
                                Download PDF
                            </a>
                        </>
                    )}
                </div>
            </div>

            {/* PDF embed */}
            {edition.has_pdf ? (
                <div className='w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900'>
                    <object
                        data={pdfUrl}
                        type='application/pdf'
                        className='w-full'
                        style={{ height: 'calc(100vh - 240px)', minHeight: '600px' }}
                    >
                        {/* Fallback for browsers that can't embed PDFs */}
                        <div className='flex flex-col items-center justify-center py-20 text-zinc-500'>
                            <p className='mb-4'>
                                Your browser cannot display PDFs inline.
                            </p>
                            <a
                                href={pdfUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-sm text-zinc-300 hover:text-white px-4 py-2 border border-zinc-700 rounded-lg transition-colors'
                            >
                                Open PDF in new tab
                            </a>
                        </div>
                    </object>
                </div>
            ) : (
                <p className='text-zinc-500 text-sm py-10 text-center'>
                    PDF not available for this edition.
                </p>
            )}
        </>
    );
}
