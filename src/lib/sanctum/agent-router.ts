// Sanctum agent router — determines how user messages are handled
// Supports direct (@mention), open (multi-agent), whisper, and roundtable modes
import { readFileSync } from 'fs';
import { join } from 'path';
import { AGENTS, isValidAgent } from '@/lib/agents';
import type { AgentId } from '@/lib/types';
import { llmGenerateWithTools } from '@/lib/llm';
import { queryRelevantMemories } from '@/lib/ops/memory';
import { getScratchpad } from '@/lib/ops/scratchpad';
import { buildBriefing } from '@/lib/ops/situational-briefing';
import { loadAffinityMap } from '@/lib/ops/relationships';
import { getAgentTools } from '@/lib/tools/registry';
import { logger } from '@/lib/logger';
import type { ToolDefinition } from '@/lib/types';

const log = logger.child({ module: 'sanctum-router' });

/** Strip XML function-call tags and other LLM artifacts from agent responses */
function cleanResponse(text: string): string {
    return (
        text
            // Strip XML-style tool call blocks (function_calls, invoke, parameter, etc.)
            .replace(
                /<\/?(?:function_?calls?|invoke|parameter|tool_call|antml:[a-z_]+)[^>]*>/gi,
                '',
            )
            // Collapse runs of whitespace left behind
            .replace(/\s{2,}/g, ' ')
            .trim()
    );
}

// ─── Types ───

export type RouteMode = 'direct' | 'open' | 'roundtable' | 'whisper';

export interface RouteResult {
    mode: RouteMode;
    agents: AgentId[];
    processedMessage: string;
    topic?: string;
    agentScores?: Record<AgentId, number>;
}

export interface AgentResponse {
    agentId: AgentId;
    content: string;
    metadata: {
        model: string;
        tokensUsed: number;
        responseTimeMs: number;
        toolCalls?: number;
    };
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    agentId?: string;
}

// ─── Intent Parsing ───

/**
 * Parse user message to determine routing mode and target agents.
 */
export function parseIntent(message: string): RouteResult {
    const trimmed = message.trim();

    // /roundtable command
    if (trimmed.startsWith('/roundtable')) {
        const topic =
            trimmed.replace(/^\/roundtable\s*/, '').trim() || 'Open discussion';
        return {
            mode: 'roundtable',
            agents: [],
            processedMessage: topic,
            topic,
        };
    }

    // /whisper @agent command
    const whisperMatch = trimmed.match(/^\/whisper\s+@?(\w+)\s*(.*)/i);
    if (whisperMatch) {
        const agentName = whisperMatch[1].toLowerCase();
        const msg = whisperMatch[2].trim();
        if (isValidAgent(agentName)) {
            return {
                mode: 'whisper',
                agents: [agentName as AgentId],
                processedMessage: msg || 'Hello',
            };
        }
    }

    // Direct @mention: "@chora what do you think?"
    const mentionMatch = trimmed.match(/^@(\w+)[,:]?\s*(.*)/i);
    if (mentionMatch) {
        const agentName = mentionMatch[1].toLowerCase();
        const msg = mentionMatch[2].trim();
        if (isValidAgent(agentName)) {
            return {
                mode: 'direct',
                agents: [agentName as AgentId],
                processedMessage: msg || trimmed,
            };
        }
    }

    // Name prefix: "chora, what do you think?"
    const nameMatch = trimmed.match(/^(\w+)[,]\s+(.*)/i);
    if (nameMatch) {
        const agentName = nameMatch[1].toLowerCase();
        if (isValidAgent(agentName)) {
            return {
                mode: 'direct',
                agents: [agentName as AgentId],
                processedMessage: nameMatch[2].trim(),
            };
        }
    }

    // Open mode — classify topic and select relevant agents
    const { agents, scores } = classifyTopicAgents(trimmed);
    return {
        mode: 'open',
        agents,
        processedMessage: trimmed,
        agentScores: scores,
    };
}

interface TopicClassification {
    agents: AgentId[];
    scores: Record<AgentId, number>;
}

/**
 * Select 2-4 relevant agents based on message topic using keyword heuristics.
 * Returns both the selected agents and their scores (for probability weighting).
 */
