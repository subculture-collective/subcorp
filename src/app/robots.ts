import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/learn/', '/live', '/blog/', '/news/', '/privacy'],
                disallow: ['/stage', '/sanctum', '/api/'],
            },
        ],
        sitemap: 'https://subcorp.subcult.tv/sitemap.xml',
    };
}
