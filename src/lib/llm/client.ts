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
import { resolveModels } from './model-routing';

const log = logger.child({ module: 'llm' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';

/** Normalize model ID — strip erroneous openrouter/ prefix (only openrouter/auto is valid with that prefix) */
function normalizeModel(id: string): string {
    if (id === 'openrouter/auto') return id;
    if (id.startsWith('openrouter/')) return id.slice('openrouter/'.length);
    return id;
}

/** OpenRouter limits the `models` array to 3 items. Slice for API calls; full list used by individual fallback loop. */
const MAX_MODELS_ARRAY = 3;

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
        if (!OPENROUTER_API_KEY) {
            throw new Error(
                'Missing OPENROUTER_API_KEY environment variable. Set it in .env.local',
            );
        }
        _client = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
    }
    return _client;
}

/** Re-export the singleton for direct SDK access when needed */
export { getClient as getOpenRouterClient };

// ─── Ollama (cloud via ollama.com + local via Tailscale) ───
// Set OLLAMA_ENABLED=false to disable all Ollama paths (defaults to true when credentials exist)

const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED !== 'false';
const OLLAMA_LOCAL_URL =
    OLLAMA_ENABLED ? (process.env.OLLAMA_BASE_URL ?? '') : '';
const OLLAMA_CLOUD_URL = 'https://ollama.com';
const OLLAMA_API_KEY = OLLAMA_ENABLED ? (process.env.OLLAMA_API_KEY ?? '') : '';
const OLLAMA_TIMEOUT_MS = 60_000;

interface OllamaModelSpec {
    model: string;
    baseUrl: string;
    apiKey?: string;
}

/**
 * Ordered fallback chain — cloud models first (free, capable), local models as fallback.
 * Cloud models hit ollama.com with API key auth.
 * Local models hit the Tailscale Ollama instance.
 */
function getOllamaModels(): OllamaModelSpec[] {
    const models: OllamaModelSpec[] = [];

    // Cloud models via ollama.com (fast, capable, free)
    if (OLLAMA_API_KEY) {
        models.push(
            {
                model: 'deepseek-v3.2:cloud',
                baseUrl: OLLAMA_CLOUD_URL,
                apiKey: OLLAMA_API_KEY,
            },
            {
                model: 'kimi-k2.5:cloud',
                baseUrl: OLLAMA_CLOUD_URL,
                apiKey: OLLAMA_API_KEY,
            },
            {
                model: 'gemini-3-flash-preview:latest',
                baseUrl: OLLAMA_CLOUD_URL,
                apiKey: OLLAMA_API_KEY,
            },
        );
    }

    // Local models via Tailscale (always available, no auth)
    if (OLLAMA_LOCAL_URL) {
        models.push(
            { model: 'qwen3-coder:30b', baseUrl: OLLAMA_LOCAL_URL },
            { model: 'llama3.2:latest', baseUrl: OLLAMA_LOCAL_URL },
        );
    }

    return models;
}

/** Strip <think>...</think> blocks from reasoning model output */
function stripThinking(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
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
    },
): Promise<OllamaChatResult | null> {
    const models = getOllamaModels();
    if (models.length === 0) return null;

    const maxTokens = options?.maxTokens ?? 250;
    const tools = options?.tools;
    const maxToolRounds = options?.maxToolRounds ?? 3;

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

    for (const spec of models) {
        const result = await ollamaChatWithModel(
            spec,
            messages,
            temperature,
            maxTokens,
            tools,
            openaiTools,
            maxToolRounds,
        );
        if (result) return result;
    }

    return null;
}

