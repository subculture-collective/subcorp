// LLM client — OpenRouter SDK
// Uses the OpenRouter TypeScript SDK for access to 300+ models
// via a single, type-safe interface.
// Supports both text-only generation and tool-calling (function calling).
import { OpenRouter, ToolType } from '@openrouter/sdk';
import type { OpenResponsesUsage } from '@openrouter/sdk/models';
import { z } from 'zod/v4';
import type {
    LLMGenerateOptions,
    LLMToolResult,
    ToolCallRecord,
    ToolDefinition,
} from '../types';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { incLlmEmptyText, incLlmEmptyToolRound } from '@/lib/metrics';
import { resolveModels } from './model-routing';

const log = logger.child({ module: 'llm' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';

/**
 * Master switch for OpenRouter. Set OPENROUTER_ENABLED=false to route ALL calls
 * through Ollama only. When disabled, OpenRouter is never called — not even as fallback.
 * Default: false. This service should normally use llama-line/Ollama only.
 */
const OPENROUTER_ENABLED = process.env.OPENROUTER_ENABLED === 'true';

/** Normalize model ID — strip erroneous openrouter/ prefix (only openrouter/auto is valid with that prefix) */
function normalizeModel(id: string): string {
    if (id === 'openrouter/auto') return id;
    if (id.startsWith('openrouter/')) return id.slice('openrouter/'.length);
    return id;
}

/** OpenRouter limits the `models` array to 3 items. Slice for API calls; full list used by individual fallback loop. */
const MAX_MODELS_ARRAY = 3;

/** Default max output tokens for Ollama calls when not specified by caller. */
const OLLAMA_DEFAULT_MAX_TOKENS = 16384;

/**
 * Check if a model name refers to a Gemma 4 variant.
 * Used to apply recommended sampling parameters (temperature=1.0, top_p=0.95, top_k=64).
 */
function isGemma4Model(model: string): boolean {
    return /^gemma4(:|$)/i.test(model);
}

/** Timeout for direct /chat/completions fallback calls (text-only, last resort). */
const OPENROUTER_CHAT_TIMEOUT_MS = 30_000;

/** Hard timeout for a single OpenRouter text attempt. */
const OPENROUTER_TEXT_TIMEOUT_MS = 20_000;

/** Total budget for the OpenRouter text fallback chain. */
const OPENROUTER_TEXT_BUDGET_MS = 45_000;

/** Timeout for OpenRouter tool-calling rounds (higher — tools need execution time). */
const OPENROUTER_TOOL_TIMEOUT_MS = 30_000;

/** Total budget for the OpenRouter tool loop across all rounds. */
const OPENROUTER_TOOL_BUDGET_MS = 75_000;

/** Cap individual OpenRouter fallback retries after the array attempt. */
const OPENROUTER_MAX_INDIVIDUAL_FALLBACKS = 2;

/** Hard cap for a full text-generation request across all providers. */
const LLM_TEXT_TOTAL_BUDGET_MS = 75_000;

/**
 * Hard cap for a full tool-calling request across all providers.
 * Local Ollama tool loops routinely need multiple qwen3 rounds plus tool I/O;
 * 90s caused healthy multi-tool sessions to be cut off and blocked.
 */
const LLM_TOOL_TOTAL_BUDGET_MS = 240_000;

/**
 * Local Ollama fallback chain used only when OLLAMA_MODEL is not set.
 * Keep the default single-model to avoid surprise traffic to stale models.
 */
const DEFAULT_OLLAMA_FALLBACK_MODELS = ['qwen3:14b'];

const OLLAMA_FALLBACK_MODELS = (
    process.env.OLLAMA_FALLBACK_MODELS ??
    DEFAULT_OLLAMA_FALLBACK_MODELS.join(',')
)
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);

/**
 * Best-effort repair of truncated JSON from LLM tool call arguments.
 * Models sometimes run out of output tokens mid-JSON, producing unterminated
 * strings or missing closing braces/brackets. This tries to close them.
 */
function repairTruncatedJson(raw: string): Record<string, unknown> {
    let s = raw.trim();
    if (!s.startsWith('{')) return {};

    // Close any unterminated string (odd number of unescaped quotes)
    const unescapedQuotes = s.match(/(?<!\\)"/g);
    if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) {
        s += '"';
    }

    // Remove trailing comma before we close brackets/braces
    s = s.replace(/,\s*$/, '');

    // Count unmatched openers and close them
    let braces = 0;
    let brackets = 0;
    let inString = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '\\' && inString) {
            i++;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{') braces++;
        else if (ch === '}') braces--;
        else if (ch === '[') brackets++;
        else if (ch === ']') brackets--;
    }
    for (let i = 0; i < brackets; i++) s += ']';
    for (let i = 0; i < braces; i++) s += '}';

    return JSON.parse(s);
}

/**
 * Canonical param alias map for tools.
 * LLMs (especially DeepSeek) sometimes use variant param names instead of the
 * exact schema names. This maps known variants → canonical names per tool.
 */
const TOOL_PARAM_ALIASES: Record<string, Record<string, string>> = {
    file_write: {
        file_path: 'path',
        filepath: 'path',
        filename: 'path',
        file_name: 'path',
        write_content: 'content',
        file_content: 'content',
        text_content: 'content',
    },
    file_read: {
        file_path: 'path',
        filepath: 'path',
        filename: 'path',
        file_name: 'path',
    },
    bash: {
        cmd: 'command',
        shell_command: 'command',
        bash_command: 'command',
    },
    web_search: {
        search_query: 'query',
        q: 'query',
    },
    web_fetch: {
        link: 'url',
        web_url: 'url',
        target_url: 'url',
    },
    memory_search: {
        search_query: 'query',
        q: 'query',
    },
    memory_write: {
        memory_type: 'type',
        text: 'content',
        body: 'content',
    },
    send_to_agent: {
        agent: 'target_agent',
        agent_id: 'target_agent',
        file_name: 'filename',
        file: 'filename',
        text: 'content',
        body: 'content',
    },
};

/**
 * Normalize tool call arguments by remapping known alias param names
 * to the canonical names expected by the tool schema.
 * Returns a new object — does not mutate the original.
 */
function normalizeToolArgs(
    toolName: string,
    args: Record<string, unknown>,
): { normalized: Record<string, unknown>; remapped: Record<string, string> } {
    const aliases = TOOL_PARAM_ALIASES[toolName];
    if (!aliases) return { normalized: args, remapped: {} };

    const normalized = { ...args };
    const remapped: Record<string, string> = {};

    for (const [variant, canonical] of Object.entries(aliases)) {
        if (variant in normalized && !(canonical in normalized)) {
            normalized[canonical] = normalized[variant];
            delete normalized[variant];
            remapped[variant] = canonical;
        }
    }

    return { normalized, remapped };
}

/** LLM_MODEL env override — prepended to resolved model list when set. */
const LLM_MODEL_ENV: string | null = (() => {
    const envModel = process.env.LLM_MODEL;
    if (!envModel || envModel === 'openrouter/auto') return null;
    return normalizeModel(envModel);
})();

/** Resolve models from DB routing table, prepending LLM_MODEL env if set. */
async function resolveModelsWithEnv(context?: string): Promise<string[]> {
    const models = await resolveModels(context);
    if (!LLM_MODEL_ENV) return models;
    return [
        LLM_MODEL_ENV,
        ...models.filter((m: string) => m !== LLM_MODEL_ENV),
    ];
}

let _client: OpenRouter | null = null;

function getClient(): OpenRouter {
    if (!_client) {
        if (!OPENROUTER_ENABLED || !OPENROUTER_API_KEY) {
            throw new Error(
                'OpenRouter is disabled or missing API key. Set OPENROUTER_ENABLED=true and OPENROUTER_API_KEY in .env',
            );
        }
        _client = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
    }
    return _client;
}

/** Re-export the singleton for direct SDK access when needed */
export { getClient as getOpenRouterClient };

// ─── Ollama-compatible local broker (llama-line/Ollama) ───
// Set OLLAMA_ENABLED=false to disable all Ollama paths (defaults to true when credentials exist)

const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED !== 'false';
const OLLAMA_LOCAL_URL =
    OLLAMA_ENABLED ? (process.env.OLLAMA_BASE_URL ?? '') : '';
const OLLAMA_API_KEY = OLLAMA_ENABLED ? (process.env.OLLAMA_API_KEY ?? '') : '';
// Timeouts are generous to accommodate llama-line broker queue wait times.
// The broker serialises requests; a busy queue can add minutes of wait before inference starts.
const OLLAMA_TEXT_TIMEOUT_MS = 600_000;          // 10 min
const OLLAMA_PREFERRED_TEXT_TIMEOUT_MS = 600_000; // 10 min
const OLLAMA_IMPLICIT_FIRST_LOCAL_TEXT_TIMEOUT_MS = 600_000; // 10 min
const OLLAMA_TOOL_TIMEOUT_MS = 600_000;           // 10 min
const OLLAMA_BUDGET_MS = 1_200_000;               // 20 min total budget across all attempts
const OLLAMA_TAGS_TIMEOUT_MS = 5_000;
const OLLAMA_MODEL_CACHE_TTL_MS = 30_000;
/** Model override via env — when set, ONLY this model is used for local Ollama. */
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? '';
/** Local Ollama model reserved for tool execution. Avoid openai/* routes here. */
const OLLAMA_TOOL_MODEL = process.env.OLLAMA_TOOL_MODEL ?? '';
const OLLAMA_EMPTY_RETRY_COUNT = Math.max(
    0,
    Number.parseInt(process.env.OLLAMA_EMPTY_RETRY_COUNT ?? '1', 10) || 0,
);

interface OllamaModelSpec {
    model: string;
    baseUrl: string;
    apiKey?: string;
}

function isAbortLikeError(error: unknown): boolean {
    return error instanceof Error && (
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.message === 'This operation was aborted' ||
        error.message === 'The operation was aborted due to timeout'
    );
}

export function shouldStopOllamaLocalFallback(
    spec: Pick<OllamaModelSpec, 'apiKey'>,
    error: unknown,
): boolean {
    return !spec.apiKey && isAbortLikeError(error);
}

let ollamaModelCatalogCache:
    | {
          baseUrl: string;
          models: Set<string>;
          ts: number;
      }
    | null = null;

function isLocalModelId(model?: string): boolean {
    if (!model) return false;
    const normalized = normalizeModel(model);
    return normalized.includes(':') && !normalized.includes('/');
}

const LLAMA_LINE_MODEL_PREFIXES = (
    process.env.LLAMA_LINE_MODEL_PREFIXES ?? 'openai/gpt-,github-copilot/'
)
    .split(',')
    .map(prefix => prefix.trim())
    .filter(Boolean);

function isLlamaLineRoutedModel(model?: string): boolean {
    if (!model) return false;
    const normalized = normalizeModel(model);
    return LLAMA_LINE_MODEL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function isOllamaRoutedModel(model?: string): boolean {
    return isLocalModelId(model) || isLlamaLineRoutedModel(model);
}

function getDefaultOllamaToolModel(): string {
    const explicitToolModel = OLLAMA_TOOL_MODEL.trim();
    if (explicitToolModel) {
        if (isLocalModelId(explicitToolModel)) return normalizeModel(explicitToolModel);
        log.warn('Ignoring non-local OLLAMA_TOOL_MODEL for tool execution', {
            toolModel: explicitToolModel,
        });
    }

    if (isLocalModelId(OLLAMA_MODEL)) return normalizeModel(OLLAMA_MODEL);

    const fallbackLocalModel = OLLAMA_FALLBACK_MODELS.find(isLocalModelId);
    if (fallbackLocalModel) return fallbackLocalModel;

    return DEFAULT_OLLAMA_FALLBACK_MODELS[0];
}

export function resolveOllamaModelForToolRequest(model?: string): string {
    if (isLocalModelId(model)) return normalizeModel(model!);

    const toolModel = getDefaultOllamaToolModel();
    if (model && isLlamaLineRoutedModel(model)) {
        log.info('Routing tool request away from llama-line OpenCode harness model', {
            requestedModel: model,
            toolModel,
        });
    }
    return toolModel;
}

function resolvePreferredOllamaModel(model: string | undefined, hasTools: boolean): string | undefined {
    if (hasTools) return resolveOllamaModelForToolRequest(model);
    return model && isOllamaRoutedModel(model) ? model : undefined;
}

function canUseOpenRouter(): boolean {
    return OPENROUTER_ENABLED && !!OPENROUTER_API_KEY;
}

function shouldTryOllamaFirst(model?: string): boolean {
    return !canUseOpenRouter() || isOllamaRoutedModel(model);
}

function getRemainingBudget(deadlineAt: number): number {
    return Math.max(0, deadlineAt - Date.now());
}

export function getOllamaAttemptTimeoutMs(opts: {
    hasTools: boolean;
    remainingBudgetMs: number;
    model: string;
    preferredModel?: string;
    isFirstLocalAttempt?: boolean;
}): number {
    const isPreferredTextAttempt =
        !opts.hasTools && !!opts.preferredModel && opts.model === opts.preferredModel;
    const isImplicitFirstLocalTextAttempt =
        !opts.hasTools && !opts.preferredModel && !!opts.isFirstLocalAttempt;
    const baseTimeoutMs =
        opts.hasTools ? OLLAMA_TOOL_TIMEOUT_MS
        : isImplicitFirstLocalTextAttempt ? OLLAMA_IMPLICIT_FIRST_LOCAL_TEXT_TIMEOUT_MS
        : isPreferredTextAttempt ? OLLAMA_PREFERRED_TEXT_TIMEOUT_MS
        : OLLAMA_TEXT_TIMEOUT_MS;

    return Math.min(baseTimeoutMs, opts.remainingBudgetMs);
}

async function withTimeout<T>(
    label: string,
    timeoutMs: number,
    fn: () => Promise<T>,
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
        return await Promise.race([
            fn(),
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(
                        Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), {
                            statusCode: 504,
                        }),
                    );
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function getReachableLocalOllamaModels(): Promise<Set<string> | null> {
    if (!OLLAMA_LOCAL_URL) return null;

    const cached = ollamaModelCatalogCache;
    if (
        cached &&
        cached.baseUrl === OLLAMA_LOCAL_URL &&
        Date.now() - cached.ts < OLLAMA_MODEL_CACHE_TTL_MS
    ) {
        return cached.models;
    }

    try {
        const tagsHeaders: Record<string, string> = {};
        if (OLLAMA_API_KEY) tagsHeaders['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
        const response = await fetch(`${OLLAMA_LOCAL_URL}/api/tags`, {
            headers: tagsHeaders,
            signal: AbortSignal.timeout(OLLAMA_TAGS_TIMEOUT_MS),
        });
        if (!response.ok) {
            log.warn('Ollama model catalog probe failed', {
                baseUrl: OLLAMA_LOCAL_URL,
                status: response.status,
            });
            return null;
        }

        const data = (await response.json()) as {
            models?: Array<{ name?: string }>;
        };
        const models = new Set(
            (data.models ?? [])
                .map(entry => entry.name?.trim())
                .filter((name): name is string => Boolean(name)),
        );
        ollamaModelCatalogCache = {
            baseUrl: OLLAMA_LOCAL_URL,
            models,
            ts: Date.now(),
        };
        return models;
    } catch (error) {
        log.warn('Ollama model catalog probe exception', {
            baseUrl: OLLAMA_LOCAL_URL,
            error: (error as Error).message?.slice(0, 200),
        });
        return null;
    }
}

async function filterReachableLocalOllamaModels(
    models: OllamaModelSpec[],
): Promise<OllamaModelSpec[]> {
    if (!OLLAMA_LOCAL_URL || models.length === 0) return [];

    const reachableModels = await getReachableLocalOllamaModels();
    if (!reachableModels) {
        log.warn('Skipping local Ollama fallback because catalog probe failed', {
            baseUrl: OLLAMA_LOCAL_URL,
            requestedModels: models.map(spec => spec.model),
        });
        return [];
    }

    const filtered = models.filter(spec => reachableModels.has(spec.model));
    const skipped = models
        .filter(spec => !reachableModels.has(spec.model))
        .map(spec => spec.model);

    if (skipped.length > 0) {
        log.info('Skipping unavailable local Ollama models', {
            baseUrl: OLLAMA_LOCAL_URL,
            skipped,
        });
    }

    return filtered;
}

/**
 * Ordered fallback chain for Ollama-compatible inference.
 * Models hit OLLAMA_BASE_URL, which should normally be the llama-line broker.
 *
 * When OLLAMA_MODEL is set in env, only that model is used for local calls
 * unless a caller explicitly requests a different model.
 */
function getOllamaModels(): OllamaModelSpec[] {
    return getOllamaModelsWithFallback();
}

function dedupeModelSpecs(models: OllamaModelSpec[]): OllamaModelSpec[] {
    const seen = new Set<string>();
    const deduped: OllamaModelSpec[] = [];

    for (const model of models) {
        const key = `${model.baseUrl}::${model.model}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(model);
    }

    return deduped;
}

function getOllamaModelsWithFallback(preferredModel?: string): OllamaModelSpec[] {
    const localModels: OllamaModelSpec[] = [];

    // Local/network models via OLLAMA_BASE_URL.
    // OLLAMA_MODEL is the single default. The fallback list is only used when
    // no default is configured, so hardcoded stale models cannot leak traffic.
    if (OLLAMA_LOCAL_URL) {
        const localModelIds =
            preferredModel ? [preferredModel]
            : OLLAMA_MODEL ? [OLLAMA_MODEL]
            : OLLAMA_FALLBACK_MODELS;

        for (const model of localModelIds) {
            localModels.push({ model, baseUrl: OLLAMA_LOCAL_URL, apiKey: OLLAMA_API_KEY || undefined });
        }
    }

    return dedupeModelSpecs(localModels);
}

/** Strip thinking blocks from reasoning model output.
 *  Handles multiple formats:
 *  - <think>...</think> (DeepSeek, Qwen)
 *  - <|channel>thought\n...<channel|> (Gemma 4)
 */
function stripThinking(text: string): string {
    return text
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/<\|channel>thought\n[\s\S]*?<channel\|>/g, '')
        .trim();
}

/** Normalize DeepSeek DSML tags (e.g. <｜DSML｜...>) to standard XML. */
export function normalizeDsml(text: string): string {
    return text
        .replace(/<[｜|]DSML[｜|]/g, '<')
        .replace(/<\/[｜|]DSML[｜|]/g, '</');
}

/**
 * Try Ollama as the first LLM provider (text-only, no tools).
 * Returns the text result or null if Ollama is unavailable / returns empty.
 * Tracks usage on success.
 */
async function tryOllamaFirst(
    messages: { role: string; content: string }[],
    temperature: number,
    maxTokens: number,
    startTime: number,
    trackingContext?: LLMGenerateOptions['trackingContext'],
    modelOverride?: string,
    deadlineAt?: number,
): Promise<string | null> {
    if (!OLLAMA_API_KEY && !OLLAMA_LOCAL_URL) return null;

    // Resolve context-specific Ollama model from routing table
    let ollamaModel = modelOverride;
    if (!ollamaModel && trackingContext?.context) {
        try {
            const routed = await resolveModels(trackingContext.context);
            const ollamaCandidate = routed.find((m: string) => m.includes(':'));
            if (ollamaCandidate) ollamaModel = ollamaCandidate;
        } catch { /* routing unavailable, use default */ }
    }

    const maxAttempts = 1 + OLLAMA_EMPTY_RETRY_COUNT;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (deadlineAt && getRemainingBudget(deadlineAt) <= 1_000) break;

        const attemptMessages =
            attempt === 1 ? messages : [
                ...messages,
                {
                    role: 'user',
                    content:
                        'The previous generation attempt returned no usable text. Retry now and produce a concrete, complete response. Do not return an empty message.',
                },
            ];

        const ollamaResult = await ollamaChat(attemptMessages, temperature, {
            maxTokens,
            model: ollamaModel,
            deadlineAt,
            trackingContext,
        });
        if (ollamaResult?.text) {
            log.debug('Ollama succeeded', {
                model: ollamaResult.model,
                context: trackingContext?.context,
                textLength: ollamaResult.text.length,
                attempt,
            });
            void trackUsage(
                `ollama/${ollamaResult.model}`,
                toOpenResponsesUsage(ollamaResult.usage),
                Date.now() - startTime,
                trackingContext,
            );
            return ollamaResult.text;
        }

        if (attempt < maxAttempts) {
            log.warn('Ollama returned empty; retrying once before provider fallback', {
                context: trackingContext?.context,
                agentId: trackingContext?.agentId,
                attempt,
                maxAttempts,
                remainingBudgetMs: deadlineAt ? getRemainingBudget(deadlineAt) : undefined,
            });
        }
    }

    log.debug('Ollama returned empty, falling through to OpenRouter', {
        context: trackingContext?.context,
        ollamaModels: getOllamaModels().map(m => m.model),
    });
    return null;
}

/**
 * Try Ollama as a last-resort fallback after OpenRouter fails (text-only).
 * Returns the text or null.
 */
async function tryOllamaLastResort(
    messages: { role: string; content: string }[],
    temperature: number,
    maxTokens: number,
    startTime: number,
    trackingContext?: LLMGenerateOptions['trackingContext'],
    deadlineAt?: number,
): Promise<string | null> {
    if (!OLLAMA_API_KEY && !OLLAMA_LOCAL_URL) return null;

    const retryResult = await ollamaChat(messages, temperature, {
        maxTokens,
        deadlineAt,
        trackingContext,
    });
    if (retryResult?.text) {
        void trackUsage(
            `ollama/${retryResult.model}`,
            toOpenResponsesUsage(retryResult.usage),
            Date.now() - startTime,
            trackingContext,
        );
        return retryResult.text;
    }
    return null;
}

/** Throw a descriptive error for known OpenRouter status codes. */
function throwForOpenRouterStatus(statusCode: number | undefined): void {
    if (statusCode === 402) {
        throw new Error('Insufficient OpenRouter credits — add credits at openrouter.ai');
    }
    if (statusCode === 429) {
        throw new Error('OpenRouter rate limited — try again shortly');
    }
}

/** Convert Ollama usage stats to the OpenRouter SDK's OpenResponsesUsage shape. */
function toOpenResponsesUsage(
    usage: OllamaUsage | undefined,
): OpenResponsesUsage | null {
    if (!usage) return null;
    return {
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
    } as unknown as OpenResponsesUsage;
}

/**
 * Parse tool call arguments with JSON repair and param alias normalization.
 * Tries JSON.parse first, falls back to repairTruncatedJson, then empty object.
 * Returns the normalized args and any remapped param names.
 */
function parseAndNormalizeToolArgs(
    toolName: string,
    rawArgsInput: string | Record<string, unknown>,
    model: string,
    round?: number,
): { args: Record<string, unknown>; remapped: Record<string, string> } {
    // Native Ollama /api/chat returns arguments as an object, not a string
    const rawArgs: string = typeof rawArgsInput === 'string' ? rawArgsInput : JSON.stringify(rawArgsInput);
    let args: Record<string, unknown>;
    try {
        args = JSON.parse(rawArgs);
        log.debug('Parsed tool call args', {
            tool: toolName,
            argsKeys: Object.keys(args),
            model,
            round,
        });
    } catch {
        try {
            args = repairTruncatedJson(rawArgs);
            log.warn('Repaired truncated tool call JSON', {
                tool: toolName,
                argsKeys: Object.keys(args),
                original: rawArgs.slice(0, 200),
                model,
            });
        } catch {
            log.warn('Unrecoverable malformed tool call JSON', {
                tool: toolName,
                arguments: rawArgs.slice(0, 200),
                model,
            });
            args = {};
        }
    }

    const { normalized, remapped } = normalizeToolArgs(toolName, args);
    if (Object.keys(remapped).length > 0) {
        log.info('Normalized tool call param aliases', {
            tool: toolName,
            remapped,
            model,
            round,
        });
    }

    return { args: normalized, remapped };
}

/**
 * Filter out phantom tool calls with null/empty function names.
 * Some models (DeepSeek v3.2) return tool_calls with null names.
 * Returns the filtered array, or undefined if all were phantom.
 */
function filterPhantomToolCalls<T extends { function: { name: string } }>(
    toolCalls: T[] | undefined,
    context: { model: string; round?: number; trackingContext?: string },
): T[] | undefined {
    if (!toolCalls || toolCalls.length === 0) return undefined;

    const validCalls = toolCalls.filter(
        tc => tc.function?.name && typeof tc.function.name === 'string',
    );

    if (validCalls.length < toolCalls.length) {
        log.warn('Filtered out tool calls with null/empty names', {
            original: toolCalls.length,
            valid: validCalls.length,
            model: context.model,
            round: context.round,
            context: context.trackingContext,
        });
        return validCalls.length > 0 ? validCalls : undefined;
    }

    return toolCalls;
}

interface OllamaUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
}

interface OllamaChatResult {
    text: string;
    toolCalls: ToolCallRecord[];
    model: string;
    usage?: OllamaUsage;
}

interface OllamaChatAttemptResult {
    result: OllamaChatResult | null;
    stopLocalFallback?: boolean;
}

/**
 * Full Ollama chat with tool calling support.
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 * Tries cloud models (ollama.com) first, then local models.
 * Returns null if all models fail.
 */
async function ollamaChat(
    messages: { role: string; content: string }[],
    temperature: number,
    options?: {
        maxTokens?: number;
        tools?: ToolDefinition[];
        maxToolRounds?: number;
        model?: string;
        deadlineAt?: number;
        trackingContext?: LLMGenerateOptions['trackingContext'];
    },
): Promise<OllamaChatResult | null> {
    const hasTools = !!options?.tools?.length;
    const preferredModel = resolvePreferredOllamaModel(options?.model, hasTools);
    const models = getOllamaModelsWithFallback(preferredModel);
    if (models.length === 0) return null;

    const maxTokens = options?.maxTokens ?? OLLAMA_DEFAULT_MAX_TOKENS;
    const tools = options?.tools;
    const maxToolRounds = options?.maxToolRounds ?? 10;
    const deadlineAt = options?.deadlineAt ?? Date.now() + OLLAMA_BUDGET_MS;

    // Convert tools to OpenAI function-calling format
    const openaiTools =
        tools && tools.length > 0 ?
            tools.map(t => ({
                type: 'function' as const,
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                },
            }))
        :   undefined;

    const cloudModels = models.filter(spec => !!spec.apiKey);
    const localModels = await filterReachableLocalOllamaModels(
        models.filter(spec => !spec.apiKey),
    );
    const candidateModels = [...cloudModels, ...localModels];
    let stopLocalFallback = false;

    if (candidateModels.length === 0) {
        log.warn('No reachable Ollama chat models available', {
            preferredModel,
            hasLocalUrl: !!OLLAMA_LOCAL_URL,
            hasCloudKey: !!OLLAMA_API_KEY,
        });
        return null;
    }

    for (const [index, spec] of candidateModels.entries()) {
        if (stopLocalFallback && !spec.apiKey) {
            log.warn('Skipping remaining local Ollama fallback models after abort-like failure', {
                model: spec.model,
                preferredModel,
            });
            continue;
        }
        if (getRemainingBudget(deadlineAt) <= 0) {
            log.warn('Ollama fallback budget exhausted', {
                attemptedModels: candidateModels.map(candidate => candidate.model),
                maxToolRounds,
                hasTools: !!tools?.length,
            });
            return null;
        }
        const attempt = await ollamaChatWithModel({
            spec,
            messages,
            temperature,
            maxTokens,
            tools,
            openaiTools,
            maxToolRounds,
            deadlineAt,
            preferredModel,
            isFirstLocalAttempt: !spec.apiKey && index === 0,
            trackingContext: options?.trackingContext,
        });
        if (attempt.result) return attempt.result;
        if (attempt.stopLocalFallback) {
            stopLocalFallback = true;
            log.warn('Stopping local Ollama fallback cascade after abort-like failure', {
                model: spec.model,
                preferredModel,
            });
        }
    }

    return null;
}

/** Input for a single Ollama model chat attempt. */
interface OllamaChatWithModelInput {
    spec: OllamaModelSpec;
    messages: { role: string; content: string }[];
    temperature: number;
    maxTokens: number;
    tools: ToolDefinition[] | undefined;
    openaiTools:
        | Array<{
              type: 'function';
              function: {
                  name: string;
                  description: string;
                  parameters: Record<string, unknown>;
              };
          }>
        | undefined;
    maxToolRounds: number;
    deadlineAt: number;
    preferredModel?: string;
    isFirstLocalAttempt?: boolean;
    trackingContext?: LLMGenerateOptions['trackingContext'];
}

/**
 * Parse a llama-line SSE response from /api/chat.
 * llama-line always returns text/event-stream even when stream: false is sent.
 * The stream contains 0+ broker status events followed by the final ollama JSON.
 */
async function parseOllamaSseResponse(response: Response): Promise<{
    message?: {
        content?: string;
        thinking?: string;
        reasoning?: string;
        tool_calls?: Array<{
            function: { name: string; arguments: string | Record<string, unknown> };
        }>;
    };
    choices?: Array<{
        message?: {
            content?: string;
            thinking?: string;
            reasoning?: string;
            tool_calls?: Array<{
                id?: string;
                function: { name: string; arguments: string | Record<string, unknown> };
            }>;
        };
        finish_reason?: string;
    }>;
    done?: boolean;
    done_reason?: string;
    usage?: OllamaUsage;
    prompt_eval_count?: number;
    eval_count?: number;
}> {
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(payload) as Record<string, unknown>;
        } catch {
            continue;
        }
        // Broker error events
        if (parsed['status'] === 'ollama_unavailable' || parsed['status'] === 'dropped_by_admin') {
            throw new Error(`llama-line broker error: ${parsed['status']}`);
        }
        // Skip broker status events (queued, processing, etc.)
        if (typeof parsed['status'] === 'string') continue;
        // This is the actual ollama response payload
        return parsed as ReturnType<typeof parseOllamaSseResponse> extends Promise<infer T> ? T : never;
    }
    throw new Error('No valid response found in llama-line SSE stream');
}

/** Try a single Ollama model. Returns result or null on failure. */
async function ollamaChatWithModel(
    input: OllamaChatWithModelInput,
): Promise<OllamaChatAttemptResult> {
    const {
        spec,
        messages,
        temperature,
        maxTokens,
        tools,
        openaiTools,
        maxToolRounds,
        deadlineAt,
        preferredModel,
        isFirstLocalAttempt,
        trackingContext,
    } = input;
    const { model, baseUrl, apiKey } = spec;
    const toolCallRecords: ToolCallRecord[] = [];

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    // Working copy of messages for the tool loop
    const workingMessages: Array<Record<string, unknown>> = messages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    for (let round = 0; round <= maxToolRounds; round++) {
        try {
            const remainingBudgetMs = getRemainingBudget(deadlineAt);
            if (remainingBudgetMs <= 0) {
                log.warn('Ollama attempt budget exhausted', {
                    model,
                    round,
                    maxToolRounds,
                });
                return { result: null };
            }

            const controller = new AbortController();
            const attemptTimeoutMs = getOllamaAttemptTimeoutMs({
                hasTools: !!openaiTools,
                remainingBudgetMs,
                model,
                preferredModel,
                isFirstLocalAttempt,
            });
            const timeoutId = setTimeout(
                () => controller.abort(),
                attemptTimeoutMs,
            );

            // Use Ollama's native /api/chat endpoint (not /v1/chat/completions)
            // because the OpenAI-compatible endpoint ignores num_ctx, causing
            // prompts to be truncated at 4096 tokens.
            // Estimate token count from messages to right-size the KV cache.
            // Over-allocating num_ctx (e.g. 131072) causes ~16s overhead per request
            // from KV cache allocation, even for small prompts.
            const estimatedTokens = workingMessages.reduce(
                (sum, m) => sum + Math.ceil(((m.content as string) ?? '').length / 3.5),
                0,
            );
            // Add headroom for tool schemas + response tokens, round up to nearest 4096
            const numCtx = Math.min(131072, Math.max(8192, Math.ceil((estimatedTokens + maxTokens + 2048) / 4096) * 4096));

            const body: Record<string, unknown> = {
                model,
                messages: workingMessages,
                stream: false,
                options: {
                    // Gemma 4: use 1.0 for text generation, but 0.7 for tool calling
                    // to keep tool use focused and reduce thinking-block leakage
                    temperature: isGemma4Model(model) ? (openaiTools ? 0.7 : 1.0) : temperature,
                    num_ctx: numCtx,
                    ...(isGemma4Model(model) ? { top_k: 64, top_p: 0.95 } : {}),
                    ...(isGemma4Model(model) ? {} : { num_predict: maxTokens }),
                },
            };
            // Always include tools so the model has context for tool results.
            // On the final round, use tool_choice: "none" to get a text response.
            if (openaiTools && round < maxToolRounds) {
                body.tools = openaiTools;
            } else if (openaiTools && round >= maxToolRounds) {
                body.tools = openaiTools;
                body.tool_choice = 'none';
            }

            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            if (!response.ok) {
                log.warn('Ollama model HTTP error', {
                    model,
                    baseUrl,
                    status: response.status,
                    statusText: response.statusText,
                });
                return { result: null };
            }

            // Native /api/chat response format — parse SSE envelope from llama-line broker.
            // llama-line always returns text/event-stream even when stream: false is sent.
            const rawData = await parseOllamaSseResponse(response);

            // Map native Ollama format and OpenAI-compatible upstream responses
            // to our internal expectations. llama-line may route `openai/gpt-*`
            // models to an OpenAI-compatible upstream even when subcorp called
            // `/api/chat`, so the final payload can be `choices[0].message`
            // instead of Ollama's top-level `message`.
            const choice = rawData.choices?.[0];
            const msg = rawData.message ?? choice?.message;
            const finishReason =
                rawData.done_reason === 'stop' ||
                choice?.finish_reason === 'stop' ||
                (rawData.done && !msg?.tool_calls?.length) ? 'stop'
                : msg?.tool_calls?.length ? 'tool_calls'
                : 'stop';
            // Synthesize usage from native fields or OpenAI-compatible usage.
            const data = {
                usage: {
                    prompt_tokens: rawData.usage?.prompt_tokens ?? rawData.prompt_eval_count ?? 0,
                    completion_tokens: rawData.usage?.completion_tokens ?? rawData.eval_count ?? 0,
                    total_tokens:
                        rawData.usage?.total_tokens ??
                        (rawData.prompt_eval_count ?? 0) + (rawData.eval_count ?? 0),
                } as OllamaUsage,
            };

            // Debug: log raw response structure for diagnosis
            log.debug('Ollama raw response', {
                model,
                round,
                finishReason,
                contentLength: (msg?.content ?? '').length,
                thinkingLength: (msg?.thinking ?? '').length,
                reasoningLength: (msg?.reasoning ?? '').length,
                contentPreview: (msg?.content ?? '').slice(0, 80) || '(empty)',
                hasToolCalls: !!(msg?.tool_calls?.length),
                usage: data.usage,
            });
            if (!msg) {
                log.warn('Ollama model returned no message', {
                    model,
                    hasMessage: !!msg,
                });
                return { result: null };
            }

            // Native /api/chat tool_calls may lack `id` — generate one
            const rawToolCalls = msg.tool_calls?.map((tc, i) => ({
                id: (tc as { id?: string }).id ?? `call_${round}_${i}`,
                function: tc.function,
            }));
            let ollamaPendingToolCalls = filterPhantomToolCalls(
                rawToolCalls,
                { model, round },
            );

            // Some local/brokered models do not surface native tool_calls even when
            // tool schemas are supplied. They may emit Anthropic/DSML-style text
            // calls instead. Recover those before accepting a text-only answer;
            // otherwise agents can hallucinate that they wrote files without any
            // executable tool evidence.
            if (
                !ollamaPendingToolCalls ||
                ollamaPendingToolCalls.length === 0
            ) {
                const raw = msg.content ?? '';
                if (tools && tools.length > 0 && raw.length > 0) {
                    const dsmlCalls = parseDsmlToolCalls(raw, tools);
                    if (dsmlCalls.length > 0) {
                        ollamaPendingToolCalls = dsmlCalls;
                        log.info('Recovered Ollama tool calls from DSML text', {
                            count: dsmlCalls.length,
                            tools: dsmlCalls.map(tc => tc.function.name),
                            model,
                            round,
                        });
                    }
                }
            }

            // No tool calls → return text (extract content from XML wrappers if present)
            if (
                !ollamaPendingToolCalls ||
                ollamaPendingToolCalls.length === 0
            ) {
                const raw = msg.content ?? '';
                const thinking = msg.thinking ?? msg.reasoning ?? '';
                const stripped = extractFromXml(stripThinking(raw)).trim();
                // If stripping thinking blocks produces empty content but raw wasn't empty,
                // the model put useful output inside thinking tags — preserve it.
                const text = stripped.length > 0 ? stripped : extractFromXml(raw).trim();
                if (text.length === 0 && toolCallRecords.length === 0) {
                    incLlmEmptyText({
                        provider: 'ollama',
                        context: trackingContext?.context,
                        agentId: trackingContext?.agentId,
                    });
                    log.warn('Ollama model returned empty text', {
                        model,
                        doneReason: rawData.done_reason,
                        rawContentLength: raw.length,
                        thinkingLength: thinking.length,
                        rawPreview: (raw || thinking).slice(0, 100) || '(empty)',
                    });
                    return { result: null };
                }
                return {
                    result: {
                        text,
                        toolCalls: toolCallRecords,
                        model,
                        usage: data.usage,
                    },
                };
            }

            // Execute tool calls
            log.debug('Ollama tool calls received', {
                model,
                round,
                toolCount: ollamaPendingToolCalls.length,
                toolNames: ollamaPendingToolCalls.map(tc => tc.function.name),
            });

            workingMessages.push({
                role: 'assistant',
                content: msg.content ?? null,
                tool_calls: ollamaPendingToolCalls,
            });

            for (const tc of ollamaPendingToolCalls) {
                const tool = tools?.find(t => t.name === tc.function.name);
                let resultStr: string;

                if (tool?.execute) {
                    const { args } = parseAndNormalizeToolArgs(
                        tc.function.name,
                        tc.function.arguments,
                        model,
                        round,
                    );

                    log.debug('Ollama executing tool call', {
                        tool: tc.function.name,
                        argsKeys: Object.keys(args),
                        model,
                        round,
                    });
                    const result = await tool.execute(args);
                    log.debug('Ollama tool call executed', {
                        tool: tc.function.name,
                        resultType: typeof result,
                        resultPreview:
                            typeof result === 'string' ?
                                result.slice(0, 100)
                            :   JSON.stringify(result).slice(0, 100),
                        model,
                        round,
                    });
                    toolCallRecords.push({
                        name: tool.name,
                        arguments: args,
                        result,
                    });
                    resultStr =
                        typeof result === 'string' ? result : (
                            JSON.stringify(result)
                        );
                } else {
                    log.warn('Ollama tool not found for call', {
                        tool: tc.function.name,
                        availableTools: tools?.map(t => t.name) ?? [],
                        model,
                    });
                    const availableNames = tools?.map(t => t.name).join(', ') ?? 'none';
                    resultStr = `ERROR: Tool "${tc.function.name}" does not exist. Available tools: ${availableNames}. Use ONLY these exact tool names.`;
                }

                workingMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: resultStr,
                });
            }
        } catch (err) {
            log.warn('Ollama chat exception', {
                model,
                round,
                error: (err as Error).message?.slice(0, 200),
            });
            return {
                result: null,
                ...(shouldStopOllamaLocalFallback(spec, err) ? { stopLocalFallback: true } : {}),
            };
        }
    }

    // Exhausted tool rounds — return what we have
    return {
        result: {
            text: '',
            toolCalls: toolCallRecords,
            model,
            usage: undefined,
        },
    };
}

/**
 * Convert a plain JSON Schema property to a Zod type.
 * Handles string (with enum), number, integer, boolean.
 */
function jsonSchemaPropToZod(prop: Record<string, unknown>): z.ZodType {
    const enumValues = prop.enum as string[] | undefined;
    let zodType: z.ZodType;

    switch (prop.type) {
        case 'string':
            zodType =
                enumValues && enumValues.length > 0 ?
                    z.enum(enumValues as [string, ...string[]])
                :   z.string();
            break;
        case 'number':
            zodType = z.number();
            break;
        case 'integer':
            zodType = z.number().int();
            break;
        case 'boolean':
            zodType = z.boolean();
            break;
        default:
            zodType = z.unknown();
            break;
    }

    if (prop.description && typeof prop.description === 'string') {
        zodType = zodType.describe(prop.description);
    }

    return zodType;
}

/**
 * Convert a tool's plain JSON Schema `parameters` object to a Zod v4 schema.
 * The OpenRouter SDK expects `inputSchema` as a Zod object, not raw JSON Schema.
 * This bridges our ToolDefinition format to the SDK's expected format.
 */
function jsonSchemaToZod(
    schema: Record<string, unknown>,
): z.ZodObject<z.ZodRawShape> {
    const properties = (schema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
    >;
    const required = (schema.required as string[]) ?? [];

    const entries = Object.entries(properties).map(([key, prop]) => {
        const base = jsonSchemaPropToZod(prop);
        return [key, required.includes(key) ? base : base.optional()] as const;
    });

    return z.object(Object.fromEntries(entries));
}

/**
 * Direct /chat/completions call to OpenRouter, bypassing the SDK.
 * Used as a last-resort fallback when the SDK's /responses endpoint
 * doesn't parse the API response correctly (e.g. "Unexpected response type").
 * Text-only — no tool calling support.
 */
async function openRouterChatCompletions(
    model: string,
    messages: { role: string; content: string }[],
    temperature: number,
    maxTokens: number,
    deadlineAt?: number,
): Promise<string | null> {
    const remainingBudgetMs = deadlineAt ? getRemainingBudget(deadlineAt) : OPENROUTER_CHAT_TIMEOUT_MS;
    if (remainingBudgetMs <= 0) {
        log.warn('Skipping direct /chat/completions fallback because request budget is exhausted', {
            model,
        });
        return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        Math.min(OPENROUTER_CHAT_TIMEOUT_MS, remainingBudgetMs),
    );

    try {
        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    temperature,
                    max_tokens: maxTokens,
                }),
                signal: controller.signal,
            },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            log.warn('Direct /chat/completions HTTP error', {
                model,
                status: response.status,
            });
            return null;
        }

        const data = (await response.json()) as {
            choices?: [{ message?: { content?: string } }];
        };
        const text = extractFromXml(
            (data.choices?.[0]?.message?.content ?? '').trim(),
        );
        return text.length > 0 ? text : null;
    } catch (err) {
        clearTimeout(timeoutId);
        log.warn('Direct /chat/completions exception', {
            model,
            error: (err as Error).message?.slice(0, 200),
        });
        return null;
    }
}

/**
 * Convert our ToolDefinition format to the OpenRouter SDK's tool format.
 * Uses ToolType.Function with Zod v4 inputSchema and execute functions.
 */
function toOpenRouterTools(tools: ToolDefinition[]) {
    return tools.map(tool => ({
        type: ToolType.Function as const,
        function: {
            name: tool.name,
            description: tool.description,
            inputSchema: jsonSchemaToZod(tool.parameters),
            ...(tool.execute ?
                {
                    execute: async (params: Record<string, unknown>) => {
                        const result = await tool.execute!(params);
                        return result;
                    },
                }
            :   {}),
        },
    }));
}

/**
 * Track LLM usage to the ops_llm_usage table.
 * Fire-and-forget: errors are logged but don't affect the caller.
 */
async function trackUsage(
    model: string,
    usage: OpenResponsesUsage | null | undefined,
    durationMs: number,
    trackingContext?: {
        agentId?: string;
        context?: string;
        sessionId?: string;
    },
): Promise<void> {
    try {
        const agentId = trackingContext?.agentId ?? 'unknown';
        const context = trackingContext?.context ?? 'unknown';
        const sessionId = trackingContext?.sessionId ?? null;

        await sql`
            INSERT INTO ops_llm_usage (
                model,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                cost_usd,
                agent_id,
                context,
                session_id,
                duration_ms
            ) VALUES (
                ${model},
                ${usage?.inputTokens ?? null},
                ${usage?.outputTokens ?? null},
                ${usage?.totalTokens ?? null},
                ${usage?.cost ?? null},
                ${agentId},
                ${context},
                ${sessionId},
                ${durationMs}
            )
        `;
    } catch (error) {
        // Log error but don't throw — tracking should never break the main flow
        log.error('Failed to track LLM usage', {
            error,
            model,
            trackingContext,
        });
    }
}

/**
 * Generate text from messages, optionally with tools for function calling.
 * Uses the SDK `models` array for native API-level fallback routing.
 * When tools are provided, the SDK auto-executes them and returns the final text.
 */
export async function llmGenerate(
    options: LLMGenerateOptions,
): Promise<string> {
    const {
        messages,
        temperature = 0.7,
        maxTokens = 4000,
        model,
        tools,
        trackingContext,
    } = options;

    const startTime = Date.now();
    const totalDeadlineAt = startTime + LLM_TEXT_TOTAL_BUDGET_MS;

    log.debug('llmGenerate starting', {
        hasTools: !!(tools && tools.length > 0),
        messageCount: messages.length,
        model: model ?? 'auto',
        maxTokens,
        temperature,
        context: trackingContext?.context,
        agentId: trackingContext?.agentId,
    });

    // Separate system instructions from conversation messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    let resolvedOllamaModel = model;
    if (!resolvedOllamaModel && trackingContext?.context) {
        try {
            const routed = await resolveModels(trackingContext.context);
            const ollamaCandidate = routed.find((m: string) => m.includes(':'));
            if (ollamaCandidate) resolvedOllamaModel = ollamaCandidate;
        } catch { /* use default */ }
    }

    const preferOllamaFirst = shouldTryOllamaFirst(resolvedOllamaModel);
    const hasToolsDefined = tools && tools.length > 0;
    if (preferOllamaFirst) {
        const ollamaText = await tryOllamaFirst(
            messages,
            temperature,
            maxTokens,
            startTime,
            trackingContext,
            resolvedOllamaModel,
            totalDeadlineAt,
        );
        if (ollamaText) return ollamaText;
        if (isOllamaRoutedModel(resolvedOllamaModel)) {
            log.warn('Explicit Ollama/llama-line model request failed; skipping cloud fallback', {
                model: resolvedOllamaModel,
                context: trackingContext?.context,
            });
            return '';
        }
    }

    // ── OpenRouter fallback (only when enabled) ──
    if (!canUseOpenRouter()) {
        incLlmEmptyText({
            provider: 'ollama',
            context: trackingContext?.context,
            agentId: trackingContext?.agentId,
        });
        log.warn('Ollama returned empty and OpenRouter is disabled', {
            context: trackingContext?.context,
            agentId: trackingContext?.agentId,
            ollamaAvailable: !!(OLLAMA_API_KEY || OLLAMA_LOCAL_URL),
            durationMs: Date.now() - startTime,
        });
        return '';
    }

    const client = getClient();
    const resolved =
        model ?
            [normalizeModel(model)]
        :   await resolveModelsWithEnv(trackingContext?.context);
    const modelList = resolved.slice(0, MAX_MODELS_ARRAY);
    if (modelList.length === 0) {
        throw new Error('No LLM models available after resolution');
    }
    const openRouterDeadlineAt = Math.min(
        totalDeadlineAt,
        Date.now() + OPENROUTER_TEXT_BUDGET_MS,
    );

    const buildCallOpts = (
        spec: string | string[],
    ): Record<string, unknown> => {
        const isArray = Array.isArray(spec);
        const opts: Record<string, unknown> = {
            ...(isArray ? { models: spec } : { model: spec }),
            ...(isArray ? { provider: { allowFallbacks: true } } : {}),
            ...(systemMessage ? { instructions: systemMessage.content } : {}),
            input: conversationMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            temperature,
            maxOutputTokens: maxTokens,
        };
        if (tools && tools.length > 0) {
            opts.tools = toOpenRouterTools(tools);
            opts.maxToolRounds = options.maxToolRounds ?? 3;
        }
        return opts;
    };

    /** Try a call (models array or single model), return trimmed text or null if empty */
    async function tryCall(spec: string | string[]): Promise<string | null> {
        const remainingBudgetMs = getRemainingBudget(openRouterDeadlineAt);
        if (remainingBudgetMs <= 0) {
            throw Object.assign(new Error('OpenRouter text budget exhausted'), {
                statusCode: 504,
            });
        }

        const timeoutMs = Math.min(OPENROUTER_TEXT_TIMEOUT_MS, remainingBudgetMs);
        const { rawText, response } = await withTimeout(
            'OpenRouter text call',
            timeoutMs,
            async () => {
                const result = client.callModel(
                    buildCallOpts(spec) as Parameters<typeof client.callModel>[0],
                );
                const [textResult, responseResult] = await Promise.all([
                    result.getText(),
                    result.getResponse(),
                ]);
                return {
                    rawText: textResult?.trim() ?? '',
                    response: responseResult,
                };
            },
        );
        const text = extractFromXml(rawText);

        const durationMs = Date.now() - startTime;
        const usedModel = response.model || 'unknown';
        const usage = response.usage;

        void trackUsage(usedModel, usage, durationMs, trackingContext);

        if (text.length === 0) {
            incLlmEmptyText({
                provider: 'openrouter',
                context: trackingContext?.context,
                agentId: trackingContext?.agentId,
            });
            log.warn('LLM returned empty text', {
                model: usedModel,
                context: trackingContext?.context,
                rawTextLength: rawText.length,
                rawTextPreview: rawText.slice(0, 100) || '(empty)',
                outputTokens: usage?.outputTokens ?? 0,
                durationMs,
            });
        }

        return text.length > 0 ? text : null;
    }

    // 1) Try with models array
    const openRouterResult = await tryOpenRouterArray(tryCall, modelList, trackingContext?.context);

    // 2) Try remaining models individually
    if (!openRouterResult.text) {
        const individualText = await tryOpenRouterIndividual(
            tryCall,
            resolved,
            openRouterResult.error,
            openRouterDeadlineAt,
            trackingContext?.context,
        );
        if (individualText) return individualText;
    } else {
        return openRouterResult.text;
    }

    // 3) Ollama last resort (text-only)
    if (!preferOllamaFirst && openRouterResult.error && !hasToolsDefined) {
        log.debug('OpenRouter failed, retrying Ollama as last resort', {
            error: openRouterResult.error.message,
            statusCode: openRouterResult.error.statusCode,
        });
        const ollamaText = await tryOllamaLastResort(
            messages,
            temperature,
            maxTokens,
            startTime,
            trackingContext,
            totalDeadlineAt,
        );
        if (ollamaText) return ollamaText;
    }

    // Throw for known OpenRouter billing/rate errors
    throwForOpenRouterStatus(openRouterResult.error?.statusCode);

    // 4) Last resort: direct /chat/completions (bypasses SDK Responses API)
    if (canUseOpenRouter() && !hasToolsDefined) {
        const chatText = await tryDirectChatCompletions(
            resolved,
            messages,
            temperature,
            maxTokens,
            startTime,
            trackingContext,
            totalDeadlineAt,
        );
        if (chatText) return chatText;
    }

    log.warn('All LLM providers returned empty', {
        context: trackingContext?.context,
        agentId: trackingContext?.agentId,
        ollamaAvailable: !!(OLLAMA_API_KEY || OLLAMA_LOCAL_URL),
        openRouterModels: resolved,
        hadOpenRouterError: !!openRouterResult.error,
        durationMs: Date.now() - startTime,
    });

    return '';
}

/** Try the OpenRouter models array call. Returns text on success or the error on failure. */
async function tryOpenRouterArray(
    tryCall: (spec: string | string[]) => Promise<string | null>,
    modelList: string[],
    context?: string,
): Promise<{ text: string | null; error: { statusCode?: number; message?: string } | null }> {
    try {
        const text = await tryCall(modelList);
        if (text) return { text, error: null };
        log.debug('OpenRouter models array returned empty', { models: modelList, context });
        return { text: null, error: null };
    } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        log.warn('OpenRouter models array failed', {
            statusCode: err.statusCode,
            error: err.message?.slice(0, 200),
            models: modelList,
            context,
        });
        if (err.statusCode === 401) {
            throw new Error('Invalid OpenRouter API key — check your OPENROUTER_API_KEY');
        }
        return { text: null, error: err };
    }
}

/**
 * Try remaining models individually after the array call fails or returns empty.
 * When the array call threw, try ALL models; otherwise try only overflow models.
 */
export async function tryOpenRouterIndividual(
    tryCall: (spec: string) => Promise<string | null>,
    resolved: string[],
    openRouterError: { statusCode?: number; message?: string } | null,
    deadlineAt: number,
    context?: string,
): Promise<string | null> {
    if (openRouterError?.statusCode === 402 || openRouterError?.statusCode === 429) {
        return null;
    }

    const fallbackModels = (openRouterError ? resolved : resolved.slice(MAX_MODELS_ARRAY)).slice(
        0,
        OPENROUTER_MAX_INDIVIDUAL_FALLBACKS,
    );
    for (const fallback of fallbackModels) {
        if (getRemainingBudget(deadlineAt) <= 0) {
            log.warn('OpenRouter individual fallback budget exhausted', {
                context,
                attemptedModels: fallbackModels,
            });
            return null;
        }
        try {
            const text = await tryCall(fallback);
            if (text) return text;
        } catch (fbErr) {
            log.warn('OpenRouter individual fallback failed', {
                model: fallback,
                error: (fbErr as Error).message?.slice(0, 200),
                context,
            });
        }
    }
    return null;
}

/** Last-resort direct /chat/completions call bypassing the SDK. */
async function tryDirectChatCompletions(
    resolved: string[],
    messages: { role: string; content: string }[],
    temperature: number,
    maxTokens: number,
    startTime: number,
    trackingContext?: LLMGenerateOptions['trackingContext'],
    deadlineAt?: number,
): Promise<string | null> {
    const chatModel = resolved[0] ?? 'deepseek/deepseek-v3.2';
    try {
        const chatResult = await openRouterChatCompletions(
            chatModel,
            messages,
            temperature,
            maxTokens,
            deadlineAt,
        );
        if (chatResult) {
            log.info('Recovered via direct /chat/completions fallback', {
                model: chatModel,
                context: trackingContext?.context,
                textLength: chatResult.length,
            });
            void trackUsage(chatModel, null, Date.now() - startTime, trackingContext);
            return chatResult;
        }
    } catch (chatErr) {
        log.warn('Direct /chat/completions fallback failed', {
            model: chatModel,
            error: (chatErr as Error).message?.slice(0, 200),
        });
    }
    return null;
}

/**
 * Execute a single tool call: parse args, validate required params, run the tool.
 * Returns the result string for feeding back into the conversation and optionally
 * appends to the toolCallRecords array.
 */
async function executeToolCall(
    tc: { id: string; function: { name: string; arguments: string } },
    tools: ToolDefinition[],
    toolCallRecords: ToolCallRecord[],
    model: string,
    round: number,
): Promise<string> {
    const tool = tools.find(t => t.name === tc.function.name);

    if (!tool?.execute) {
        const availableNames = tools.map(t => t.name).join(', ');
        return `ERROR: Tool "${tc.function.name}" does not exist. Available tools: ${availableNames}. Use ONLY these exact tool names.`;
    }

    const { args } = parseAndNormalizeToolArgs(
        tc.function.name,
        tc.function.arguments,
        model,
        round,
    );

    // Validate required parameters before executing
    const required = (tool.parameters?.required as string[]) ?? [];
    const missing = required.filter(p => !(p in args) || args[p] == null);

    if (missing.length > 0) {
        log.warn(
            'Tool call missing required params after parse/repair/normalize',
            {
                tool: tc.function.name,
                missing,
                argsKeys: Object.keys(args),
                model,
                round,
            },
        );
        return JSON.stringify({
            error:
                `Missing required parameters: ${missing.join(', ')}. ` +
                `Your tool call output was truncated before these fields were emitted. ` +
                `If writing long content, split into smaller chunks using the "append" parameter ` +
                `or reduce the content length.`,
        });
    }

    log.debug('Executing tool call', {
        tool: tc.function.name,
        argsKeys: Object.keys(args),
        round,
        model,
    });
    const result = await tool.execute(args);
    log.debug('Tool call executed', {
        tool: tc.function.name,
        resultType: typeof result,
        resultPreview:
            typeof result === 'string' ?
                result.slice(0, 100)
            :   JSON.stringify(result).slice(0, 100),
        round,
        model,
    });
    toolCallRecords.push({ name: tool.name, arguments: args, result });
    return typeof result === 'string' ? result : JSON.stringify(result);
}

/** Response type for the OpenRouter /chat/completions API */
interface ChatCompletionsResponse {
    choices?: [
        {
            message?: {
                content?: string;
                tool_calls?: Array<{
                    id: string;
                    function: { name: string; arguments: string };
                }>;
            };
        },
    ];
    model?: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

/** Working message type for the tool-calling conversation loop */
type ToolWorkingMessage = {
    role: string;
    content: string | null;
    tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
};

/**
 * Run the OpenRouter tool-calling loop via raw /chat/completions.
 * Bypasses the SDK because the SDK's JSON parser can't repair truncated
 * tool call arguments. Returns the final text and tool call records.
 */
async function openRouterToolLoop(opts: {
    messages: ToolWorkingMessage[];
    tools: ToolDefinition[];
    openaiTools: Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: Record<string, unknown>;
        };
    }>;
    modelList: string[];
    temperature: number;
    maxTokens: number;
    maxToolRounds: number;
    trackingContext?: LLMGenerateOptions['trackingContext'];
    startTime: number;
    deadlineAt?: number;
}): Promise<LLMToolResult> {
    const {
        messages: workingMessages,
        tools,
        openaiTools,
        modelList,
        temperature,
        maxTokens,
        maxToolRounds,
        trackingContext,
        startTime,
    } = opts;

    const toolCallRecords: ToolCallRecord[] = [];
    let lastModel = 'unknown';
    let lastUsage: OpenResponsesUsage | null = null;
    let bestText = '';
    const deadlineAt = Math.min(
        opts.deadlineAt ?? Number.MAX_SAFE_INTEGER,
        startTime + OPENROUTER_TOOL_BUDGET_MS,
    );

    for (let round = 0; round <= maxToolRounds; round++) {
        const remainingBudgetMs = getRemainingBudget(deadlineAt);
        if (remainingBudgetMs <= 0) {
            log.warn('OpenRouter tool loop budget exhausted', {
                round,
                maxToolRounds,
                context: trackingContext?.context,
                modelList,
            });
            break;
        }

        log.debug('Tool round starting', {
            round,
            maxToolRounds,
            workingMessageCount: workingMessages.length,
            toolCallRecordsSoFar: toolCallRecords.length,
            context: trackingContext?.context,
        });

        const body: Record<string, unknown> = {
            messages: workingMessages,
            temperature,
            max_tokens: maxTokens,
        };

        if (modelList.length > 1) {
            body.models = modelList;
            body.provider = { allow_fallbacks: true };
        } else {
            body.model = modelList[0];
        }

        if (openaiTools.length > 0) {
            body.tools = openaiTools;
            if (round >= maxToolRounds) {
                body.tool_choice = 'none';
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            Math.min(OPENROUTER_TOOL_TIMEOUT_MS, remainingBudgetMs),
        );

        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://subcorp.subcult.tv',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            const statusCode = response.status;
            throw Object.assign(
                new Error(
                    `OpenRouter API error: ${statusCode} ${errBody.slice(0, 200)}`,
                ),
                { statusCode },
            );
        }

        const data = (await response.json()) as ChatCompletionsResponse;

        lastModel = data.model ?? 'unknown';
        if (data.usage) {
            lastUsage = {
                inputTokens: data.usage.prompt_tokens ?? 0,
                outputTokens: data.usage.completion_tokens ?? 0,
                totalTokens:
                    (data.usage.prompt_tokens ?? 0) +
                    (data.usage.completion_tokens ?? 0),
            } as unknown as OpenResponsesUsage;
        }

        const msg = data.choices?.[0]?.message;
        if (!msg) {
            log.warn('OpenRouter returned empty message', {
                round,
                model: lastModel,
            });
            break;
        }

        let pendingToolCalls = filterPhantomToolCalls(msg.tool_calls, {
            model: lastModel,
            round,
            trackingContext: trackingContext?.context,
        });

        log.debug('API response received', {
            round,
            model: lastModel,
            hasContent: !!msg.content,
            contentLength: msg.content?.length ?? 0,
            contentPreview: msg.content?.slice(0, 150) || '(empty)',
            apiToolCallCount: pendingToolCalls?.length ?? 0,
            apiToolCallNames:
                pendingToolCalls?.map(tc => tc.function.name) ?? [],
            context: trackingContext?.context,
        });

        // Detect DSML/XML text tool calls when API returned none
        if (
            (!pendingToolCalls || pendingToolCalls.length === 0) &&
            msg.content
        ) {
            const dsmlCalls = parseDsmlToolCalls(msg.content, tools);
            if (dsmlCalls.length > 0) {
                pendingToolCalls = dsmlCalls;
                log.info('Recovered tool calls from DSML text', {
                    count: dsmlCalls.length,
                    tools: dsmlCalls.map(tc => tc.function.name),
                    model: lastModel,
                    round,
                    context: trackingContext?.context,
                });
            }
        }

        // No tool calls → return text
        if (!pendingToolCalls || pendingToolCalls.length === 0) {
            const raw = msg.content ?? '';
            const text = extractFromXml(raw).trim();
            const finalText = text || bestText;

            void trackUsage(
                lastModel,
                lastUsage,
                Date.now() - startTime,
                trackingContext,
            );
            return { text: finalText, toolCalls: toolCallRecords };
        }

        // Process tool calls
        log.debug('Processing tool calls', {
            round,
            model: lastModel,
            toolCount: pendingToolCalls.length,
            toolNames: pendingToolCalls.map(tc => tc.function.name),
            context: trackingContext?.context,
        });

        workingMessages.push({
            role: 'assistant',
            content: msg.content ?? null,
            tool_calls: pendingToolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: tc.function,
            })),
        });

        if (msg.content) {
            const roundText = extractFromXml(msg.content).trim();
            if (roundText.length > bestText.length) {
                bestText = roundText;
            }
        }

        for (const tc of pendingToolCalls) {
            const resultStr = await executeToolCall(
                tc,
                tools,
                toolCallRecords,
                lastModel,
                round,
            );
            workingMessages.push({
                role: 'tool',
                content: resultStr,
                tool_call_id: tc.id,
            });
        }
    }

    // Exhausted all rounds — return what we have
    void trackUsage(
        lastModel,
        lastUsage,
        Date.now() - startTime,
        trackingContext,
    );
    return { text: bestText, toolCalls: toolCallRecords };
}

/**
 * Generate text with tools and return structured results including tool call records.
 * Uses the SDK `models` array for native API-level fallback routing.
 * Use this when you need to know which tools were invoked and their results.
 */
export async function llmGenerateWithTools(
    options: LLMGenerateOptions,
): Promise<LLMToolResult> {
    const {
        messages,
        temperature = 0.7,
        maxTokens = 4000,
        model,
        tools = [],
        maxToolRounds = 3,
        trackingContext,
    } = options;

    const startTime = Date.now();
    const hasTools = tools.length > 0;
    const totalDeadlineAt = startTime + LLM_TOOL_TOTAL_BUDGET_MS;

    log.debug('llmGenerateWithTools starting', {
        hasTools,
        toolNames: tools.map(t => t.name),
        messageCount: messages.length,
        model: model ?? 'auto',
        maxTokens,
        maxToolRounds,
        temperature,
        context: trackingContext?.context,
        agentId: trackingContext?.agentId,
    });

    // ── Try Ollama first — WITH tool support ──
    // Resolve context-specific Ollama model if no explicit model given
    let resolvedModel = model;
    if (!resolvedModel && trackingContext?.context) {
        try {
            const routed = await resolveModels(trackingContext.context);
            const ollamaCandidate = routed.find((m: string) => m.includes(':'));
            if (ollamaCandidate) resolvedModel = ollamaCandidate;
        } catch { /* use default */ }
    }
    const preferOllamaFirst = hasTools || shouldTryOllamaFirst(resolvedModel);
    if (preferOllamaFirst) {
        const ollamaResult = await ollamaChat(messages, temperature, {
            maxTokens,
            tools: hasTools ? tools : undefined,
            maxToolRounds,
            model: resolvedModel,
            deadlineAt: totalDeadlineAt,
            trackingContext,
        });
        if (ollamaResult?.text || (ollamaResult?.toolCalls && ollamaResult.toolCalls.length > 0)) {
            if (!ollamaResult.text && ollamaResult.toolCalls.length > 0) {
                incLlmEmptyToolRound({
                    provider: 'ollama-tools',
                    context: trackingContext?.context,
                    agentId: trackingContext?.agentId,
                });
            }
            log.debug('Ollama succeeded (with tools)', {
                model: ollamaResult.model,
                context: trackingContext?.context,
                textLength: ollamaResult.text.length,
                toolCallCount: ollamaResult.toolCalls.length,
            });
            void trackUsage(
                `ollama/${ollamaResult.model}`,
                toOpenResponsesUsage(ollamaResult.usage),
                Date.now() - startTime,
                trackingContext,
            );
            return { text: ollamaResult.text, toolCalls: ollamaResult.toolCalls };
        }

        if (isOllamaRoutedModel(resolvedModel)) {
            log.warn('Explicit Ollama/llama-line tool-call model failed; skipping cloud fallback', {
                model: resolvedModel,
                context: trackingContext?.context,
            });
            return { text: '', toolCalls: [] };
        }
    }

    // ── OpenRouter fallback (only when enabled) ──
    if (!canUseOpenRouter()) {
        incLlmEmptyText({
            provider: 'ollama-tools',
            context: trackingContext?.context,
            agentId: trackingContext?.agentId,
        });
        log.warn('Ollama returned empty and OpenRouter is disabled (tool call)', {
            context: trackingContext?.context,
            agentId: trackingContext?.agentId,
            hasTools,
            toolNames: tools.map(t => t.name),
        });
        return { text: '', toolCalls: [] };
    }

    // ── OpenRouter (cloud) — raw fetch with JSON repair ──
    const resolved =
        model ?
            [normalizeModel(model)]
        :   await resolveModelsWithEnv(trackingContext?.context);
    const modelList = resolved.slice(0, MAX_MODELS_ARRAY);

    const openaiTools = tools.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));

    const workingMessages: ToolWorkingMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    try {
        return await openRouterToolLoop({
            messages: workingMessages,
            tools,
            openaiTools,
            modelList,
            temperature,
            maxTokens,
            maxToolRounds,
            trackingContext,
            startTime,
            deadlineAt: totalDeadlineAt,
        });
    } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };

        // Retry Ollama text-only as last resort — gives a proper conversational
        // response instead of garbage from the failed tool-calling attempt.
        log.debug('OpenRouter failed, trying Ollama text-only fallback', {
            error: err.message,
            statusCode: err.statusCode,
        });
        const ollamaText = await tryOllamaLastResort(
            messages,
            temperature,
            maxTokens,
            startTime,
            trackingContext,
            totalDeadlineAt,
        );
        if (ollamaText) return { text: ollamaText, toolCalls: [] };

        if (err.statusCode === 401) {
            throw new Error('Invalid OpenRouter API key — check your OPENROUTER_API_KEY');
        }
        throwForOpenRouterStatus(err.statusCode);
        throw new Error(`LLM API error: ${err.message ?? 'unknown error'}`);
    }
}

/**
 * Parse DSML/XML text tool calls into structured tool call objects.
 *
 * DeepSeek models trained on Anthropic data sometimes emit tool calls as text using
 * DSML tags (e.g. <｜DSML｜invoke name="bash"><｜DSML｜prompt>...</｜DSML｜prompt>)
 * or standard XML (<invoke name="bash"><parameter name="command">...</parameter>).
 * This extracts them into the same format as API tool_calls so they can be executed.
 */
function parseDsmlToolCalls(
    text: string,
    availableTools: Array<{
        name: string;
        parameters?: Record<string, unknown>;
    }>,
): Array<{ id: string; function: { name: string; arguments: string } }> {
    // Normalize DSML to standard XML
    const normalized = normalizeDsml(text);

    // Match <invoke name="toolname">...params...</invoke> blocks
    const invokePattern =
        /<invoke\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/invoke>/gi;
    const calls: Array<{
        id: string;
        function: { name: string; arguments: string };
    }> = [];
    const toolNames = new Set(availableTools.map(t => t.name));

    let match;
    while ((match = invokePattern.exec(normalized)) !== null) {
        const toolName = match[1];
        const body = match[2];

        // Only parse calls to tools that actually exist
        if (!toolNames.has(toolName)) continue;

        // Extract parameters — supports both <parameter name="x">val</parameter> and <x>val</x>
        const args: Record<string, string> = {};
        const paramPattern =
            /<parameter\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/parameter>/gi;
        let paramMatch;
        while ((paramMatch = paramPattern.exec(body)) !== null) {
            args[paramMatch[1]] = paramMatch[2].trim();
        }

        // If no <parameter> tags found, try bare tags (DSML style: <prompt>...</prompt>)
        if (Object.keys(args).length === 0) {
            const barePattern = /<([a-z_][a-z0-9_]*)>([\s\S]*?)<\/\1>/gi;
            let bareMatch;
            while ((bareMatch = barePattern.exec(body)) !== null) {
                args[bareMatch[1]] = bareMatch[2].trim();
            }
        }

        if (Object.keys(args).length > 0) {
            // Normalize param aliases in DSML-parsed args
            const { normalized } = normalizeToolArgs(toolName, args);

            calls.push({
                id: `dsml_${Date.now()}_${calls.length}`,
                function: {
                    name: toolName,
                    arguments: JSON.stringify(normalized),
                },
            });
        }
    }

    return calls;
}

/**
 * Extract meaningful content from LLM output that may contain XML function call wrappers.
 *
 * Models trained on Anthropic's XML format sometimes emit tool calls as text:
 *   <function_calls><invoke name="file_write"><parameter name="content">...actual content...</parameter></invoke></function_calls>
 *
 * Instead of destroying this content by stripping tags, we extract it:
 * 1. Look for content inside <parameter name="content"> tags — that's the real output
 * 2. If no content parameter, collect all text outside XML tags
 * 3. If no XML detected, return text as-is
 */
export function extractFromXml(text: string): string {
    // Normalize DeepSeek DSML tags to standard XML
    text = normalizeDsml(text);

    // Quick check — if no XML function call patterns, return as-is
    if (!/<(?:function_?calls?|invoke|parameter)\b/i.test(text)) {
        return text;
    }

    // Extract content from <parameter name="content"...>...</parameter> (greedy — gets the longest match)
    const contentMatch = text.match(
        /<parameter\s+name=["']content["'][^>]*>([\s\S]*?)<\/parameter>/i,
    );
    if (contentMatch?.[1]) {
        return contentMatch[1].trim();
    }

    // No content parameter — extract all parameter values as fallback
    const paramMatches = [
        ...text.matchAll(
            /<parameter\s+name=["'][^"']*["'][^>]*>([\s\S]*?)<\/parameter>/gi,
        ),
    ];
    if (paramMatches.length > 0) {
        // Return the longest parameter value (most likely to be the real content)
        return paramMatches
            .map(m => m[1].trim())
            .sort((a, b) => b.length - a.length)[0];
    }

    // XML detected but no parameter tags — strip tags and return what's left
    const stripped = text
        .replace(
            /<\/?(?:function_?calls?|invoke|parameter|tool_call|antml:[a-z_]+)[^>]*>/gi,
            '',
        )
        .replace(/\s{2,}/g, ' ')
        .trim();
    // Return stripped text even if empty — don't fall back to raw XML
    return stripped;
}

/**
 * Sanitize dialogue output:
 * - Extract content from XML function call wrappers (if present)
 * - Strip any remaining XML-like tags
 * - Strip URLs
 * - Remove markdown formatting
 * - Trim whitespace
 * Does NOT truncate — the full response is preserved.
 */
export function sanitizeDialogue(text: string): string {
    return (
        extractFromXml(text)
            // Strip any remaining XML-style tags
            .replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, '')
            // Remove URLs
            .replace(/https?:\/\/\S+/g, '')
            // Remove markdown bold/italic
            .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
            // Remove quotes wrapping the entire response
            .replace(/^["']|["']$/g, '')
            // Collapse whitespace
            .replace(/\s+/g, ' ')
            .trim()
    );
}

// ─── Cross-Cutting Prompt Utilities (P22-24) ───

/**
 * Rough token estimate: ~4 characters per token for English text.
 * Not exact, but useful for budgeting prompts before sending to the LLM.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Robust JSON extraction from LLM output.
 * Handles: raw JSON, markdown code fences, XML-wrapped content,
 * and multiple JSON objects (picks the largest).
 * Falls back to repairTruncatedJson for incomplete output.
 * Returns null if no valid JSON can be extracted.
 */
export function extractJson<T = Record<string, unknown>>(
    text: string,
): T | null {
    // Strip markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1];

    // Strip XML wrappers if present
    text = extractFromXml(text);

    // Find all top-level JSON objects
    const candidates: string[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '\\' && inString) {
            i++;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && start >= 0) {
                candidates.push(text.slice(start, i + 1));
                start = -1;
            }
        }
    }

    // If we found an unclosed object, try to repair it
    if (depth > 0 && start >= 0) {
        try {
            const repaired = repairTruncatedJson(text.slice(start));
            return repaired as T;
        } catch {
            /* fall through */
        }
    }

    // Pick the largest valid JSON object
    for (const candidate of candidates.sort((a, b) => b.length - a.length)) {
        try {
            return JSON.parse(candidate) as T;
        } catch {
            /* try next */
        }
    }

    return null;
}

/**
 * Build a clearly delimited prompt section with consistent formatting.
 * Uses ═══ SECTION ═══ borders for major sections.
 */
export function promptSection(title: string, content: string): string {
    return `═══ ${title.toUpperCase()} ═══\n${content}\n`;
}