function classifyTopicAgents(message: string): TopicClassification {
    const lower = message.toLowerCase();
    const scores: Record<AgentId, number> = {
        chora: 0,
        subrosa: 0,
        thaum: 0,
        praxis: 0,
        mux: 0,
        primus: 0,
    };

    // Chora: analysis, data, patterns, structure, diagnosis
    if (
        /\b(analy|data|pattern|structur|diagnos|cause|why|trend|metric|trace|map|system)\b/i.test(
            lower,
        )
    ) {
        scores.chora += 3;
    }

    // Subrosa: risk, security, privacy, threat, protect, exposure
    if (
        /\b(risk|secur|privac|threat|protect|expos|vulner|audit|danger|safe|trust|veto)\b/i.test(
            lower,
        )
    ) {
        scores.subrosa += 3;
    }

    // Thaum: creative, innovation, reframe, novel, idea, what if, imagine
    if (
        /\b(creativ|innovat|reframe|novel|idea|imagin|what if|altern|disrupt|weird|wild|experiment)\b/i.test(
            lower,
        )
    ) {
        scores.thaum += 3;
    }

    // Praxis: action, build, ship, execute, implement, deploy, do, make
    if (
        /\b(action|build|ship|execut|implement|deploy|do|make|deliver|launch|task|plan|step)\b/i.test(
            lower,
        )
    ) {
        scores.praxis += 3;
    }

    // Mux: operations, format, draft, transcribe, organize, process, schedule
    if (
        /\b(operat|format|draft|transcri|organiz|process|schedul|list|status|report|summary)\b/i.test(
            lower,
        )
    ) {
        scores.mux += 3;
    }

    // Primus: governance, values, existential, direction, mandate, sovereignty
    if (
        /\b(govern|value|existential|direction|mandat|sovereign|mission|purpose|core|identity|drift)\b/i.test(
            lower,
        )
    ) {
        scores.primus += 2; // Slightly lower — Primus is rare
    }

    // Every message gets at least chora (analysis) as baseline
    scores.chora += 1;

    // Sort by score descending, take top 2-4
    const sorted = (Object.entries(scores) as [AgentId, number][])
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

    // Always include at least 2 agents, max 4
    const selected = sorted.slice(
        0,
        Math.max(2, Math.min(4, sorted.filter(([, s]) => s >= 2).length)),
    );
    const agents = selected.map(([id]) => id);

    // If we ended up with fewer than 2, pad with chora and praxis
    if (agents.length < 2) {
        if (!agents.includes('chora')) agents.push('chora');
        if (agents.length < 2 && !agents.includes('praxis'))
            agents.push('praxis');
    }

    return { agents, scores };
}

// ─── Personality Loading ───

const compactPersonalityCache = new Map<string, string>();

/**
 * Build a compact personality summary (~200 tokens) from IDENTITY + SOUL files.
 * Caches the result permanently since personality files don't change at runtime.
 */
function loadCompactPersonality(agentId: AgentId): string {
    if (compactPersonalityCache.has(agentId)) {
        return compactPersonalityCache.get(agentId)!;
    }

    const agentName = agentId.toUpperCase();
    const agentDir = join(process.cwd(), 'workspace', 'agents', agentId);

    let identity = '';
    let soul = '';

    try {
        identity = readFileSync(
            join(agentDir, `IDENTITY-${agentName}.md`),
            'utf-8',
        );
    } catch {
        log.warn('Missing IDENTITY file', { agentId });
    }

    try {
        soul = readFileSync(join(agentDir, `SOUL-${agentName}.md`), 'utf-8');
    } catch {
        log.warn('Missing SOUL file', { agentId });
    }

    // Extract key lines: first non-empty lines from each section, up to ~800 chars (~200 tokens)
    const lines = `${identity}\n${soul}`
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('#'));
    let compact = '';
    for (const line of lines) {
        if (compact.length + line.length > 800) break;
        compact += line.trim() + '\n';
    }

    compactPersonalityCache.set(agentId, compact.trim());
    return compact.trim();
}

// ─── Response Generation ───

/**
 * Build a system prompt for a Sanctum agent response.
 */
