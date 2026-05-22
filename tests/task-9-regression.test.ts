import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { fetchWithRetry } from '@/lib/net/fetch-with-retry';
import {
    getOllamaAttemptTimeoutMs,
    shouldStopOllamaLocalFallback,
    tryOpenRouterIndividual,
} from '@/lib/llm/client';
import { getAgentToolNames } from '@/lib/tools/registry';
import { detectBlockedOutcome } from '@/lib/tools/agent-session';
import {
    processCompletedReviewDrafts,
    releaseStaleReviewDrafts,
    type ReviewDraftRecoveryLogger,
} from '../scripts/unified-worker/review-recovery';
import type { ToolCallRecord } from '@/lib/types';
import { getHeartbeatContentWindowState } from '@/app/api/ops/heartbeat/route';
import { shouldLogRssFeedError, shouldSkipRssFeedDuringCooldown } from '@/lib/ops/rss';

function createLogger(): {
    logger: ReviewDraftRecoveryLogger;
    infoCalls: Array<[string, Record<string, unknown>]>;
    errorCalls: Array<[string, Record<string, unknown>]>;
} {
    const infoCalls: Array<[string, Record<string, unknown>]> = [];
    const errorCalls: Array<[string, Record<string, unknown>]> = [];

    return {
        logger: {
            info(message, meta = {}) {
                infoCalls.push([message, meta]);
            },
            error(message, meta = {}) {
                errorCalls.push([message, meta]);
            },
        },
        infoCalls,
        errorCalls,
    };
}

