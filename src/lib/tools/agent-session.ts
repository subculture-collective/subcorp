// Agent Session Executor — tool-augmented LLM loop
// Runs an agent session: loads voice + tools, calls LLM in a loop,
// executes tool calls, feeds results back until done or timeout.

import { sql, jsonb } from '@/lib/db';
import { llmGenerateWithTools, extractFromXml, normalizeDsml } from '@/lib/llm/client';
import { getVoice } from '@/lib/roundtable/voices';
import { getAgentTools, getDroidTools } from './registry';
import { emitEvent } from '@/lib/ops/events';
import { queryRelevantMemories } from '@/lib/ops/memory';
import { getScratchpad } from '@/lib/ops/scratchpad';
import { buildBriefing } from '@/lib/ops/situational-briefing';
import { loadPrimeDirective } from '@/lib/ops/prime-directive';
import { logger } from '@/lib/logger';
import type { AgentId, LLMMessage, ToolCallRecord, ToolDefinition } from '../types';
import type { AgentSession } from './types';

const log = logger.child({ module: 'agent-session' });

/** Reserve this much time before timeout for the final DB write so sessions finish cleanly. */
const SESSION_SOFT_DEADLINE_BUFFER_MS = 90_000;

/** Max length for individual tool result strings in the feedback message. */
const TOOL_RESULT_MAX_LENGTH = 5000;

/** Break early after this many consecutive LLM rounds with no text output. */
const MAX_CONSECUTIVE_EMPTY_ROUNDS = 3;

/** Max length for memory content previews in system prompt. */
const MEMORY_PREVIEW_LENGTH = 200;

/** Max length for recent session summary previews in system prompt. */
const SESSION_SUMMARY_PREVIEW_LENGTH = 300;

/** Strip XML function-call tags and other LLM artifacts from text */
function sanitizeSummary(text: string): string {
    return (
        normalizeDsml(text)
            // Remove XML-style tags (e.g. <function_calls>, <invoke>, <parameter>)
            .replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, '')
            // Collapse runs of whitespace
            .replace(/\s{2,}/g, ' ')
            .trim()
    );
}

/** Extract a short preview from text — first N chars, cut at sentence boundary */
function truncateToFirstSentences(text: string, maxLen: number): string {
    const clean = text
        .replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, '')
        .replace(/^#+\s+.+$/gm, '') // strip markdown headers
        .replace(/\n{2,}/g, '\n')
        .trim();
    if (clean.length <= maxLen) return clean;
    // Cut at last sentence-ending punctuation before maxLen
    // Handles: "word. ", "word.\n", "word.**", "word.)\n", etc.
    const truncated = clean.slice(0, maxLen);
    const sentenceEnd = truncated.search(/[.!?][*_)\]]*[\s\n](?=[^\s])[^]*$/);
    if (sentenceEnd > maxLen * 0.3) {
        // Include the punctuation and any closing markdown
        const endMatch = truncated.slice(sentenceEnd).match(/^[.!?][*_)\]]*/);
        return truncated.slice(0, sentenceEnd + (endMatch?.[0].length ?? 1));
    }
    // Fallback: cut at last newline (paragraph break) for cleaner truncation
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > maxLen * 0.5) return truncated.slice(0, lastNewline);
    return truncated + '...';
}

/** Context loaded for an agent session before the LLM loop starts. */
interface AgentSessionContext {
    voiceName: string;
    tools: ToolDefinition[];
    systemPrompt: string;
}

/** Load agent context and build system prompt for a session. */
async function loadAgentContext(
    session: AgentSession,
    isDroid: boolean,
    agentId: AgentId,
): Promise<AgentSessionContext> {
    const voice = isDroid ? null : getVoice(agentId);
    const voiceName = isDroid ? session.agent_id : (voice?.displayName ?? agentId);

    const tools =
        isDroid ?
            getDroidTools(session.agent_id)
        :   getAgentTools(agentId, session.id);

    const memories =
        isDroid ?
            []
        :   await queryRelevantMemories(agentId, session.prompt, {
                relevantLimit: 5,
                recentLimit: 3,
            });

    const scratchpad = isDroid ? '' : await getScratchpad(agentId);
    const briefing = isDroid ? '' : await buildBriefing(agentId);

    const recentSessions =
        isDroid ?
            []
        :   await sql`
            SELECT agent_id, prompt, result, completed_at
            FROM ops_agent_sessions
            WHERE source = 'cron'
            AND status = 'succeeded'
            AND completed_at > NOW() - INTERVAL '24 hours'
            AND id != ${session.id}
            ORDER BY completed_at DESC
            LIMIT 5
        `;

    let primeDirective = '';
    try {
        primeDirective = await loadPrimeDirective();
    } catch {
        // Continue without directive
    }

    const systemPrompt = buildAgentSystemPrompt({
        voice: voice ?? null,
        voiceName,
        primeDirective,
        scratchpad,
        briefing,
        memories,
        recentSessions: recentSessions as Array<{ agent_id: string; result: unknown }>,
        toolNames: tools.map(t => t.name),
    });

    return { voiceName, tools, systemPrompt };
}

