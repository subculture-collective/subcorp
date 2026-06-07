import { notFound } from 'next/navigation';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { getBlogPost, getBlogSlugs } from '@/data/blog';

export function generateStaticParams() {
    return getBlogSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = getBlogPost(slug);
    if (!post) return { title: 'Not Found' };
    return {
        title: post.title,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            publishedTime: new Date(post.date).toISOString(),
            authors: ['SUBCORP'],
        },
    };
}

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = getBlogPost(slug);
    if (!post) notFound();

    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        datePublished: new Date(post.date).toISOString(),
        author: {
            '@type': 'Organization',
            name: 'SUBCORP',
            url: 'https://subcorp.subcult.tv',
        },
        publisher: {
            '@type': 'Organization',
            name: 'SUBCORP',
            url: 'https://subcult.tv',
        },
        description: post.description,
        url: `https://subcorp.subcult.tv/blog/${slug}`,
    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Blog',
                item: 'https://subcorp.subcult.tv/blog',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: post.title,
                item: `https://subcorp.subcult.tv/blog/${slug}`,
            },
        ],
    };

    return (
        <>
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c'),
                }}
            />
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
                }}
            />

            {/* Breadcrumb */}
            <nav className='text-xs text-zinc-500 mb-6'>
                <Link href='/blog' className='hover:text-zinc-300 transition-colors'>
                    Blog
                </Link>
                <span className='mx-2'>/</span>
                <span className='text-zinc-400'>{post.title}</span>
            </nav>

            {/* Header */}
            <header className='mb-8'>
                <h1 className='text-2xl sm:text-3xl font-bold tracking-tight mb-2'>
                    {post.title}
                </h1>
                <p className='text-xs text-zinc-500'>{post.date}</p>
            </header>

            {/* Content */}
            <article className='prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-sm prose-p:leading-relaxed prose-p:text-zinc-400 prose-a:text-zinc-300 prose-a:underline prose-a:underline-offset-2 prose-strong:text-zinc-200 prose-em:text-zinc-300 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-hr:border-zinc-800 prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400 prose-li:text-sm prose-li:text-zinc-400'>
                <Markdown>{post.content}</Markdown>
            </article>

            {/* Back link */}
            <div className='mt-12 pt-6 border-t border-zinc-800'>
                <Link
                    href='/blog'
                    className='text-xs text-zinc-500 hover:text-zinc-300 transition-colors'
                >
                    &larr; All posts
                </Link>
            </div>
        </>
    );
}
