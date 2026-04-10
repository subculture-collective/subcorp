import fs from 'fs';
import path from 'path';

export interface BlogPost {
    slug: string;
    title: string;
    date: string;
    content: string; // raw markdown body (after title/date/hr)
    description: string; // first paragraph
}

const BLOG_DIR = '/workspace/output/blog';

function parseBlogPost(filename: string): BlogPost {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
    const lines = raw.split('\n');

    // Format: # Title\n\n_Date_\n\n---\n\nContent
    const title = (lines[0] || '').replace(/^#\s+/, '');
    const dateLine = lines.find(l => /^_.*_$/.test(l.trim())) || '';
    const date = dateLine.replace(/^_/, '').replace(/_$/, '').trim();

    // Find the first --- separator and take everything after it
    const hrIndex = lines.findIndex((l, i) => i > 0 && /^---\s*$/.test(l.trim()));
    const content = hrIndex >= 0 ? lines.slice(hrIndex + 1).join('\n').trim() : raw;

    // First paragraph as description
    const paragraphs = content.split(/\n\n+/);
    const firstPara = paragraphs.find(p => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('---'));
    const description = (firstPara || '').replace(/\n/g, ' ').trim().slice(0, 200);

    return { slug, title, date, content, description };
}

let _cache: BlogPost[] | null = null;

export function getBlogPosts(): BlogPost[] {
    if (_cache) return _cache;
    if (!fs.existsSync(BLOG_DIR)) return [];
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md')).sort();
    _cache = files.map(parseBlogPost);
    return _cache;
}

export function getBlogPost(slug: string): BlogPost | undefined {
    return getBlogPosts().find(p => p.slug === slug);
}

export function getBlogSlugs(): string[] {
    return getBlogPosts().map(p => p.slug);
}
