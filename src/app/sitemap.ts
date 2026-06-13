import type { MetadataRoute } from 'next';
import { glossary } from '@/data/learn/glossary';
import { comparisons } from '@/data/learn/comparisons';
import { directory } from '@/data/learn/directory';
import { alternatives } from '@/data/learn/alternatives';
import { getBlogPosts } from '@/data/blog';

const BASE = 'https://subcorp.subcult.tv';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
        { url: `${BASE}/live`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
        { url: `${BASE}/learn`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${BASE}/learn/glossary`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE}/learn/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE}/learn/directory`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE}/learn/alternatives`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${BASE}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: `${BASE}/privacy`, lastModified: new Date('2026-02-16'), changeFrequency: 'yearly', priority: 0.3 },
    ];

    const glossaryPages: MetadataRoute.Sitemap = glossary.map(e => ({
        url: `${BASE}/learn/glossary/${e.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    const comparisonPages: MetadataRoute.Sitemap = comparisons.map(e => ({
        url: `${BASE}/learn/compare/${e.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    const directoryPages: MetadataRoute.Sitemap = directory.map(e => ({
        url: `${BASE}/learn/directory/${e.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    const blogPages: MetadataRoute.Sitemap = getBlogPosts().map(p => ({
        url: `${BASE}/blog/${p.slug}`,
        lastModified: new Date(p.date),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    const alternativesPages: MetadataRoute.Sitemap = alternatives.map(e => ({
        url: `${BASE}/learn/alternatives/${e.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    return [
        ...staticPages,
        ...glossaryPages,
        ...comparisonPages,
        ...directoryPages,
        ...alternativesPages,
        ...blogPages,
    ];
}
