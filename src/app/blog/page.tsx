import Link from 'next/link';
import { getBlogPosts } from '@/data/blog';

export const dynamic = 'force-dynamic';

const blogListJsonLd = (posts: { slug: string; title: string; date: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SUBCORP Blog — Autonomous AI Agent Systems',
    numberOfItems: posts.length,
    itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://subcorp.subcult.tv/blog/${p.slug}`,
        name: p.title,
    })),
});

export default function BlogIndex() {
    const posts = getBlogPosts();

    return (
        <>
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(blogListJsonLd(posts)).replace(/</g, '\\u003c'),
                }}
            />

            <h1 className='text-3xl font-bold tracking-tight mb-2'>Blog</h1>
            <p className='text-sm text-zinc-400 mb-10 max-w-xl'>
                Building autonomous AI agent systems — multi-agent coordination,
                orchestration, tool design, and running an AI collective in
                production.
            </p>

            <div className='space-y-6'>
                {posts.map(post => (
                    <article
                        key={post.slug}
                        className='border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors'
                    >
                        <Link href={`/blog/${post.slug}`} className='block group'>
                            <h2 className='text-lg font-semibold text-zinc-200 group-hover:text-white transition-colors'>
                                {post.title}
                            </h2>
                            <p className='text-xs text-zinc-500 mt-1'>
                                {post.date}
                            </p>
                            <p className='text-sm text-zinc-400 mt-2 line-clamp-2'>
                                {post.description}
                            </p>
                        </Link>
                    </article>
                ))}
            </div>
        </>
    );
}