/** Build the system prompt for an agent session from pre-loaded context. */
function buildAgentSystemPrompt(ctx: {
    voice: { systemDirective: string } | null;
    voiceName: string;
    primeDirective: string;
    scratchpad: string;
    briefing: string;
    memories: Array<{ type: string; content: string }>;
    recentSessions: Array<{ agent_id: string; result: unknown }>;
    toolNames: string[];
}): string {
    let prompt = '';

    if (ctx.voice) {
        prompt += `${ctx.voice.systemDirective}\n\n`;
    }

    if (ctx.primeDirective) {
        prompt += `═══ PRIME DIRECTIVE ═══\n${ctx.primeDirective}\n\n`;
    }

    prompt += `You are ${ctx.voiceName}, operating in an autonomous agent session.\n`;
    prompt += `You have tools available to accomplish your task. Use them through the provided function calling interface.\n`;
    prompt += `When your task is complete, provide a clear summary of what you accomplished.\n`;
    prompt += `IMPORTANT: Never output raw XML tags like <function_calls> or <invoke>. Use the structured tool calling API instead.\n`;
    prompt += `IMPORTANT: Only call tools from the list below. Do NOT invent tool names.\n\n`;

    if (ctx.toolNames.length > 0) {
        prompt += `═══ AVAILABLE TOOLS ═══\n`;
        prompt += `You may ONLY use these tools: ${ctx.toolNames.join(', ')}\n`;
        prompt += `Do NOT call tools like "google:search", "tool_code", "propose_action", or any other name not listed above.\n\n`;
    }

    if (ctx.scratchpad) {
        prompt += `═══ YOUR SCRATCHPAD (working memory) ═══\n${ctx.scratchpad}\n\n`;
    }

    if (ctx.briefing) {
        prompt += `═══ CURRENT SITUATION ═══\n${ctx.briefing}\n\n`;
    }

    if (ctx.memories.length > 0) {
        prompt += `═══ YOUR MEMORIES ═══\n`;
        for (const m of ctx.memories) {
            prompt += `- [${m.type}] ${m.content.slice(0, MEMORY_PREVIEW_LENGTH)}\n`;
        }
        prompt += `\n`;
    }

    if (ctx.recentSessions.length > 0) {
        prompt += `Recent session outputs (for context):\n`;
        for (const s of ctx.recentSessions) {
            const summary =
                (s.result as Record<string, unknown>)?.summary ??
                (s.result as Record<string, unknown>)?.text ??
                '(no summary)';
            prompt += `- [${s.agent_id}] ${String(summary).slice(0, SESSION_SUMMARY_PREVIEW_LENGTH)}\n`;
        }
        prompt += '\n';
    }

    return prompt;
}

/**
 * Run the LLM+tools loop for an agent session.
 * Returns the final text output and accumulated tool call records.
 */
async function runAgentToolLoop(opts: {
    session: AgentSession;
    agentId: AgentId;
    tools: ToolDefinition[];
    messages: LLMMessage[];
    startTime: number;
}): Promise<{ lastText: string; toolCalls: ToolCallRecord[]; rounds: number }> {
    const { session, agentId, tools, messages, startTime } = opts;
    const allToolCalls: ToolCallRecord[] = [];
    const maxRounds = session.max_tool_rounds;
    const timeoutMs = session.timeout_seconds * 1000;
    const softDeadlineMs = timeoutMs - SESSION_SOFT_DEADLINE_BUFFER_MS;
    let lastText = '';
    let consecutiveEmptyRounds = 0;
    let llmRounds = 0;

    for (let round = 0; round < maxRounds; round++) {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeoutMs) {
            await completeSession(
                session.id, 'timed_out',
                { summary: lastText || 'Session timed out before completing', rounds: llmRounds },
                allToolCalls, llmRounds, 'Timeout exceeded',
            );
            return { lastText, toolCalls: allToolCalls, rounds: -1 }; // -1 signals timed_out (already written)
        }

        if (elapsed > softDeadlineMs && round > 0 && lastText) {
            log.info('Soft deadline reached, finishing with current output', {
                sessionId: session.id,
                elapsed: Math.round(elapsed / 1000),
                rounds: llmRounds,
            });
            break;
        }

        llmRounds++;

        const result = await llmGenerateWithTools({
            messages,
            temperature: 0.7,
            maxTokens: 16_000,
            model: session.model ?? undefined,
            tools: tools.length > 0 ? tools : undefined,
            maxToolRounds: 20,
            trackingContext: { agentId, context: 'agent_session', sessionId: session.id },
        });

        if (result.text) {
            lastText = result.text;
            consecutiveEmptyRounds = 0;
        } else {
            consecutiveEmptyRounds++;
        }
        allToolCalls.push(...result.toolCalls);

        log.debug('Agent session round completed', {
            sessionId: session.id, round,
            textLength: result.text.length,
            toolCallCount: result.toolCalls.length,
            cumulativeToolCalls: allToolCalls.length,
            hasLastText: !!lastText,
            consecutiveEmptyRounds,
        });

        if (result.toolCalls.length === 0) break;

        if (!result.text && result.toolCalls.every(
            tc => typeof tc.result === 'string' && tc.result.includes('not available'),
        )) {
            log.warn('Agent session breaking early — all tool calls returned not-available', {
                sessionId: session.id, round,
                toolCalls: result.toolCalls.map(tc => tc.name),
            });
            break;
        }

        if (consecutiveEmptyRounds >= MAX_CONSECUTIVE_EMPTY_ROUNDS) {
            log.warn('Agent session breaking early — consecutive empty rounds', {
                sessionId: session.id, round,
                cumulativeToolCalls: allToolCalls.length,
            });
            break;
        }

        // Feed tool results back for the next round
        const toolSummary = result.toolCalls
            .map(tc => {
                const resultStr = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
                const capped =
                    resultStr.length > TOOL_RESULT_MAX_LENGTH ?
                        resultStr.slice(0, TOOL_RESULT_MAX_LENGTH) + '... [truncated]'
                    :   resultStr;
                return `Tool ${tc.name}(${JSON.stringify(tc.arguments)}):\n${capped}`;
            })
            .join('\n\n');

        if (result.text) {
            messages.push({ role: 'assistant', content: result.text });
        }
        messages.push({
            role: 'user',
            content: `Tool results:\n${toolSummary}\n\nContinue with your task. If you're done, provide a final summary.`,
        });
    }

    return { lastText, toolCalls: allToolCalls, rounds: llmRounds };
}

