// Agent Session Executor — tool-augmented LLM loop
// Runs an agent session: loads voice + tools, calls LLM in a loop,
// executes tool calls, feeds results back until done or timeout.

import { sql, jsonb } from '@/lib/db';
import { llmGenerateWithTools, extractFromXml } from '@/lib/llm/client';
import { getVoice } from '@/lib/roundtable/voices';
import { getAgentTools, getDroidTools } from './registry';
import { emitEvent } from '@/lib/ops/events';
import { queryRelevantMemories } from '@/lib/ops/memory';
import { getScratchpad } from '@/lib/ops/scratchpad';
import { buildBriefing } from '@/lib/ops/situational-briefing';
import { loadPrimeDirective } from '@/lib/ops/prime-directive';
import { logger } from '@/lib/logger';
import type { AgentId, LLMMessage, ToolCallRecord } from '../types';
import type { AgentSession } from './types';

const log = logger.child({ module: 'agent-session' });

/** Reserve this much time before timeout for the final DB write so sessions finish cleanly. */
const SESSION_SOFT_DEADLINE_BUFFER_MS = 90_000;

/** Max length for individual tool result strings in the feedback message. */
const TOOL_RESULT_MAX_LENGTH = 5000;

/** Break early after this many consecutive LLM rounds with no text output. */
const MAX_CONSECUTIVE_EMPTY_ROUNDS = 3;

