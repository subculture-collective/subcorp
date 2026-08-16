// web_search tool — Exa/Tavily primary search with Brave and DuckDuckGo fallback
import type { NativeTool } from '../types';
import { ALL_AGENTS } from '@/lib/types';
import { logger } from '@/lib/logger';
import { incWebSearchFallback } from '@/lib/metrics';
import { fetchWithRetry } from '@/lib/net/fetch-with-retry';

const log = logger.child({ module: 'web-search' });

const EXA_API_KEY = process.env.EXA_API_KEY ?? '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? '';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY ?? '';

const EXA_SEARCH_URL = 'https://api.exa.ai/search';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const DDG_SEARCH_URL = 'https://api.duckduckgo.com/';

type SearchProvider = 'exa' | 'tavily' | 'brave' | 'duckduckgo';
type FallbackReason = 'rate_limited' | 'error' | 'exception' | 'missing_key' | 'cooldown' | 'empty_results';

interface SearchResult {
    title: string;
    url: string;
    description: string;
}

interface ProviderFailure {
    provider: Exclude<SearchProvider, 'duckduckgo'>;
    reason: FallbackReason;
}

const providerCooldownUntil = new Map<SearchProvider, number>();

function isCoolingDown(provider: SearchProvider): boolean {
    return (providerCooldownUntil.get(provider) ?? 0) > Date.now();
}

function setCooldown(provider: SearchProvider, response?: Response): void {
    const retryAfter = response?.headers.get('Retry-After');
    const retryAfterSeconds = retryAfter ? Number.parseFloat(retryAfter) : NaN;
    const cooldownMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
        ? retryAfterSeconds * 1000
        : 60_000;

    providerCooldownUntil.set(provider, Date.now() + cooldownMs);
}

function recordFallback(fromProvider: ProviderFailure['provider'], toProvider: SearchProvider, reason: FallbackReason): void {
    incWebSearchFallback({ fromProvider, toProvider, reason });
}

function failurePayload(failures: ProviderFailure[]): ProviderFailure | ProviderFailure[] | null {
    if (failures.length === 0) return null;
    if (failures.length === 1) return failures[0];
    return failures;
}

async function searchExa(query: string, count: number): Promise<SearchResult[]> {
    const response = await fetchWithRetry(EXA_SEARCH_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': EXA_API_KEY,
        },
        body: JSON.stringify({
            query,
            numResults: count,
            type: 'auto',
            contents: {
                text: true,
                highlights: true,
            },
        }),
        label: 'exa search',
        totalTimeoutMs: 15_000,
        maxRetries: 1,
    });

    if (response.status === 429) {
        setCooldown('exa', response);
        throw new Error('rate_limited');
    }

    if (!response.ok) {
        throw new Error(`Exa returned ${response.status}`);
    }

    const data = await response.json() as {
        results?: Array<{ title?: string; url?: string; text?: string; highlights?: string[] }>;
    };

    return (data.results ?? []).slice(0, count).map(result => ({
        title: result.title || result.url || 'Untitled result',
        url: result.url || '',
        description: result.text || result.highlights?.join(' ') || '',
    })).filter(result => result.url);
}

async function searchTavily(query: string, count: number): Promise<SearchResult[]> {
    const response = await fetchWithRetry(TAVILY_SEARCH_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
            query,
            max_results: count,
            search_depth: 'basic',
        }),
        label: 'tavily search',
        totalTimeoutMs: 15_000,
        maxRetries: 1,
    });

    if (response.status === 429) {
        setCooldown('tavily', response);
        throw new Error('rate_limited');
    }

    if (!response.ok) {
        throw new Error(`Tavily returned ${response.status}`);
    }

    const data = await response.json() as {
        results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    return (data.results ?? []).slice(0, count).map(result => ({
        title: result.title || result.url || 'Untitled result',
        url: result.url || '',
        description: result.content || '',
    })).filter(result => result.url);
}

async function searchBrave(query: string, count: number): Promise<SearchResult[]> {
    const url = new URL(BRAVE_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(count));

    const response = await fetchWithRetry(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': BRAVE_API_KEY,
        },
        label: 'brave search',
        totalTimeoutMs: 15_000,
        maxRetries: 1,
    });

    if (response.status === 429) {
        setCooldown('brave', response);
        throw new Error('rate_limited');
    }

    if (!response.ok) {
        throw new Error(`Brave returned ${response.status}`);
    }

    const data = await response.json() as {
        web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };

    return (data.web?.results ?? []).slice(0, count).map(result => ({
        title: result.title || result.url || 'Untitled result',
        url: result.url || '',
        description: result.description || '',
    })).filter(result => result.url);
}

