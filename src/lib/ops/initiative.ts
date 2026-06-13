// Initiative queueing and processing
import { sql, jsonb } from '@/lib/db';
import { AGENT_IDS } from '../agents';
import { getPolicy } from './policy';
import { queryAgentMemories } from './memory';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'initiative' });

export async function maybeQueueInitiative(
    agentId: string,
    policyOverrides?: {
        cooldown_minutes?: number;
        min_memories?: number;
        min_confidence?: number;
    },
): Promise<string | null> {
    const cooldownMinutes = policyOverrides?.cooldown_minutes ?? 120;
    const minMemories = policyOverrides?.min_memories ?? 5;
    const minConfidence = policyOverrides?.min_confidence ?? 0.55;

    // Cooldown check
    const cutoff = new Date(
        Date.now() - cooldownMinutes * 60_000,
    ).toISOString();

    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_initiative_queue
        WHERE agent_id = ${agentId}
        AND created_at >= ${cutoff}
    `;

    if (count > 0) return null;

    // Memory prerequisites
    const memories = await queryAgentMemories({
        agentId,
        limit: minMemories,
        minConfidence,
    });

    if (memories.length < minMemories) return null;

    // Queue initiative with memory context
    const context = {
        memories: memories.map(m => ({
            type: m.type,
            content: m.content,
            confidence: m.confidence,
            tags: m.tags,
        })),
    };

    const [row] = await sql`
        INSERT INTO ops_initiative_queue (agent_id, status, context)
        VALUES (${agentId}, 'pending', ${jsonb(context)})
        RETURNING id
    `;

    return row.id;
}

export async function checkAndQueueInitiatives(): Promise<{
    checked: number;
    queued: number;
}> {
    const policy = await getPolicy('initiative_policy');
    if (!(policy.enabled as boolean)) {
        return { checked: 0, queued: 0 };
    }

    const policyOverrides = {
        cooldown_minutes: (policy.cooldown_minutes as number) ?? undefined,
        min_memories: (policy.min_memories as number) ?? undefined,
        min_confidence: (policy.min_confidence as number) ?? undefined,
    };

    let queued = 0;
    for (const agentId of AGENT_IDS) {
        try {
            const id = await maybeQueueInitiative(agentId, policyOverrides);
            if (id) queued++;
        } catch (err) {
            log.error(`Failed to queue initiative for ${agentId}`, {
                error: err,
                agentId,
            });
        }
    }

    return { checked: AGENT_IDS.length, queued };
}

export async function claimNextInitiative(): Promise<{
    id: string;
    agent_id: string;
    context: Record<string, unknown>;
} | null> {
    const [claimed] = await sql`
        UPDATE ops_initiative_queue
        SET status = 'processing'
        WHERE id = (
            SELECT id FROM ops_initiative_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, agent_id, context
    `;

    if (!claimed) return null;
    return claimed as {
        id: string;
        agent_id: string;
        context: Record<string, unknown>;
    };
}

export async function completeInitiative(
    id: string,
    result: Record<string, unknown>,
): Promise<void> {
    await sql`
        UPDATE ops_initiative_queue
        SET status = 'completed',
            processed_at = NOW(),
            result = ${jsonb(result)}
        WHERE id = ${id}
    `;
}

export async function failInitiative(id: string, error: string): Promise<void> {
    await sql`
        UPDATE ops_initiative_queue
        SET status = 'failed',
            processed_at = NOW(),
            result = ${jsonb({ error })}
        WHERE id = ${id}
    `;
}
