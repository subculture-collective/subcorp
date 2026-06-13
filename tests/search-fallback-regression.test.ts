import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('web search fallback observability', () => {
    test('metrics include Brave to DuckDuckGo fallback counter', () => {
        const metrics = read('src/lib/metrics.ts');
        expect(metrics).toContain('subcorp_web_search_fallback_total');
        expect(metrics).toContain('incWebSearchFallback');
    });

    test('web search results expose provider provenance', () => {
        const webSearch = read('src/lib/tools/tools/web-search.ts');
        expect(webSearch).toContain('provider');
        expect(webSearch).toContain('fallback');
        expect(webSearch).toContain('incWebSearchFallback');
    });
});
