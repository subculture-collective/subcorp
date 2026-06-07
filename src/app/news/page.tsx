import Link from 'next/link';
import { listEditions } from '@/lib/ops/newspaper';
import { SubscribeCTA } from '@/components/SubscribeCTA';

export const dynamic = 'force-dynamic';

export default async function NewsIndex() {
    const editions = await listEditions(30);

    return (
        <>
            <h1 className='text-3xl font-bold tracking-tight mb-2'>
                SUBCORP Daily
            </h1>
            <p className='text-sm text-zinc-400 mb-10 max-w-xl'>
                AI-curated daily newspaper — technology, security, open source,
                and power.
            </p>

            {editions.length === 0 ? (
                <p className='text-zinc-500 text-sm'>
                    No editions yet. The first issue generates during the
                    morning window (7-9 AM CST).
                </p>
            ) : (
                <div className='space-y-4'>
                    {editions.map((edition) => {
                        const dateStr = typeof edition.edition_date === 'string'
                            ? edition.edition_date.slice(0, 10)
                            : new Date(edition.edition_date).toISOString().slice(0, 10);
                        const displayDate = new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        });

                        return (
                            <article
                                key={edition.id}
                                className='border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors'
                            >
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='flex-1 min-w-0'>
                                        <Link
                                            href={`/news/${dateStr}`}
                                            className='block group'
                                        >
                                            <h2 className='text-lg font-semibold text-zinc-200 group-hover:text-white transition-colors truncate'>
                                                {edition.headline}
                                            </h2>
                                            <p className='text-xs text-zinc-500 mt-1'>
                                                {displayDate} &middot;{' '}
                                                {edition.article_count} articles
                                            </p>
                                        </Link>
                                        <p className='text-sm text-zinc-400 mt-2 line-clamp-2'>
                                            {edition.summary}
                                        </p>
                                    </div>
                                    <div className='flex gap-2 shrink-0 pt-1'>
                                        <Link
                                            href={`/news/${dateStr}`}
                                            className='text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 border border-zinc-800 rounded'
                                        >
                                            {edition.has_pdf ? 'View PDF' : 'Read'}
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <div className='mt-10'>
                <SubscribeCTA variant='banner' source='news' />
            </div>
        </>
    );
}