describe('Task 9 regressions', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        globalThis.fetch = originalFetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test('fetchWithRetry retries transient network failures before succeeding', async () => {
        let calls = 0;

        globalThis.fetch = (async () => {
            calls += 1;
            if (calls === 1) {
                throw new TypeError('fetch failed');
            }

            return new Response('<rss />', { status: 200 });
        }) as typeof fetch;

        const response = await fetchWithRetry('https://example.com/feed.xml', {
            label: 'rss',
            maxRetries: 2,
            baseDelayMs: 0,
        });

        expect(response.status).toBe(200);
        expect(await response.text()).toBe('<rss />');
        expect(calls).toBe(2);
    });

    test('fetchWithRetry retries retryable HTTP responses before returning success', async () => {
        let calls = 0;

        globalThis.fetch = (async () => {
            calls += 1;
            if (calls < 3) {
                return new Response('upstream busy', { status: 503 });
            }

            return new Response('<ok />', { status: 200 });
        }) as typeof fetch;

        const response = await fetchWithRetry('https://example.com/feed.xml', {
            label: 'rss',
            maxRetries: 2,
            baseDelayMs: 0,
        });

        expect(response.status).toBe(200);
        expect(await response.text()).toBe('<ok />');
        expect(calls).toBe(3);
    });

    test('fetchWithRetry enforces a total timeout budget across retries', async () => {
        let calls = 0;

        globalThis.fetch = (async () => {
            calls += 1;
            await new Promise(resolve => setTimeout(resolve, 15));
            throw new DOMException('The operation was aborted due to timeout', 'AbortError');
        }) as typeof fetch;

        await expect(
            fetchWithRetry('https://example.com/feed.xml', {
                label: 'rss',
                timeoutMs: 50,
                totalTimeoutMs: 10,
                maxRetries: 2,
                baseDelayMs: 0,
            }),
        ).rejects.toThrow('rss: total timeout exceeded');

        expect(calls).toBe(1);
    });

    test('fetchWithRetry can stop retrying timeout aborts', async () => {
        let calls = 0;

        globalThis.fetch = (async () => {
            calls += 1;
            throw new DOMException('The operation was aborted due to timeout', 'AbortError');
        }) as typeof fetch;

        await expect(
            fetchWithRetry('https://example.com/feed.xml', {
                label: 'rss',
                timeoutMs: 10,
                maxRetries: 2,
                baseDelayMs: 0,
                retryOnTimeout: false,
            }),
        ).rejects.toThrow('The operation was aborted due to timeout');

        expect(calls).toBe(1);
    });

    test('OpenRouter individual fallback stays capped after an upstream failure', async () => {
        const calls: string[] = [];

        const result = await tryOpenRouterIndividual(
            async (model) => {
                calls.push(model);
                return null;
            },
            ['model-a', 'model-b', 'model-c', 'model-d'],
            { statusCode: 500, message: 'array failed' },
            Date.now() + 5_000,
            'rss-digest',
        );

        expect(result).toBeNull();
        expect(calls).toEqual(['model-a', 'model-b']);
    });

    test('OpenRouter individual fallback stops immediately when budget is exhausted', async () => {
        let called = false;

        const result = await tryOpenRouterIndividual(
            async () => {
                called = true;
                return 'should-not-run';
            },
            ['model-a'],
            { statusCode: 500, message: 'array failed' },
            Date.now() - 1,
            'rss-digest',
        );

        expect(result).toBeNull();
        expect(called).toBeFalse();
    });

    test('preferred local Ollama text attempt gets the longer timeout budget', () => {
        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: false,
                remainingBudgetMs: 60_000,
                model: 'qwen3:14b',
                preferredModel: 'qwen3:14b',
            }),
        ).toBe(30_000);

        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: false,
                remainingBudgetMs: 60_000,
                model: 'gemma4:latest',
                preferredModel: 'qwen3:14b',
            }),
        ).toBe(20_000);

        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: true,
                remainingBudgetMs: 60_000,
                model: 'qwen3:14b',
                preferredModel: 'qwen3:14b',
            }),
        ).toBe(45_000);

        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: false,
                remainingBudgetMs: 12_000,
                model: 'qwen3:14b',
                preferredModel: 'qwen3:14b',
            }),
        ).toBe(12_000);

        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: false,
                remainingBudgetMs: 60_000,
                model: 'qwen3:14b',
                isFirstLocalAttempt: true,
            }),
        ).toBe(45_000);

        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: false,
                remainingBudgetMs: 60_000,
                model: 'qwen3:14b',
                preferredModel: 'qwen3:14b',
                isFirstLocalAttempt: true,
            }),
        ).toBe(30_000);

        expect(
            getOllamaAttemptTimeoutMs({
                hasTools: false,
                remainingBudgetMs: 60_000,
                model: 'gemma4:latest',
                isFirstLocalAttempt: false,
            }),
        ).toBe(20_000);
    });

    test('local Ollama aborts stop the remaining local fallback cascade', () => {
        expect(
            shouldStopOllamaLocalFallback(
                { apiKey: undefined },
                new Error('This operation was aborted'),
            ),
        ).toBeTrue();

        expect(
            shouldStopOllamaLocalFallback(
                { apiKey: undefined },
                new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
            ),
        ).toBeTrue();

        expect(
            shouldStopOllamaLocalFallback(
                { apiKey: 'cloud-key' },
                new Error('This operation was aborted'),
            ),
        ).toBeFalse();

        expect(
            shouldStopOllamaLocalFallback(
                { apiKey: undefined },
                new Error('fetch failed'),
            ),
        ).toBeFalse();
    });

    test('RSS skips feeds only while cooldown is active', () => {
        const nowMs = Date.parse('2026-04-14T18:30:00Z');

        expect(shouldSkipRssFeedDuringCooldown(undefined, nowMs)).toBeFalse();

        expect(
            shouldSkipRssFeedDuringCooldown(nowMs + 1, nowMs),
        ).toBeTrue();

        expect(
            shouldSkipRssFeedDuringCooldown(nowMs, nowMs),
        ).toBeFalse();

        expect(
            shouldSkipRssFeedDuringCooldown(nowMs - 1, nowMs),
        ).toBeFalse();
    });

    test('RSS suppresses generic feed-error log for timeout-like failures', () => {
        expect(
            shouldLogRssFeedError(
                new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
            ),
        ).toBeFalse();

        expect(
            shouldLogRssFeedError(
                new Error('RSS fetch SCMP: total timeout exceeded'),
            ),
        ).toBeFalse();

        expect(
            shouldLogRssFeedError(new Error('unexpected xml parse failure')),
        ).toBeTrue();
    });

    test('blocked classifier does not block successful summaries that mention awaiting input casually', () => {
        const toolCalls: ToolCallRecord[] = [
            {
                name: 'file_write',
                arguments: { path: 'output/reports/daily.md' },
                result: { ok: true, path: 'output/reports/daily.md' },
            },
        ];

        const outcome = detectBlockedOutcome(
            'Completed the daily briefing, wrote the report, and queued the follow-up. Awaiting input only for optional future refinement if leadership wants changes.',
            toolCalls,
        );

        expect(outcome.blocked).toBeFalse();
        expect(outcome.reason).toBe('');
        expect(outcome.evidence).toEqual([]);
    });

    test('blocked classifier still blocks truly stalled summaries', () => {
        const outcome = detectBlockedOutcome(
            'Cannot proceed because we are awaiting external data provisioning before any further steps can take place.',
            [],
        );

        expect(outcome.blocked).toBeTrue();
        expect(outcome.reason).toBe('Session summary reported unresolved blocker');
        expect(outcome.evidence.some(line => line.includes('soft-blocker pattern'))).toBeTrue();
    });

    test('blocked classifier keeps hard blockers blocked even when some progress was made', () => {
        const toolCalls: ToolCallRecord[] = [
            {
                name: 'file_write',
                arguments: { path: 'output/reports/partial.md' },
                result: { ok: true, path: 'output/reports/partial.md' },
            },
        ];

        const outcome = detectBlockedOutcome(
            'Wrote a partial report but cannot proceed until the missing approval arrives, so the mission is, by definition, stalled.',
            toolCalls,
        );

        expect(outcome.blocked).toBeTrue();
        expect(outcome.reason).toBe('Session summary reported unresolved blocker');
        expect(outcome.evidence.some(line => line.includes('hard-blocker pattern'))).toBeTrue();
    });

    test('blocked classifier can ignore report-language blockers for heartbeat status summaries', () => {
        const outcome = detectBlockedOutcome(
            'System heartbeat report: progress is stalled by IRP dependencies and pipeline integration is blocked by policy sequencing, but the report was generated successfully.',
            [],
            { ignoreSummaryBlockers: true },
        );

        expect(outcome.blocked).toBeFalse();
        expect(outcome.reason).toBe('');
        expect(outcome.evidence).toEqual([]);
    });

    test('blocked classifier still blocks fatal tool errors without successful artifact write', () => {
        const toolCalls: ToolCallRecord[] = [
            {
                name: 'web_fetch',
                arguments: { url: 'https://example.com' },
                result: { error: 'Access denied: remote fetch failed' },
            },
        ];

        const outcome = detectBlockedOutcome(
            'Fetched nothing useful and need another path.',
            toolCalls,
        );

        expect(outcome.blocked).toBeTrue();
        expect(outcome.reason).toBe('Fatal tool error without successful artifact write');
        expect(outcome.evidence.some(line => line.includes('tool web_fetch error'))).toBeTrue();
    });

    test('review recovery processes completed review sessions still stuck in review', async () => {
        const processed: string[] = [];
        const { logger, infoCalls, errorCalls } = createLogger();

        const count = await processCompletedReviewDrafts(
            [
                { id: 'draft-1', review_session_id: 'session-1', title: 'Draft 1' },
                { id: 'draft-2', review_session_id: 'session-2', title: 'Draft 2' },
            ],
            async (reviewSessionId) => {
                processed.push(reviewSessionId);
            },
            logger,
        );

        expect(count).toBe(2);
        expect(processed).toEqual(['session-1', 'session-2']);
        expect(infoCalls.length).toBeGreaterThan(0);
        expect(errorCalls).toHaveLength(0);
    });

    test('review recovery resets stale orphaned reviews back to draft and keeps going on errors', async () => {
        const resetCalls: string[] = [];
        const { logger, infoCalls, errorCalls } = createLogger();

        const count = await releaseStaleReviewDrafts(
            [
                { id: 'draft-1', review_session_id: null, title: 'Draft 1' },
                { id: 'draft-2', review_session_id: 'session-stale', title: 'Draft 2' },
                { id: 'draft-3', review_session_id: 'session-broken', title: 'Draft 3' },
            ],
            async (draftId) => {
                resetCalls.push(draftId);
                if (draftId === 'draft-2') {
                    throw new Error('db write failed');
                }
                return draftId !== 'draft-3';
            },
            logger,
        );

        expect(count).toBe(1);
        expect(resetCalls).toEqual(['draft-1', 'draft-2', 'draft-3']);
        expect(infoCalls.some(([message]) => message.includes('Stale review draft reset to draft'))).toBeTrue();
        expect(errorCalls.some(([message]) => message.includes('Failed to release stale review draft'))).toBeTrue();
    });

    test('constrained agents do not receive bash or file_write tool definitions', () => {
        const choraTools = getAgentToolNames('chora');
        const subrosaTools = getAgentToolNames('subrosa');

        expect(choraTools).not.toContain('bash');
        expect(choraTools).not.toContain('file_write');
        expect(subrosaTools).not.toContain('bash');
        expect(subrosaTools).not.toContain('file_write');
    });

    test('permitted agents still receive bash and file_write tool definitions', () => {
        const muxTools = getAgentToolNames('mux');
        const praxisTools = getAgentToolNames('praxis');
        const primusTools = getAgentToolNames('primus');

        expect(muxTools).toContain('bash');
        expect(muxTools).toContain('file_write');
        expect(praxisTools).toContain('bash');
        expect(praxisTools).toContain('file_write');
        expect(primusTools).toContain('file_write');
        expect(primusTools).not.toContain('bash');
    });

    test('heartbeat content windows follow America/Chicago during DST', () => {
        const state = getHeartbeatContentWindowState(
            new Date('2026-04-13T13:30:00.000Z'),
        );

        expect(state.chicagoDayOfWeek).toBe(1);
        expect(state.chicagoHour).toBe(8);
        expect(state.newsDigestSlot).toBe('morning');
        expect(state.isNewspaperWindow).toBeTrue();
        expect(state.isWeeklyNewsletterWindow).toBeTrue();
        expect(state.isWatercoolerWindow).toBeTrue();
        expect(state.isDreamWindow).toBeFalse();
        expect(state.isDailyDigestWindow).toBeFalse();
    });

    test('heartbeat content windows do not drift into stale UTC-6 evening slot during DST', () => {
        const state = getHeartbeatContentWindowState(
            new Date('2026-04-13T01:30:00.000Z'),
        );

        expect(state.chicagoDayOfWeek).toBe(0);
        expect(state.chicagoHour).toBe(20);
        expect(state.newsDigestSlot).toBeNull();
        expect(state.isNewspaperWindow).toBeFalse();
        expect(state.isWeeklyNewsletterWindow).toBeFalse();
        expect(state.isWatercoolerWindow).toBeTrue();
        expect(state.isDreamWindow).toBeFalse();
        expect(state.isDailyDigestWindow).toBeFalse();
    });
});
