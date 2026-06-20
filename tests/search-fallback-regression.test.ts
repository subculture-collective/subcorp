import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('web search fallback observability', () => {
    test('metrics include provider fallback counter', () => {
        const metrics = read('src/lib/metrics.ts');
        expect(metrics).toContain('subcorp_web_search_fallback_total');
        expect(metrics).toContain('incWebSearchFallback');
    });

    test('web search results expose provider provenance', () => {
        const webSearch = read('src/lib/tools/tools/web-search.ts');
        expect(webSearch).toContain('provider');
        expect(webSearch).toContain('fallback');
        expect(webSearch).toContain('degraded');
        expect(webSearch).toContain('confidence');
        expect(webSearch).toContain('incWebSearchFallback');
    });

    test('web search supports Exa and Tavily before degraded DuckDuckGo fallback', () => {
        const webSearch = read('src/lib/tools/tools/web-search.ts');
        expect(webSearch).toContain('EXA_API_KEY');
        expect(webSearch).toContain('TAVILY_API_KEY');
        expect(webSearch).toContain('https://api.exa.ai/search');
        expect(webSearch).toContain('https://api.tavily.com/search');
        expect(webSearch).toContain("'x-api-key': EXA_API_KEY");
        expect(webSearch).toContain("'Authorization': `Bearer ${TAVILY_API_KEY}`");
        expect(webSearch).toContain("['exa', Boolean(EXA_API_KEY)]");
        expect(webSearch).toContain("['tavily', Boolean(TAVILY_API_KEY)]");
        expect(webSearch).toContain("['brave', Boolean(BRAVE_API_KEY)]");
        expect(webSearch).toContain("provider: 'duckduckgo'");
    });

    test('web search applies Retry-After cooldowns for rate-limited providers', () => {
        const webSearch = read('src/lib/tools/tools/web-search.ts');
        expect(webSearch).toContain('fetchWithRetry');
        expect(webSearch).toContain('providerCooldownUntil');
        expect(webSearch).toContain('Retry-After');
        expect(webSearch).toContain("reason: 'cooldown'");
        expect(webSearch).toContain("'rate_limited'");
        expect(webSearch).toContain("'empty_results'");
    });
});