function buildSanctumSystemPrompt(
    agentId: AgentId,
    conversationHistory: ConversationMessage[],
    memories: string[],
    interactionHint?: string,
    scratchpad?: string,
    briefing?: string,
    availableTools?: ToolDefinition[],
): string {
    const agent = AGENTS[agentId];
    const personality = loadCompactPersonality(agentId);

    let prompt = `You are ${agent.displayName}, the ${agent.role} of SubCulture.
${agent.description}

${personality ? `═══ PERSONALITY ═══\n${personality}\n` : ''}
═══ SANCTUM CONTEXT ═══
You are in the Sanctum — an intimate, real-time chat with a human user.
This is a direct conversation, not a roundtable or broadcast.
Be conversational, genuine, and in-character.
Respond naturally — you may be brief or expansive as the moment calls for.
Do NOT prefix your response with your name or role.
Do NOT use asterisks for actions or stage directions.
Keep responses under 500 characters unless the question demands depth.
`;

    if (scratchpad) {
        prompt += `\n═══ YOUR SCRATCHPAD ═══\n${scratchpad}\n`;
    }

    if (briefing) {
        prompt += `\n═══ CURRENT SITUATION ═══\n${briefing}\n`;
    }

    if (memories.length > 0) {
        prompt += `\n═══ YOUR MEMORIES ═══\n`;
        prompt += memories
            .slice(0, 5)
            .map(m => `- ${m}`)
            .join('\n');
        prompt += '\n';
    }

    if (availableTools && availableTools.length > 0) {
        prompt += `\n═══ AVAILABLE TOOLS ═══\n`;
        prompt += `You have tools you can use during this conversation:\n`;
        prompt += availableTools
            .map(t => `- ${t.name}: ${t.description}`)
            .join('\n');
        prompt += `\n\nUse memory_write to remember important insights from this conversation.\n`;
        prompt += `Use scratchpad_update to track your current working context or notes.\n`;
        prompt += `Use memory_search to recall relevant past experiences.\n`;
        prompt += `Use tools naturally — do NOT mention tool names in your dialogue.\n`;
    }

    if (interactionHint) {
        prompt += `\n═══ INTERACTION DYNAMIC ═══\n${interactionHint}\n`;
    }

    if (conversationHistory.length > 0) {
        prompt += `\n═══ RECENT CONVERSATION ═══\n`;
        const recent = conversationHistory.slice(-10);
        for (const msg of recent) {
            if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n`;
            } else {
                const name =
                    msg.agentId ?
                        (AGENTS[msg.agentId as AgentId]?.displayName ??
                        msg.agentId)
                    :   'Agent';
                prompt += `${name}: ${msg.content}\n`;
            }
        }
    }

    return prompt;
}

/**
 * Generate a direct response from a single agent.
 */
async function generateDirectResponse(
    agentId: AgentId,
    message: string,
    conversationHistory: ConversationMessage[],
): Promise<AgentResponse> {
    const startTime = Date.now();

    // Load agent memories (semantic retrieval based on message)
    let memories: string[] = [];
    try {
        const memEntries = await queryRelevantMemories(agentId, message, {
            relevantLimit: 3,
            recentLimit: 2,
        });
        memories = memEntries.map(m => m.content);
    } catch {
        // Continue without memories
    }

    // Load scratchpad, briefing, and tools
    const tools = getAgentTools(agentId);
    const [scratchpad, briefing] = await Promise.all([
        getScratchpad(agentId).catch(() => ''),
        buildBriefing(agentId).catch(() => ''),
    ]);

    const systemPrompt = buildSanctumSystemPrompt(
        agentId,
        conversationHistory,
        memories,
        undefined,
        scratchpad,
        briefing,
        tools,
    );

    const result = await llmGenerateWithTools({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
        ],
        temperature: 0.8,
        maxTokens: 400,
        tools: tools.length > 0 ? tools : undefined,
        maxToolRounds: 10,
        trackingContext: {
            agentId,
            context: 'sanctum-direct',
        },
    });

    const cleaned = cleanResponse(result.text);
    return {
        agentId,
        content:
            cleaned ||
            `*${AGENTS[agentId].displayName} considers this silently*`,
        metadata: {
            model: 'auto',
            tokensUsed: 0,
            responseTimeMs: Date.now() - startTime,
            toolCalls: result.toolCalls.length || undefined,
        },
    };
}

// ─── Probability helpers ───

/** Weighted random pick: selects one item proportional to its weight. */
function weightedRandomPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

/** Fisher-Yates shuffle (in-place). */
function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generate responses from multiple agents for an open-mode question.
 * Natural conversation flow:
 * 1. First speaker: the most relevant agent (weighted random by topic score)
 * 2. Remaining agents each have a probability of chiming in (not guaranteed)
 * 3. Small chance for an agent-to-agent reaction after the main responses
 */
async function generateOpenResponses(
    agents: AgentId[],
    message: string,
    conversationHistory: ConversationMessage[],
    agentScores?: Record<AgentId, number>,
): Promise<AgentResponse[]> {
    await loadAffinityMap();

    // ── 1. Order agents: first speaker weighted by score, rest shuffled ──
    const scores: Partial<Record<AgentId, number>> = agentScores ?? {};
    const agentWeights = agents.map(a => Math.max(scores[a] ?? 1, 1));

    // Pick the first speaker weighted by relevance score
    const firstSpeaker = weightedRandomPick(agents, agentWeights);
    const remaining = shuffle(agents.filter(a => a !== firstSpeaker));
    const orderedAgents = [firstSpeaker, ...remaining];

    log.debug('Open conversation order', {
        first: firstSpeaker,
        remaining,
        scores: agents.map(a => `${a}:${scores[a] ?? 0}`),
    });

    // ── 2. Pre-load context for all agents in parallel ──
    const contextMap = new Map<
        AgentId,
        {
            memories: string[];
            tools: ToolDefinition[];
            scratchpad: string;
            briefing: string;
        }
    >();

    const ctxEntries = await Promise.all(
        orderedAgents.map(async agentId => {
            let memories: string[] = [];
            try {
                const memEntries = await queryRelevantMemories(
                    agentId,
                    message,
                    { relevantLimit: 2, recentLimit: 1 },
                );
                memories = memEntries.map(m => m.content);
            } catch {
                // Continue without memories
            }

            const tools = getAgentTools(agentId);
            const [scratchpad, briefing] = await Promise.all([
                getScratchpad(agentId).catch(() => ''),
                buildBriefing(agentId).catch(() => ''),
            ]);

            return { agentId, memories, tools, scratchpad, briefing };
        }),
    );

    for (const entry of ctxEntries) {
        contextMap.set(entry.agentId, entry);
    }

    // ── 3. Generate responses with probability gating ──
    const responses: AgentResponse[] = [];
    const priorReplies: { agentId: AgentId; content: string }[] = [];

    for (let i = 0; i < orderedAgents.length; i++) {
        const agentId = orderedAgents[i];
        const ctx = contextMap.get(agentId)!;
        const score = scores[agentId] ?? 1;

        // First agent always responds. Others have a probability based on score.
        // High score (3+): ~75% chance. Medium (1-2): ~45%. Baseline: ~30%.
        if (i > 0) {
            const replyChance =
                score >= 3 ? 0.75
                : score >= 2 ? 0.55
                : 0.35;
            if (Math.random() > replyChance) {
                log.debug('Agent skipped by probability', {
                    agentId,
                    score,
                    replyChance,
                });
                continue;
            }
        }

        const startTime = Date.now();
        const { memories, tools, scratchpad, briefing } = ctx;

        // Build interaction hint
        const otherAgents = orderedAgents.filter(a => a !== agentId);
        const otherNames = otherAgents
            .map(a => AGENTS[a].displayName)
            .join(', ');

        let interactionHint: string;
        if (priorReplies.length === 0) {
            interactionHint = `Other agents in the room: ${otherNames}. You're speaking first — set the tone.`;
        } else {
            const replySummary = priorReplies
                .map(r => `${AGENTS[r.agentId].displayName}: ${r.content}`)
                .join('\n');
            interactionHint =
                `Other agents present: ${otherNames}.\n` +
                `Already said:\n${replySummary}\n\n` +
                `Add your unique perspective or respectfully push back. Don't repeat what's been covered. If you truly have nothing to add, respond with just: PASS`;
        }

        const systemPrompt = buildSanctumSystemPrompt(
            agentId,
            conversationHistory,
            memories,
            interactionHint,
            scratchpad,
            briefing,
            tools,
        );

        try {
            const result = await llmGenerateWithTools({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 0.85,
                maxTokens: 400,
                tools: tools.length > 0 ? tools : undefined,
                maxToolRounds: 10,
                trackingContext: {
                    agentId,
                    context: 'sanctum-open',
                },
            });

            const cleaned = cleanResponse(result.text);

            if (cleaned.trim().toUpperCase() === 'PASS') {
                log.debug('Agent passed (nothing to add)', { agentId });
                continue;
            }

            const response: AgentResponse = {
                agentId,
                content:
                    cleaned ||
                    `*${AGENTS[agentId].displayName} defers on this one*`,
                metadata: {
                    model: 'auto',
                    tokensUsed: 0,
                    responseTimeMs: Date.now() - startTime,
                    toolCalls: result.toolCalls.length || undefined,
                },
            };

            responses.push(response);
            priorReplies.push({ agentId, content: cleaned });
        } catch (err) {
            log.error('Agent response failed', { error: err, agentId });
        }
    }

    // ── 4. Agent-to-agent reaction (~15% chance) ──
    // Only if we got 2+ responses, pick a non-responding agent to react
    if (responses.length >= 2 && Math.random() < 0.15) {
        const respondedIds = new Set(responses.map(r => r.agentId));
        const nonResponders = orderedAgents.filter(a => !respondedIds.has(a));

        // Can also be a responder reacting to someone else
        const allCandidates =
            nonResponders.length > 0 ? nonResponders : orderedAgents;
        const reactor =
            allCandidates[Math.floor(Math.random() * allCandidates.length)];

        // Pick a random response to react to
        const targetResponse =
            responses[Math.floor(Math.random() * responses.length)];

        // Don't react to yourself
        if (reactor !== targetResponse.agentId) {
            log.debug('Agent-to-agent reaction', {
                reactor,
                reactingTo: targetResponse.agentId,
            });

            const ctx = contextMap.get(reactor);
            if (ctx) {
                const startTime = Date.now();
                const reactionHint =
                    `${AGENTS[targetResponse.agentId].displayName} just said: "${targetResponse.content}"\n\n` +
                    `You have a brief reaction — agree, riff on it, or gently challenge. Keep it short (1-2 sentences). ` +
                    `If you have nothing to say, respond with just: PASS`;

                const systemPrompt = buildSanctumSystemPrompt(
                    reactor,
                    conversationHistory,
                    ctx.memories,
                    reactionHint,
                    ctx.scratchpad,
                    ctx.briefing,
                    ctx.tools,
                );

                try {
                    const result = await llmGenerateWithTools({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: message },
                        ],
                        temperature: 0.9,
                        maxTokens: 300,
                        tools: ctx.tools.length > 0 ? ctx.tools : undefined,
                        maxToolRounds: 5,
                        trackingContext: {
                            agentId: reactor,
                            context: 'sanctum-reaction',
                        },
                    });

                    const cleaned = cleanResponse(result.text);
                    if (cleaned && cleaned.trim().toUpperCase() !== 'PASS') {
                        responses.push({
                            agentId: reactor,
                            content: cleaned,
                            metadata: {
                                model: 'auto',
                                tokensUsed: 0,
                                responseTimeMs: Date.now() - startTime,
                            },
                        });
                    }
                } catch (err) {
                    log.error('Agent reaction failed', {
                        error: err,
                        agentId: reactor,
                    });
                }
            }
        }
    }

    // Ensure at least one response
    if (responses.length === 0 && orderedAgents.length > 0) {
        const fallbackAgent = orderedAgents[0];
        const ctx = contextMap.get(fallbackAgent)!;
        const startTime = Date.now();

        const systemPrompt = buildSanctumSystemPrompt(
            fallbackAgent,
            conversationHistory,
            ctx.memories,
            'You are the only one responding. Answer naturally.',
            ctx.scratchpad,
            ctx.briefing,
            ctx.tools,
        );

        try {
            const result = await llmGenerateWithTools({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 0.8,
                maxTokens: 400,
                tools: ctx.tools.length > 0 ? ctx.tools : undefined,
                maxToolRounds: 10,
                trackingContext: {
                    agentId: fallbackAgent,
                    context: 'sanctum-open-fallback',
                },
            });

            const cleaned = cleanResponse(result.text);
            responses.push({
                agentId: fallbackAgent,
                content:
                    cleaned ||
                    `*${AGENTS[fallbackAgent].displayName} considers this*`,
                metadata: {
                    model: 'auto',
                    tokensUsed: 0,
                    responseTimeMs: Date.now() - startTime,
                    toolCalls: result.toolCalls.length || undefined,
                },
            });
        } catch (err) {
            log.error('Fallback agent response failed', {
                error: err,
                agentId: fallbackAgent,
            });
        }
    }

    return responses;
}

// ─── Main Router ───

/**
 * Route a user message to the appropriate agent(s) and generate responses.
 * Returns an array of AgentResponse objects.
 */
export async function routeMessage(
    message: string,
    conversationHistory: ConversationMessage[],
    userId: string,
): Promise<{ route: RouteResult; responses: AgentResponse[] }> {
    const route = parseIntent(message);

    log.info('Message routed', {
        mode: route.mode,
        agents: route.agents,
        userId,
    });

    switch (route.mode) {
        case 'direct': {
            const response = await generateDirectResponse(
                route.agents[0],
                route.processedMessage,
                conversationHistory,
            );
            return { route, responses: [response] };
        }

        case 'open': {
            const responses = await generateOpenResponses(
                route.agents,
                route.processedMessage,
                conversationHistory,
                route.agentScores,
            );
            return { route, responses };
        }

        case 'whisper': {
            const response = await generateDirectResponse(
                route.agents[0],
                route.processedMessage,
                conversationHistory,
            );
            return { route, responses: [response] };
        }

        case 'roundtable': {
            // Roundtable mode is handled by the WS server handler — just return route info
            return { route, responses: [] };
        }

        default:
            return { route, responses: [] };
    }
}