/** Try a single Ollama model. Returns result or null on failure. */
async function ollamaChatWithModel(
    spec: OllamaModelSpec,
    messages: { role: string; content: string }[],
    temperature: number,
    maxTokens: number,
    tools: ToolDefinition[] | undefined,
    openaiTools:
        | Array<{
              type: 'function';
              function: {
                  name: string;
                  description: string;
                  parameters: Record<string, unknown>;
              };
          }>
        | undefined,
    maxToolRounds: number,
): Promise<OllamaChatResult | null> {
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
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                OLLAMA_TIMEOUT_MS,
            );

            const body: Record<string, unknown> = {
                model,
                messages: workingMessages,
                temperature,
                max_tokens: maxTokens,
            };
            // Only include tools if we haven't exhausted rounds
            if (openaiTools && round < maxToolRounds) {
                body.tools = openaiTools;
            }

            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            if (!response.ok) {
                log.debug('Ollama model failed', {
                    model,
                    baseUrl,
                    status: response.status,
                });
                return null;
            }

            const data = (await response.json()) as {
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
                usage?: OllamaUsage;
            };

            const msg = data.choices?.[0]?.message;
            if (!msg) return null;

            const pendingToolCalls = msg.tool_calls;

            // No tool calls → return text (extract content from XML wrappers if present)
            if (!pendingToolCalls || pendingToolCalls.length === 0) {
                const raw = msg.content ?? '';
                const text = extractFromXml(stripThinking(raw)).trim();
                if (text.length === 0 && toolCallRecords.length === 0)
                    return null;
                return {
                    text,
                    toolCalls: toolCallRecords,
                    model,
                    usage: data.usage,
                };
            }

            // Execute tool calls
            workingMessages.push({
                role: 'assistant',
                content: msg.content ?? null,
                tool_calls: pendingToolCalls,
            });

            for (const tc of pendingToolCalls) {
                const tool = tools?.find(t => t.name === tc.function.name);
                let resultStr: string;

                if (tool?.execute) {
                    let args: Record<string, unknown>;
                    try {
                        args = JSON.parse(tc.function.arguments);
                    } catch {
                        try {
                            args = repairTruncatedJson(tc.function.arguments);
                            log.warn('Repaired truncated tool call JSON', {
                                tool: tc.function.name,
                                original: tc.function.arguments.slice(0, 200),
                            });
                        } catch {
                            log.warn('Unrecoverable malformed tool call JSON', {
                                tool: tc.function.name,
                                arguments: tc.function.arguments.slice(0, 200),
                            });
                            args = {};
                        }
                    }
                    const result = await tool.execute(args);
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
                    resultStr = `Tool ${tc.function.name} not available`;
                }

                workingMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: resultStr,
                });
            }
        } catch (err) {
            log.debug('Ollama chat error', {
                model,
                error: (err as Error).message,
            });
            return null;
        }
    }

    // Exhausted tool rounds — return what we have
    return { text: '', toolCalls: toolCallRecords, model, usage: undefined };
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
        maxTokens = 200,
        model,
        tools,
        trackingContext,
    } = options;

    const client = getClient();
    const startTime = Date.now();

    // Separate system instructions from conversation messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // ── Try Ollama first — but ONLY when no tools are needed ──
    // Ollama cloud models can't use function calling; skip to avoid wasting ~22s/round
    const hasToolsDefined = tools && tools.length > 0;
    if (!hasToolsDefined && (OLLAMA_API_KEY || OLLAMA_LOCAL_URL)) {
        const ollamaResult = await ollamaChat(messages, temperature, {
            maxTokens,
        });
        if (ollamaResult?.text) {
            const ollamaUsage =
                ollamaResult.usage ?
                    ({
                        inputTokens: ollamaResult.usage.prompt_tokens ?? 0,
                        outputTokens: ollamaResult.usage.completion_tokens ?? 0,
                        totalTokens: ollamaResult.usage.total_tokens ?? 0,
                    } as unknown as OpenResponsesUsage)
                :   null;
            void trackUsage(
                `ollama/${ollamaResult.model}`,
                ollamaUsage,
                Date.now() - startTime,
                trackingContext,
            );
            return ollamaResult.text;
        }
    }

    // ── OpenRouter (cloud) ──
    // Resolve model list: explicit override → single model, otherwise → dynamic routing (DB + env + defaults)
    const resolved =
        model ?
            [normalizeModel(model)]
        :   await resolveModelsWithEnv(trackingContext?.context);
    const modelList = resolved.slice(0, MAX_MODELS_ARRAY);
    if (modelList.length === 0) {
        throw new Error('No LLM models available after resolution');
    }

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
        const result = client.callModel(
            buildCallOpts(spec) as Parameters<typeof client.callModel>[0],
        );
        const rawText = (await result.getText())?.trim() ?? '';
        const text = extractFromXml(rawText);

        // Track usage after successful getText
        const durationMs = Date.now() - startTime;
        const response = await result.getResponse();
        const usedModel = response.model || 'unknown';
        const usage = response.usage;

        // Fire-and-forget tracking (errors logged internally by trackUsage)
        void trackUsage(usedModel, usage, durationMs, trackingContext);

        return text.length > 0 ? text : null;
    }

    // 1) Try with models array — OpenRouter handles provider routing natively
    let openRouterError: { statusCode?: number; message?: string } | null =
        null;
    try {
        const text = await tryCall(modelList);
        if (text) return text;
    } catch (error: unknown) {
        openRouterError = error as { statusCode?: number; message?: string };
        if (openRouterError.statusCode === 401) {
            throw new Error(
                'Invalid OpenRouter API key — check your OPENROUTER_API_KEY',
            );
        }
        // 402/429/other — fall through to individual models, then Ollama retry
    }

    // 2) If models array returned empty or errored, try remaining models individually
    if (
        !openRouterError ||
        (openRouterError.statusCode !== 402 &&
            openRouterError.statusCode !== 429)
    ) {
        for (const fallback of resolved.slice(MAX_MODELS_ARRAY)) {
            try {
                const text = await tryCall(fallback);
                if (text) return text;
            } catch {
                // Continue to next
            }
        }
    }

    // 3) If OpenRouter failed entirely, retry Ollama as last resort (text-only, no tools)
    if (
        openRouterError &&
        !hasToolsDefined &&
        (OLLAMA_API_KEY || OLLAMA_LOCAL_URL)
    ) {
        log.debug('OpenRouter failed, retrying Ollama as last resort', {
            error: openRouterError.message,
            statusCode: openRouterError.statusCode,
        });
        const retryResult = await ollamaChat(messages, temperature, {
            maxTokens,
        });
        if (retryResult?.text) {
            const ollamaUsage =
                retryResult.usage ?
                    ({
                        inputTokens: retryResult.usage.prompt_tokens ?? 0,
                        outputTokens: retryResult.usage.completion_tokens ?? 0,
                        totalTokens: retryResult.usage.total_tokens ?? 0,
                    } as unknown as OpenResponsesUsage)
                :   null;
            void trackUsage(
                `ollama/${retryResult.model}`,
                ollamaUsage,
                Date.now() - startTime,
                trackingContext,
            );
            return retryResult.text;
        }
    }

    // If we had a specific OpenRouter error and nothing else worked, throw it
    if (openRouterError?.statusCode === 402) {
        throw new Error(
            'Insufficient OpenRouter credits — add credits at openrouter.ai',
        );
    }
    if (openRouterError?.statusCode === 429) {
        throw new Error('OpenRouter rate limited — try again shortly');
    }

    return '';
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
        maxTokens = 200,
        model,
        tools = [],
        maxToolRounds = 3,
        trackingContext,
    } = options;

    const startTime = Date.now();
    const hasTools = tools.length > 0;

    // ── Try Ollama first — but ONLY when no tools are needed ──
    // Ollama cloud models can't use function calling; attempting them wastes ~22s
    // per round before falling through to OpenRouter, causing session timeouts.
    if (!hasTools && (OLLAMA_API_KEY || OLLAMA_LOCAL_URL)) {
        const ollamaResult = await ollamaChat(messages, temperature, {
            maxTokens,
        });

        if (ollamaResult?.text) {
            const ollamaUsage =
                ollamaResult.usage ?
                    ({
                        inputTokens: ollamaResult.usage.prompt_tokens ?? 0,
                        outputTokens: ollamaResult.usage.completion_tokens ?? 0,
                        totalTokens: ollamaResult.usage.total_tokens ?? 0,
                    } as unknown as OpenResponsesUsage)
                :   null;
            void trackUsage(
                `ollama/${ollamaResult.model}`,
                ollamaUsage,
                Date.now() - startTime,
                trackingContext,
            );
            return {
                text: ollamaResult.text,
                toolCalls: [],
            };
        }
    }

    // ── OpenRouter (cloud) — raw fetch with JSON repair ──
    // We bypass the SDK's callModel for tool execution because the SDK's
    // JSON parser cannot repair truncated tool call arguments. Using raw
    // fetch gives us control over parsing (repairTruncatedJson) and proper
    // maxToolRounds enforcement.
    const resolved =
        model ?
            [normalizeModel(model)]
        :   await resolveModelsWithEnv(trackingContext?.context);
    const modelList = resolved.slice(0, MAX_MODELS_ARRAY);

    const toolCallRecords: ToolCallRecord[] = [];

    // Convert tools to OpenAI function-calling format
    const openaiTools = tools.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));

    // Build working messages (mutable for tool result feeding)
    type WorkingMessage = {
        role: string;
        content: string | null;
        tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
        }>;
        tool_call_id?: string;
    };
    const workingMessages: WorkingMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    try {
        let lastModel = 'unknown';
        let lastUsage: OpenResponsesUsage | null = null;

        for (let round = 0; round <= maxToolRounds; round++) {
            const body: Record<string, unknown> = {
                messages: workingMessages,
                temperature,
                max_tokens: maxTokens,
            };

            // Use models array for fallback routing
            if (modelList.length > 1) {
                body.models = modelList;
                body.provider = { allow_fallbacks: true };
            } else {
                body.model = modelList[0];
            }

            // Only include tools if we haven't exhausted rounds
            if (openaiTools.length > 0 && round < maxToolRounds) {
                body.tools = openaiTools;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120_000);

            const response = await fetch(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://subcult.org',
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

            const data = (await response.json()) as {
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
            };

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

            let pendingToolCalls = msg.tool_calls;

            // Detect DSML/XML text tool calls when API returned none
            // DeepSeek models sometimes emit tool calls as DSML text instead of
            // using the API tool_calls mechanism. Parse them into real tool calls.
            if (
                (!pendingToolCalls || pendingToolCalls.length === 0) &&
                msg.content
            ) {
                const dsmlCalls = parseDsmlToolCalls(msg.content, tools);
                if (dsmlCalls.length > 0) {
                    pendingToolCalls = dsmlCalls;
                    log.debug('Recovered tool calls from DSML text', {
                        count: dsmlCalls.length,
                        tools: dsmlCalls.map(tc => tc.function.name),
                        model: lastModel,
                    });
                }
            }

            // No tool calls → return text
            if (!pendingToolCalls || pendingToolCalls.length === 0) {
                const raw = msg.content ?? '';
                const text = extractFromXml(raw).trim();

                const durationMs = Date.now() - startTime;
                void trackUsage(
                    lastModel,
                    lastUsage,
                    durationMs,
                    trackingContext,
                );

                return { text, toolCalls: toolCallRecords };
            }

            // ── Process tool calls with JSON repair ──
            workingMessages.push({
                role: 'assistant',
                content: msg.content ?? null,
                tool_calls: pendingToolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: tc.function,
                })),
            });

            for (const tc of pendingToolCalls) {
                const tool = tools.find(t => t.name === tc.function.name);
                let resultStr: string;

                if (tool?.execute) {
                    let args: Record<string, unknown>;
                    try {
                        args = JSON.parse(tc.function.arguments);
                    } catch {
                        try {
                            args = repairTruncatedJson(tc.function.arguments);
                            log.warn('Repaired truncated tool call JSON', {
                                tool: tc.function.name,
                                original: tc.function.arguments.slice(0, 200),
                            });
                        } catch {
                            log.warn('Unrecoverable malformed tool call JSON', {
                                tool: tc.function.name,
                                arguments: tc.function.arguments.slice(0, 200),
                            });
                            args = {};
                        }
                    }

                    // Validate required parameters before executing
                    const required =
                        (tool.parameters?.required as string[]) ?? [];
                    const missing = required.filter(
                        p => !(p in args) || args[p] == null,
                    );

                    if (missing.length > 0) {
                        log.warn(
                            'Tool call missing required params after parse/repair',
                            {
                                tool: tc.function.name,
                                missing,
                                argsKeys: Object.keys(args),
                            },
                        );
                        resultStr = JSON.stringify({
                            error:
                                `Missing required parameters: ${missing.join(', ')}. ` +
                                `Your tool call output was truncated before these fields were emitted. ` +
                                `If writing long content, split into smaller chunks using the "append" parameter ` +
                                `or reduce the content length.`,
                        });
                    } else {
                        const result = await tool.execute(args);
                        toolCallRecords.push({
                            name: tool.name,
                            arguments: args,
                            result,
                        });
                        resultStr =
                            typeof result === 'string' ? result : (
                                JSON.stringify(result)
                            );
                    }
                } else {
                    resultStr = `Tool ${tc.function.name} not available`;
                }

                workingMessages.push({
                    role: 'tool',
                    content: resultStr,
                    tool_call_id: tc.id,
                });
            }
        }

        // Exhausted all rounds — return what we have
        const durationMs = Date.now() - startTime;
        void trackUsage(lastModel, lastUsage, durationMs, trackingContext);
        return { text: '', toolCalls: toolCallRecords };
    } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };

        // If OpenRouter failed, try Ollama text-only as last resort.
        // Retrying WITHOUT tools gives a proper conversational response
        // instead of the garbage search-query text from the tool-calling attempt.
        if (OLLAMA_API_KEY || OLLAMA_LOCAL_URL) {
            log.debug('OpenRouter failed, trying Ollama text-only fallback', {
                error: err.message,
                statusCode: err.statusCode,
            });
            const retryResult = await ollamaChat(messages, temperature, {
                maxTokens,
            });
            if (retryResult?.text) {
                const ollamaUsage =
                    retryResult.usage ?
                        ({
                            inputTokens: retryResult.usage.prompt_tokens ?? 0,
                            outputTokens:
                                retryResult.usage.completion_tokens ?? 0,
                            totalTokens: retryResult.usage.total_tokens ?? 0,
                        } as unknown as OpenResponsesUsage)
                    :   null;
                void trackUsage(
                    `ollama/${retryResult.model}`,
                    ollamaUsage,
                    Date.now() - startTime,
                    trackingContext,
                );
                return { text: retryResult.text, toolCalls: [] };
            }
        }

        if (err.statusCode === 401) {
            throw new Error(
                'Invalid OpenRouter API key — check your OPENROUTER_API_KEY',
            );
        }
        if (err.statusCode === 402) {
            throw new Error(
                'Insufficient OpenRouter credits — add credits at openrouter.ai',
            );
        }
        if (err.statusCode === 429) {
            throw new Error('OpenRouter rate limited — try again shortly');
        }
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
    const normalized = text
        .replace(/<[｜|]DSML[｜|]/g, '<')
        .replace(/<\/[｜|]DSML[｜|]/g, '</');

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
            calls.push({
                id: `dsml_${Date.now()}_${calls.length}`,
                function: {
                    name: toolName,
                    arguments: JSON.stringify(args),
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
    // Normalize DeepSeek DSML tags (e.g. <｜DSML｜function_calls>) to standard XML
    // eslint-disable-next-line no-control-regex
    text = text
        .replace(/<[｜|]DSML[｜|]/g, '<')
        .replace(/<\/[｜|]DSML[｜|]/g, '</');

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
