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

/** Default max output tokens for Ollama calls when not specified by caller. */
const OLLAMA_DEFAULT_MAX_TOKENS = 250;

/** Timeout for direct /chat/completions fallback calls (text-only, last resort). */
const OPENROUTER_CHAT_TIMEOUT_MS = 30_000;

/** Timeout for OpenRouter tool-calling rounds (higher — tools need execution time). */
const OPENROUTER_TOOL_TIMEOUT_MS = 120_000;

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
): Promise<string | null> {
    if (!OLLAMA_API_KEY && !OLLAMA_LOCAL_URL) return null;

    const ollamaResult = await ollamaChat(messages, temperature, { maxTokens });
    if (ollamaResult?.text) {
        log.debug('Ollama succeeded', {
            model: ollamaResult.model,
            context: trackingContext?.context,
            textLength: ollamaResult.text.length,
        });
        void trackUsage(
            `ollama/${ollamaResult.model}`,
            toOpenResponsesUsage(ollamaResult.usage),
            Date.now() - startTime,
            trackingContext,
        );
        return ollamaResult.text;
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
): Promise<string | null> {
    if (!OLLAMA_API_KEY && !OLLAMA_LOCAL_URL) return null;

    const retryResult = await ollamaChat(messages, temperature, { maxTokens });
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
    rawArgs: string,
    model: string,
    round?: number,
): { args: Record<string, unknown>; remapped: Record<string, string> } {
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

    const maxTokens = options?.maxTokens ?? OLLAMA_DEFAULT_MAX_TOKENS;
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
        const result = await ollamaChatWithModel({
            spec,
            messages,
            temperature,
            maxTokens,
            tools,
            openaiTools,
            maxToolRounds,
        });
        if (result) return result;
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
}

/** Try a single Ollama model. Returns result or null on failure. */
async function ollamaChatWithModel(
    input: OllamaChatWithModelInput,
): Promise<OllamaChatResult | null> {
    const {
        spec,
        messages,
        temperature,
        maxTokens,
        tools,
        openaiTools,
        maxToolRounds,
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
            // Always include tools so the model has context for tool results.
            // On the final round, use tool_choice: "none" to get a text response.
            if (openaiTools && round < maxToolRounds) {
                body.tools = openaiTools;
            } else if (openaiTools && round >= maxToolRounds) {
                body.tools = openaiTools;
                body.tool_choice = 'none';
            }

            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
            if (!msg) {
                log.warn('Ollama model returned no message', {
                    model,
                    hasChoices: !!data.choices?.length,
                });
                return null;
            }

            const ollamaPendingToolCalls = filterPhantomToolCalls(
                msg.tool_calls,
                { model, round },
            );

            // No tool calls → return text (extract content from XML wrappers if present)
            if (
                !ollamaPendingToolCalls ||
                ollamaPendingToolCalls.length === 0
            ) {
                const raw = msg.content ?? '';
                const text = extractFromXml(stripThinking(raw)).trim();
                if (text.length === 0 && toolCallRecords.length === 0) {
                    log.warn('Ollama model returned empty text', {
                        model,
                        rawContentLength: raw.length,
                        rawPreview: raw.slice(0, 100) || '(empty)',
                    });
                    return null;
                }
                return {
                    text,
                    toolCalls: toolCallRecords,
                    model,
                    usage: data.usage,
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
                    resultStr = `Tool ${tc.function.name} not available`;
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
                error: (err as Error).message?.slice(0, 200),
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
): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        OPENROUTER_CHAT_TIMEOUT_MS,
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
        maxTokens = 200,
        model,
        tools,
        trackingContext,
    } = options;

    const client = getClient();
    const startTime = Date.now();

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

    // ── Try Ollama first — but ONLY when no tools are needed ──
    const hasToolsDefined = tools && tools.length > 0;
    if (!hasToolsDefined) {
        const ollamaText = await tryOllamaFirst(messages, temperature, maxTokens, startTime, trackingContext);
        if (ollamaText) return ollamaText;
    }

    // ── OpenRouter (cloud) ──
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

        const durationMs = Date.now() - startTime;
        const response = await result.getResponse();
        const usedModel = response.model || 'unknown';
        const usage = response.usage;

        void trackUsage(usedModel, usage, durationMs, trackingContext);

        if (text.length === 0) {
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
            tryCall, resolved, openRouterResult.error, trackingContext?.context,
        );
        if (individualText) return individualText;
    } else {
        return openRouterResult.text;
    }

    // 3) Ollama last resort (text-only)
    if (openRouterResult.error && !hasToolsDefined) {
        log.debug('OpenRouter failed, retrying Ollama as last resort', {
            error: openRouterResult.error.message,
            statusCode: openRouterResult.error.statusCode,
        });
        const ollamaText = await tryOllamaLastResort(messages, temperature, maxTokens, startTime, trackingContext);
        if (ollamaText) return ollamaText;
    }

    // Throw for known OpenRouter billing/rate errors
    throwForOpenRouterStatus(openRouterResult.error?.statusCode);

    // 4) Last resort: direct /chat/completions (bypasses SDK Responses API)
    if (OPENROUTER_API_KEY && !hasToolsDefined) {
        const chatText = await tryDirectChatCompletions(
            resolved, messages, temperature, maxTokens, startTime, trackingContext,
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
async function tryOpenRouterIndividual(
    tryCall: (spec: string) => Promise<string | null>,
    resolved: string[],
    openRouterError: { statusCode?: number; message?: string } | null,
    context?: string,
): Promise<string | null> {
    if (openRouterError?.statusCode === 402 || openRouterError?.statusCode === 429) {
        return null;
    }

    const fallbackModels = openRouterError ? resolved : resolved.slice(MAX_MODELS_ARRAY);
    for (const fallback of fallbackModels) {
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
): Promise<string | null> {
    const chatModel = resolved[0] ?? 'deepseek/deepseek-v3.2';
    try {
        const chatResult = await openRouterChatCompletions(chatModel, messages, temperature, maxTokens);
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
        return `Tool ${tc.function.name} not available`;
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

    for (let round = 0; round <= maxToolRounds; round++) {
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
            OPENROUTER_TOOL_TIMEOUT_MS,
        );

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
        maxTokens = 200,
        model,
        tools = [],
        maxToolRounds = 3,
        trackingContext,
    } = options;

    const startTime = Date.now();
    const hasTools = tools.length > 0;

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

    // ── Try Ollama first — but ONLY when no tools are needed ──
    if (!hasTools) {
        const ollamaText = await tryOllamaFirst(messages, temperature, maxTokens, startTime, trackingContext);
        if (ollamaText) return { text: ollamaText, toolCalls: [] };
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
        });
    } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };

        // Retry Ollama text-only as last resort — gives a proper conversational
        // response instead of garbage from the failed tool-calling attempt.
        log.debug('OpenRouter failed, trying Ollama text-only fallback', {
            error: err.message,
            statusCode: err.statusCode,
        });
        const ollamaText = await tryOllamaLastResort(messages, temperature, maxTokens, startTime, trackingContext);
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
