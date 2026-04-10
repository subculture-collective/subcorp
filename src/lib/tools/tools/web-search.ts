// web_search tool — Brave Search API with DuckDuckGo Instant Answer fallback
import type { NativeTool } from '../types';
import { ALL_AGENTS } from '@/lib/types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'web-search' });

const BRAVE_API_KEY = process.env.BRAVE_API_KEY ?? '';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const DDG_SEARCH_URL = 'https://api.duckduckgo.com/';

export const webSearchTool: NativeTool = {
    name: 'web_search',
    description:
        'Search the web using Brave Search (primary) with DuckDuckGo fallback. Returns titles, URLs, and descriptions of matching results.',
    agents: [...ALL_AGENTS],
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query',
            },
            count: {
                type: 'number',
                description: 'Number of results to return (default 5, max 20)',
            },
        },
        required: ['query'],
    },
    execute: async (params) => {
        const query = params.query as string;
        const count = Math.min((params.count as number) || 5, 20);

        // ─── Try Brave first ───
        if (BRAVE_API_KEY) {
            try {
                const url = new URL(BRAVE_SEARCH_URL);
                url.searchParams.set('q', query);
                url.searchParams.set('count', String(count));

                const response = await fetch(url.toString(), {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip',
                        'X-Subscription-Token': BRAVE_API_KEY,
                    },
                    signal: AbortSignal.timeout(15_000),
                });

                if (response.status === 429) {
                    log.warn('Brave Search rate-limited, falling back to DuckDuckGo', { query });
                } else if (response.ok) {
                    const data = await response.json() as {
                        web?: { results?: Array<{ title: string; url: string; description: string }> };
                    };

                    const results = (data.web?.results ?? []).map(r => ({
                        title: r.title,
                        url: r.url,
                        description: r.description,
                    }));

                    return { results, query, count: results.length, source: 'brave' };
                } else {
                    log.warn('Brave Search error, falling back to DuckDuckGo', {
                        status: response.status,
                        query,
                    });
                }
            } catch (err) {
                log.warn('Brave Search failed, falling back to DuckDuckGo', {
                    error: (err as Error).message,
                    query,
                });
            }
        }

        // ─── Fallback: DuckDuckGo Instant Answer API (no key required) ───
        try {
            const url = new URL(DDG_SEARCH_URL);
            url.searchParams.set('q', query);
            url.searchParams.set('format', 'json');
            url.searchParams.set('no_redirect', '1');
            url.searchParams.set('t', 'subcult');

            const response = await fetch(url.toString(), {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(15_000),
            });

            if (!response.ok) {
                return { error: `Both Brave and DuckDuckGo search failed. DuckDuckGo returned ${response.status}.` };
            }

            const data = await response.json() as {
                RelatedTopics?: Array<{ Text: string; FirstURL: string; Icon?: { URL: string } }>;
                Results?: Array<{ Text: string; FirstURL: string }>;
            };

            const rawResults = [
                ...(data.Results ?? []),
                ...(data.RelatedTopics ?? []).filter(t => t.FirstURL),
            ];

            const results = rawResults.slice(0, count).map(r => {
                const description = r.Text ?? '';
                return {
                    title: description.replace(/^https?:\/\/\S+\s*/i, '').trim() || description,
                    url: r.FirstURL ?? '',
                    description,
                };
            });

            if (results.length === 0) {
                return { results: [], query, count: 0, source: 'ddg' };
            }

            return { results, query, count: results.length, source: 'ddg' };
        } catch (err) {
            log.error('DuckDuckGo fallback also failed', { error: err, query });
            return { error: `Search failed: ${(err as Error).message}` };
        }
    },
};