/**
 * Execute an agent session: load voice, tools, and run the LLM+tools loop.
 * Updates the session row in-place as it progresses.
 */
export async function executeAgentSession(
    session: AgentSession,
): Promise<void> {
    const startTime = Date.now();
    const isDroid = session.agent_id.startsWith('droid-');
    const agentId = session.agent_id as AgentId;

    await sql`
        UPDATE ops_agent_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
    `;

    try {
        const { voiceName, tools, systemPrompt } = await loadAgentContext(session, isDroid, agentId);

        const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: session.prompt },
        ];

        const loopResult = await runAgentToolLoop({
            session, agentId, tools, messages, startTime,
        });

        // rounds === -1 means timed_out was already written inside the loop
        if (loopResult.rounds === -1) return;

        const cleanedText = extractFromXml(loopResult.lastText);
        await completeSession(
            session.id, 'succeeded',
            { text: cleanedText, summary: sanitizeSummary(cleanedText), rounds: loopResult.rounds },
            loopResult.toolCalls, loopResult.rounds,
        );

        const summaryPreview = truncateToFirstSentences(cleanedText, 2000);
        await emitEvent({
            agent_id: agentId,
            kind: 'agent_session_completed',
            title: `${voiceName} session completed`,
            summary: summaryPreview || undefined,
            tags: ['agent_session', 'completed', session.source],
            metadata: {
                sessionId: session.id,
                source: session.source,
                rounds: loopResult.rounds,
                toolCalls: loopResult.toolCalls.length,
            },
        });
    } catch (err) {
        const errorMsg = (err as Error).message;
        log.error('Agent session failed', { error: err, sessionId: session.id, agentId });

        await completeSession(
            session.id, 'failed', { error: errorMsg, rounds: 0 },
            [], 0, errorMsg,
        );

        await emitEvent({
            agent_id: agentId,
            kind: 'agent_session_failed',
            title: `Agent session failed: ${errorMsg.slice(0, 100)}`,
            tags: ['agent_session', 'failed', session.source],
            metadata: { sessionId: session.id, error: errorMsg },
        });
    }
}

/** Update session to terminal status */
/** Strip null bytes and invalid Unicode escapes that Postgres rejects in JSONB */
function sanitizeForJsonb(obj: unknown): unknown {
    if (typeof obj === 'string') {
        return obj.replace(/\u0000/g, '').replace(/\\u0000/g, '');
    }
    if (Array.isArray(obj)) return obj.map(sanitizeForJsonb);
    if (obj && typeof obj === 'object') {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            clean[k] = sanitizeForJsonb(v);
        }
        return clean;
    }
    return obj;
}

async function completeSession(
    sessionId: string,
    status: string,
    result: Record<string, unknown>,
    toolCalls: ToolCallRecord[],
    llmRounds: number,
    error?: string,
): Promise<void> {
    await sql`
        UPDATE ops_agent_sessions
        SET status = ${status},
            result = ${jsonb(sanitizeForJsonb(result) as Record<string, unknown>)},
            tool_calls = ${jsonb(
                sanitizeForJsonb(toolCalls.map(tc => ({
                    name: tc.name,
                    arguments: tc.arguments,
                    result:
                        typeof tc.result === 'string' ?
                            tc.result.slice(0, 2000)
                        :   tc.result,
                }))) as unknown[],
            )},
            llm_rounds = ${llmRounds},
            error = ${error ?? null},
            completed_at = NOW()
        WHERE id = ${sessionId}
    `;
}
