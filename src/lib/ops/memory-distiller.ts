// Memory distiller — extract memories + drifts + action items from conversations
import { llmGenerate, extractJson } from '../llm';
import { writeMemory, enforceMemoryCap } from './memory';
import { applyPairwiseDrifts } from './relationships';
import { createProposalAndMaybeAutoApprove } from './proposal-service';
import { getPolicy } from './policy';
import type {
    ConversationTurnEntry,
    ConversationFormat,
    MemoryType,
    PairwiseDrift,
    ActionItem,
} from '../types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'distiller' });

const ACTION_ITEM_FORMATS: ConversationFormat[] = [
    'standup',
    'planning',
    'shipping',
    'strategy',
    'retro',
    'triage',
    'risk_review',
    'deep_dive',
];
const VALID_MEMORY_TYPES: MemoryType[] = [
    'insight',
    'pattern',
    'strategy',
    'preference',
    'lesson',
];

export async function distillConversationMemories(
    sessionId: string,
    history: ConversationTurnEntry[],
    format: ConversationFormat,
): Promise<number> {
    if (history.length < 2) return 0;

    // Load distillation policy from DB (30s cache)
    const distillPolicy = await getPolicy('roundtable_distillation');
    const maxMemories =
        (distillPolicy.max_memories_per_conversation as number) ?? 6;
    const minConfidence =
        (distillPolicy.min_confidence_threshold as number) ?? 0.55;
    const maxActionItems =
        (distillPolicy.max_action_items_per_conversation as number) ?? 3;

    const speakers = [...new Set(history.map(h => h.speaker))];

    // Truncate to last 8 turns to reduce token waste — recent turns carry the most signal
    const recentHistory = history.length > 8 ? history.slice(-8) : history;
    const transcript = recentHistory
        .map(h => `[${h.speaker}]: ${h.dialogue}`)
        .join('\n');

    // Skip pairwise drift for small groups (≤3 participants have limited pair combinations)
    const includeDrifts = speakers.length > 3;
    const includeActions = ACTION_ITEM_FORMATS.includes(format);

    // ─── Single LLM call: Memories + Drifts + Action Items ───

    let driftSchema = '';
    let driftRules = '';
    if (includeDrifts) {
        driftSchema = `  "pairwise_drift": [
    { "agent_a": "string", "agent_b": "string", "drift": -0.03 to 0.03, "reason": "max 200 chars" }
  ],`;
        driftRules = `- Drift is a small float between -0.03 and 0.03 (positive=warmer, negative=cooler). Only report non-zero drifts.`;
    }

    let actionSchema = '';
    let actionRules = '';
    if (includeActions) {
        actionSchema = `  "action_items": [
    { "title": "string", "agent_id": "string", "step_kind": "string" }
  ],`;
        actionRules = `- Max ${maxActionItems} action items — only tasks explicitly committed to or clearly implied
- step_kind: research_topic, scan_signals, draft_essay, draft_thread, critique_content, audit_system, patch_code, distill_insight, document_lesson, convene_roundtable`;
    }

    const memoriesPrompt = `You are a memory extraction system for an AI agent collective.

Analyze this ${format} conversation and extract memories${includeDrifts ? ', relationship drifts' : ''}${includeActions ? ', and action items' : ''}.

Conversation transcript:
${transcript}

Participants: ${speakers.join(', ')}

Respond with valid JSON only:
{
  "memories": [
    { "agent_id": "string", "type": "insight|pattern|strategy|preference|lesson", "content": "max 400 chars", "confidence": 0.55-1.0, "tags": ["string"] }
  ],
${driftSchema}${actionSchema}}

Rules:
- Max ${maxMemories} memories, types: ${VALID_MEMORY_TYPES.join(', ')}, agents: ${speakers.join(', ')}
- Confidence >= ${minConfidence}, content max 400 chars
${driftRules}${actionRules}
- Return empty arrays if nothing meaningful to extract`;

    let parsed: {
        memories?: Array<{
            agent_id: string;
            type: string;
            content: string;
            confidence: number;
            tags: string[];
        }>;
        pairwise_drift?: PairwiseDrift[];
        action_items?: ActionItem[];
    } | null = null;

    try {
        const response = await llmGenerate({
            messages: [{ role: 'user', content: memoriesPrompt }],
            temperature: 0.3,
            maxTokens: 1500,
            trackingContext: {
                agentId: 'system',
                context: 'distillation',
                sessionId,
            },
        });

        parsed = extractJson<{
            memories?: Array<{
                agent_id: string;
                type: string;
                content: string;
                confidence: number;
                tags: string[];
            }>;
            pairwise_drift?: PairwiseDrift[];
            action_items?: ActionItem[];
        }>(response);
        if (!parsed) {
            log.warn('No JSON found in memories LLM response', { sessionId });
            return 0;
        }
    } catch (err) {
        log.error('Memories LLM extraction failed', { error: err, sessionId });
        return 0;
    }

    let written = 0;

    // Process memories
    const memories = (parsed.memories ?? []).slice(0, maxMemories);
    for (const mem of memories) {
        if (!VALID_MEMORY_TYPES.includes(mem.type as MemoryType)) continue;
        if (!speakers.includes(mem.agent_id)) continue;
        if (mem.confidence < minConfidence) continue;
        if (mem.content.length > 400) mem.content = mem.content.slice(0, 400);

        const id = await writeMemory({
            agent_id: mem.agent_id,
            type: mem.type as MemoryType,
            content: mem.content,
            confidence: mem.confidence,
            tags: mem.tags ?? [],
            source_trace_id: `conversation:${sessionId}:${mem.agent_id}:${written}`,
        });

        if (id) {
            written++;
            await enforceMemoryCap(mem.agent_id);
        }
    }

    // Process drifts (only if included)
    if (includeDrifts) {
        const drifts = parsed.pairwise_drift ?? [];
        if (drifts.length > 0) {
            const validDrifts = drifts.filter(
                d =>
                    speakers.includes(d.agent_a) &&
                    speakers.includes(d.agent_b) &&
                    d.agent_a !== d.agent_b &&
                    Math.abs(d.drift) <= 0.03,
            );
            if (validDrifts.length > 0) {
                await applyPairwiseDrifts(validDrifts, sessionId);
            }
        }
    }

    // Process action items (extracted from the same LLM call)
    if (includeActions) {
        const actionItems = (parsed.action_items ?? []).slice(
            0,
            maxActionItems,
        );
        for (const item of actionItems) {
            if (!speakers.includes(item.agent_id)) continue;

            try {
                await createProposalAndMaybeAutoApprove({
                    agent_id: item.agent_id,
                    title: item.title,
                    proposed_steps: [
                        { kind: item.step_kind as never, payload: {} },
                    ],
                    source: 'conversation',
                    source_trace_id: `action:${sessionId}:${item.agent_id}`,
                });
            } catch (err) {
                log.warn('Failed to create proposal for action item', {
                    error: err,
                    agent_id: item.agent_id,
                });
            }
        }
    }

    return written;
}