/** Strip XML function-call tags and other LLM artifacts from text */
function sanitizeSummary(text: string): string {
    return (
        text
            // Normalize DeepSeek DSML tags to standard XML before stripping
            .replace(/<[｜|]DSML[｜|]/g, '<')
            .replace(/<\/[｜|]DSML[｜|]/g, '</')
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
    const allToolCalls: ToolCallRecord[] = [];
    let llmRounds = 0;

    // Mark session as running
    await sql`
        UPDATE ops_agent_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
    `;

    try {
        // Load agent voice (droids don't have voices)
        const voice = isDroid ? null : getVoice(agentId);
        const voiceName =
            isDroid ? session.agent_id : (voice?.displayName ?? agentId);

        // Load agent tools — droids get a limited toolset with ACL-bound file_write
        const tools =
            isDroid ?
                getDroidTools(session.agent_id)
            :   getAgentTools(agentId, session.id);

        // Load memories via semantic relevance to the prompt (skip for droids)
        const memories =
            isDroid ?
                []
            :   await queryRelevantMemories(agentId, session.prompt, {
                    relevantLimit: 5,
                    recentLimit: 3,
                });

        // Load scratchpad (working memory) and situational briefing
        const scratchpad = isDroid ? '' : await getScratchpad(agentId);
        const briefing = isDroid ? '' : await buildBriefing(agentId);

        // Load recent session outputs for context injection (skip for droids)
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

        // Load prime directive (best-effort — don't fail session if unavailable)
        let primeDirective = '';
        try {
            primeDirective = await loadPrimeDirective();
        } catch {
            // Prime directive unavailable — continue without it
        }

        // Build system prompt
        let systemPrompt = '';
        if (voice) {
            systemPrompt += `${voice.systemDirective}\n\n`;
        }

        if (primeDirective) {
            systemPrompt += `═══ PRIME DIRECTIVE ═══\n${primeDirective}\n\n`;
        }

        systemPrompt += `You are ${voiceName}, operating in an autonomous agent session.\n`;
        systemPrompt += `You have tools available to accomplish your task. Use them through the provided function calling interface.\n`;
        systemPrompt += `When your task is complete, provide a clear summary of what you accomplished.\n`;
        systemPrompt += `IMPORTANT: Never output raw XML tags like <function_calls> or <invoke>. Use the structured tool calling API instead.\n\n`;

        if (scratchpad) {
            systemPrompt += `═══ YOUR SCRATCHPAD (working memory) ═══\n${scratchpad}\n\n`;
        }

        if (briefing) {
            systemPrompt += `═══ CURRENT SITUATION ═══\n${briefing}\n\n`;
        }

        if (memories.length > 0) {
            systemPrompt += `═══ YOUR MEMORIES ═══\n`;
            for (const m of memories) {
                systemPrompt += `- [${m.type}] ${m.content.slice(0, 200)}\n`;
            }
            systemPrompt += `\n`;
        }

        if (recentSessions.length > 0) {
            systemPrompt += `Recent session outputs (for context):\n`;
            for (const s of recentSessions) {
                const summary =
                    (s.result as Record<string, unknown>)?.summary ??
                    (s.result as Record<string, unknown>)?.text ??
                    '(no summary)';
                systemPrompt += `- [${s.agent_id}] ${String(summary).slice(0, 300)}\n`;
            }
            systemPrompt += '\n';
        }

        // The LLM+tools loop
        const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: session.prompt },
        ];

        const maxRounds = session.max_tool_rounds;
        const timeoutMs = session.timeout_seconds * 1000;
        let lastText = '';
        let consecutiveEmptyRounds = 0;

        // Reserve time for the final write — stop issuing new LLM rounds
        // when not enough time remains so the session can finish cleanly
        const softDeadlineMs = timeoutMs - SESSION_SOFT_DEADLINE_BUFFER_MS;

        for (let round = 0; round < maxRounds; round++) {
            const elapsed = Date.now() - startTime;

            // Hard timeout — session has exceeded its budget
            if (elapsed > timeoutMs) {
                await completeSession(
                    session.id,
                    'timed_out',
                    {
                        summary:
                            lastText || 'Session timed out before completing',
                        rounds: llmRounds,
                    },
                    allToolCalls,
                    llmRounds,
                    'Timeout exceeded',
                );
                return;
            }

            // Soft deadline — not enough time for another full round, wrap up
            if (elapsed > softDeadlineMs && round > 0 && lastText) {
                log.info(
                    'Soft deadline reached, finishing with current output',
                    {
                        sessionId: session.id,
                        elapsed: Math.round(elapsed / 1000),
                        rounds: llmRounds,
                    },
                );
                break;
            }

            llmRounds++;

            const result = await llmGenerateWithTools({
                messages,
                temperature: 0.7,
                maxTokens: 16_000,
                model: session.model ?? undefined,
                tools: tools.length > 0 ? tools : undefined,
                maxToolRounds: 1, // We handle the outer loop ourselves
                trackingContext: {
                    agentId,
                    context: 'agent_session',
                    sessionId: session.id,
                },
            });

            // Only update lastText if we got actual content back
            if (result.text) {
                lastText = result.text;
                consecutiveEmptyRounds = 0;
            } else {
                consecutiveEmptyRounds++;
            }
            allToolCalls.push(...result.toolCalls);

            log.debug('Agent session round completed', {
                sessionId: session.id,
                round,
                textLength: result.text.length,
                toolCallCount: result.toolCalls.length,
                cumulativeToolCalls: allToolCalls.length,
                hasLastText: !!lastText,
                consecutiveEmptyRounds,
            });

            // If no tool calls were made, we're done
            if (result.toolCalls.length === 0) {
                break;
            }

            // If we got tool calls but no text and no useful tool results,
            // the model may be spinning on phantom calls — break early
            if (
                !result.text &&
                result.toolCalls.every(
                    tc =>
                        typeof tc.result === 'string' &&
                        tc.result.includes('not available'),
                )
            ) {
                log.warn(
                    'Agent session breaking early — all tool calls returned not-available',
                    {
                        sessionId: session.id,
                        round,
                        toolCalls: result.toolCalls.map(tc => tc.name),
                    },
                );
                break;
            }

            // If we've had too many consecutive rounds with no text output,
            // the model is likely stuck in a loop — break early
            if (consecutiveEmptyRounds >= MAX_CONSECUTIVE_EMPTY_ROUNDS) {
                log.warn(
                    'Agent session breaking early — consecutive empty rounds',
                    {
                        sessionId: session.id,
                        round,
                        cumulativeToolCalls: allToolCalls.length,
                    },
                );
                break;
            }

            // Feed tool results back as assistant + user messages
            // Build a summary of tool results for the next round
            const toolSummary = result.toolCalls
                .map(tc => {
                    const resultStr =
                        typeof tc.result === 'string' ?
                            tc.result
                        :   JSON.stringify(tc.result);
                    // Cap individual tool result to avoid context explosion
                    const capped =
                        resultStr.length > TOOL_RESULT_MAX_LENGTH ?
                            resultStr.slice(0, TOOL_RESULT_MAX_LENGTH) + '... [truncated]'
                        :   resultStr;
                    return `Tool ${tc.name}(${JSON.stringify(tc.arguments)}):\n${capped}`;
                })
                .join('\n\n');

            // Add the assistant response and tool results
            if (result.text) {
                messages.push({ role: 'assistant', content: result.text });
            }
            messages.push({
                role: 'user',
                content: `Tool results:\n${toolSummary}\n\nContinue with your task. If you're done, provide a final summary.`,
            });
        }

        // Success — extract content from XML wrappers if present
        const cleanedText = extractFromXml(lastText);
        await completeSession(
            session.id,
            'succeeded',
            {
                text: cleanedText,
                summary: sanitizeSummary(cleanedText),
                rounds: llmRounds,
            },
            allToolCalls,
            llmRounds,
        );

        // Emit completion event — short preview only, full artifact posts separately
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
                rounds: llmRounds,
                toolCalls: allToolCalls.length,
            },
        });
    } catch (err) {
        const errorMsg = (err as Error).message;
        log.error('Agent session failed', {
            error: err,
            sessionId: session.id,
            agentId,
            rounds: llmRounds,
        });

        await completeSession(
            session.id,
            'failed',
            {
                error: errorMsg,
                rounds: llmRounds,
            },
            allToolCalls,
            llmRounds,
            errorMsg,
        );

        await emitEvent({
            agent_id: agentId,
            kind: 'agent_session_failed',
            title: `Agent session failed: ${errorMsg.slice(0, 100)}`,
            tags: ['agent_session', 'failed', session.source],
            metadata: {
                sessionId: session.id,
                error: errorMsg,
                rounds: llmRounds,
            },
        });
    }
}

/** Update session to terminal status */
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
            result = ${jsonb(result)},
            tool_calls = ${jsonb(
                toolCalls.map(tc => ({
                    name: tc.name,
                    arguments: tc.arguments,
                    result:
                        typeof tc.result === 'string' ?
                            tc.result.slice(0, 2000)
                        :   tc.result,
                })),
            )},
            llm_rounds = ${llmRounds},
            error = ${error ?? null},
            completed_at = NOW()
        WHERE id = ${sessionId}
    `;
}
