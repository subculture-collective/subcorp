import { logger } from '@/lib/logger';

const log = logger.child({ module: 'fetch-with-retry' });

const DEFAULT_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

interface FetchWithRetryOptions extends RequestInit {
    timeoutMs?: number;
    totalTimeoutMs?: number;
    maxRetries?: number;
    baseDelayMs?: number;
    label?: string;
    retryOnStatuses?: Iterable<number>;
    retryOnTimeout?: boolean;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelayMs(response: Response, attempt: number, baseDelayMs: number): number {
    const retryAfterHeader = response.headers.get('Retry-After');
    if (retryAfterHeader) {
        const retryAfterSeconds = Number.parseFloat(retryAfterHeader);
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
            return Math.ceil(retryAfterSeconds * 1000);
        }
    }

    return baseDelayMs * (attempt + 1);
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

function isTimeoutError(error: unknown): boolean {
    return error instanceof Error && (
        error.name === 'TimeoutError' ||
        error.message === 'The operation was aborted due to timeout'
    );
}

function getRemainingBudgetMs(startedAtMs: number, totalTimeoutMs?: number): number | null {
    if (typeof totalTimeoutMs !== 'number') {
        return null;
    }

    return totalTimeoutMs - (Date.now() - startedAtMs);
}

function getSleepDelayMs(delayMs: number, remainingBudgetMs: number | null): number {
    if (remainingBudgetMs == null) {
        return delayMs;
    }

    return Math.max(0, Math.min(delayMs, remainingBudgetMs));
}

export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {},
): Promise<Response> {
    const {
        timeoutMs = 15_000,
        totalTimeoutMs,
        maxRetries = 2,
        baseDelayMs = 1_000,
        label = 'fetch',
        retryOnStatuses = DEFAULT_RETRYABLE_STATUSES,
        retryOnTimeout = true,
        signal,
        ...init
    } = options;

    const retryableStatuses = new Set(retryOnStatuses);
    let lastError: unknown;
    const startedAtMs = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const remainingBudgetMs = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
        if (remainingBudgetMs != null && remainingBudgetMs <= 0) {
            break;
        }

        const attemptTimeoutMs = Math.max(
            1,
            remainingBudgetMs == null ? timeoutMs : Math.min(timeoutMs, remainingBudgetMs),
        );
        const timeoutSignal = AbortSignal.timeout(attemptTimeoutMs);
        const combinedSignal =
            signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

        try {
            const response = await fetch(url, { ...init, signal: combinedSignal });

            if (retryableStatuses.has(response.status) && attempt < maxRetries) {
                const retryDelayMs = getRetryDelayMs(response, attempt, baseDelayMs);
                const remainingBudgetMsBeforeSleep = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
                if (remainingBudgetMsBeforeSleep != null && remainingBudgetMsBeforeSleep <= 0) {
                    return response;
                }
                const sleepDelayMs = getSleepDelayMs(
                    retryDelayMs,
                    remainingBudgetMsBeforeSleep,
                );
                log.warn(`${label} retrying response`, {
                    status: response.status,
                    attempt,
                    retryDelayMs: sleepDelayMs,
                });
                await sleep(sleepDelayMs);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;
            if (signal?.aborted) break;
            if ((isAbortError(error) || isTimeoutError(error)) && !retryOnTimeout) break;
            if (getRemainingBudgetMs(startedAtMs, totalTimeoutMs) != null) {
                const remainingBudgetMs = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
                if (remainingBudgetMs != null && remainingBudgetMs <= 0) {
                    break;
                }
            }
            if (attempt >= maxRetries) break;

            const retryDelayMs = baseDelayMs * (attempt + 1);
            const remainingBudgetMsBeforeSleep = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
            if (remainingBudgetMsBeforeSleep != null && remainingBudgetMsBeforeSleep <= 0) {
                break;
            }
            const sleepDelayMs = getSleepDelayMs(
                retryDelayMs,
                remainingBudgetMsBeforeSleep,
            );
            log.warn(`${label} retrying error`, {
                attempt,
                retryDelayMs: sleepDelayMs,
                error: (error as Error).message,
            });
            await sleep(sleepDelayMs);
        }
    }

    if (totalTimeoutMs != null && getRemainingBudgetMs(startedAtMs, totalTimeoutMs) != null && getRemainingBudgetMs(startedAtMs, totalTimeoutMs)! <= 0) {
        throw new Error(`${label}: total timeout exceeded`);
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(`${label}: exhausted retries`);
}
