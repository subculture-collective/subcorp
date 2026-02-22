// Sanctum memory distiller — extract memories from user↔agent conversations
// Runs periodically (every N agent messages) to form lasting memories from Sanctum chats.
import { sql } from '@/lib/db';
import { llmGenerate } from '@/lib/llm';
import { writeMemory, enforceMemoryCap } from '@/lib/ops/memory';
import type { MemoryType } from '@/lib/types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'sanctum-distiller' });

const VALID_MEMORY_TYPES: MemoryType[] = [
    'insight',
    'pattern',
    'strategy',
    'preference',
    'lesson',
];

/** How many agent messages between distillation runs per conversation */
const DISTILL_EVERY_N = 6;

/** Track last-distilled message count per conversation to avoid re-processing */
const lastDistilledAt = new Map<string, number>();

/**
 * Check if a conversation is due for memory distillation.
 * Returns true if enough new agent messages have accumulated.
 */
export async function shouldDistill(conversationId: string): Promise<boolean> {
    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM ops_sanctum_messages
        WHERE conversation_id = ${conversationId}
          AND role = 'agent'
    `;

    const lastCount = lastDistilledAt.get(conversationId) ?? 0;
    return count >= lastCount + DISTILL_EVERY_N;
}

/**
 * Distill memories from a Sanctum conversation.
 * Reads recent un-distilled messages and uses the LLM to extract memories.
 * Returns the number of memories written.
 */
export async function distillSanctumMemories(
    conversationId: string,
): Promise<number> {
    // Get recent messages (up to 30 most recent)
    const messages = await sql<
        Array<{
            role: string;
            agent_id: string | null;
            content: string;
            created_at: string;
        }>
    >`
        SELECT role, agent_id, content, created_at
        FROM ops_sanctum_messages
        WHERE conversation_id = ${conversationId}
          AND LENGTH(content) >= 20
        ORDER BY created_at DESC
        LIMIT 15
    `;

    if (messages.length < 4) return 0;

    // Reverse to chronological order
    messages.reverse();

    // Build transcript
    const transcript = messages
        .map(m => {
            const speaker = m.role === 'user' ? 'User' : (m.agent_id ?? 'Agent');
            return `[${speaker}]: ${m.content}`;
        })
        .join('\n');

    const agents = [
        ...new Set(
            messages
                .filter(m => m.role === 'agent' && m.agent_id)
                .map(m => m.agent_id!),
        ),
    ];

    if (agents.length === 0) return 0;

    const prompt = `You are a memory extraction system for an AI agent collective.

Analyze this Sanctum conversation between a human user and AI agents.
Extract key memories that each agent should retain from this interaction.

Focus on:
- What the user cares about, their preferences, and communication style
- Insights or ideas that emerged from the dialogue
- Patterns in what topics the user brings up
- Lessons learned from the interaction
- Strategies or approaches discussed

Conversation transcript:
${transcript}

Participating agents: ${agents.join(', ')}

Respond with valid JSON only:
{
  "memories": [
    { "agent_id": "string", "type": "insight|pattern|strategy|preference|lesson", "content": "max 200 chars", "confidence": 0.55-1.0, "tags": ["string"] }
  ]
}

Rules:
- Max 4 memories total
- Only valid types: ${VALID_MEMORY_TYPES.join(', ')}
- Only valid agents: ${agents.join(', ')}
- Confidence must be >= 0.55
- Content max 200 characters
- Focus on what's genuinely worth remembering long-term
- Tag memories with "sanctum" plus relevant topic tags
- Return empty array if nothing meaningful to extract`;

    let parsed: {
        memories?: Array<{
            agent_id: string;
            type: string;
            content: string;
            confidence: number;
            tags: string[];
        }>;
    };

    try {
        const response = await llmGenerate({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            maxTokens: 800,
            trackingContext: {
                agentId: 'system',
                context: 'sanctum-distillation',
            },
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            log.warn('No JSON found in distillation response', {
                conversationId,
            });
            return 0;
        }
        parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
        log.error('Sanctum distillation LLM call failed', {
            error: err,
            conversationId,
        });
        return 0;
    }

    let written = 0;
    const memories = (parsed.memories ?? []).slice(0, 4);

    for (const mem of memories) {
        if (!VALID_MEMORY_TYPES.includes(mem.type as MemoryType)) continue;
        if (!agents.includes(mem.agent_id)) continue;
        if (mem.confidence < 0.55) continue;
        if (mem.content.length > 200) mem.content = mem.content.slice(0, 200);

        // Ensure "sanctum" tag is present
        const tags = mem.tags ?? [];
        if (!tags.includes('sanctum')) tags.push('sanctum');

        const id = await writeMemory({
            agent_id: mem.agent_id,
            type: mem.type as MemoryType,
            content: mem.content,
            confidence: mem.confidence,
            tags,
            source_trace_id: `sanctum:${conversationId}:${mem.agent_id}:${written}`,
        });

        if (id) {
            written++;
            await enforceMemoryCap(mem.agent_id);
        }
    }

    // Update tracking so we don't re-distill the same messages
    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM ops_sanctum_messages
        WHERE conversation_id = ${conversationId}
          AND role = 'agent'
    `;
    lastDistilledAt.set(conversationId, count);

    if (written > 0) {
        log.info('Sanctum memories distilled', {
            conversationId,
            memoriesWritten: written,
            agents,
        });
    }

    return written;
}