async function searchDuckDuckGo(query: string, count: number): Promise<SearchResult[]> {
    const url = new URL(DDG_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_redirect', '1');
    url.searchParams.set('t', 'subcorp');

    const response = await fetchWithRetry(url.toString(), {
        headers: { 'Accept': 'application/json' },
        label: 'duckduckgo search',
        totalTimeoutMs: 15_000,
        maxRetries: 1,
    });

    if (!response.ok) {
        throw new Error(`DuckDuckGo returned ${response.status}`);
    }

    const data = await response.json() as {
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
        Results?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const rawResults = [
        ...(data.Results ?? []),
        ...(data.RelatedTopics ?? []).filter(topic => topic.FirstURL),
    ];

    return rawResults.slice(0, count).map(result => {
        const description = result.Text ?? '';
        return {
            title: description.replace(/^https?:\/\/\S+\s*/i, '').trim() || description || result.FirstURL || 'Untitled result',
            url: result.FirstURL ?? '',
            description,
        };
    }).filter(result => result.url);
}

async function tryProvider(
    provider: Exclude<SearchProvider, 'duckduckgo'>,
    hasKey: boolean,
    query: string,
    count: number,
): Promise<{ results: SearchResult[]; provider: SearchProvider } | { failure: ProviderFailure }> {
    if (!hasKey) {
        return { failure: { provider, reason: 'missing_key' } };
    }

    if (isCoolingDown(provider)) {
        return { failure: { provider, reason: 'cooldown' } };
    }

    try {
        const results = provider === 'exa'
            ? await searchExa(query, count)
            : provider === 'tavily'
                ? await searchTavily(query, count)
                : await searchBrave(query, count);

        if (results.length === 0) {
            return { failure: { provider, reason: 'empty_results' } };
        }

        return { results, provider };
    } catch (err) {
        const reason = (err as Error).message === 'rate_limited' ? 'rate_limited' : 'exception';
        log.warn(`${provider} search failed, trying next provider`, {
            provider,
            reason,
            error: (err as Error).message,
            query,
        });
        return { failure: { provider, reason } };
    }
}

export const webSearchTool: NativeTool = {
    name: 'web_search',
    description:
        'Search the web using Exa/Tavily, then Brave, with DuckDuckGo as degraded last-resort fallback. Returns titles, URLs, descriptions, provider provenance, and confidence.',
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
        const failures: ProviderFailure[] = [];

        const providers: Array<[Exclude<SearchProvider, 'duckduckgo'>, boolean]> = [
            ['exa', Boolean(EXA_API_KEY)],
            ['tavily', Boolean(TAVILY_API_KEY)],
            ['brave', Boolean(BRAVE_API_KEY)],
        ];

        for (const [provider, hasKey] of providers) {
            const attempt = await tryProvider(provider, hasKey, query, count);
            if ('results' in attempt) {
                const fallback = failurePayload(failures);
                const previousFailure = failures.at(-1);
                if (previousFailure) recordFallback(previousFailure.provider, attempt.provider, previousFailure.reason);

                return {
                    results: attempt.results,
                    query,
                    count: attempt.results.length,
                    source: attempt.provider,
                    provider: attempt.provider,
                    fallback,
                    degraded: false,
                    confidence: 'high',
                };
            }

            failures.push(attempt.failure);
        }

        const lastFailure = failures.at(-1);
        if (lastFailure) recordFallback(lastFailure.provider, 'duckduckgo', lastFailure.reason);

        try {
            const results = await searchDuckDuckGo(query, count);
            return {
                results,
                query,
                count: results.length,
                source: 'ddg',
                provider: 'duckduckgo',
                fallback: failurePayload(failures),
                degraded: true,
                confidence: 'low',
            };
        } catch (err) {
            log.error('DuckDuckGo fallback also failed', { error: err, query });
            return {
                error: `Search failed: ${(err as Error).message}`,
                provider: 'duckduckgo',
                fallback: failurePayload(failures),
                degraded: true,
                confidence: 'low',
            };
        }
    },
};
