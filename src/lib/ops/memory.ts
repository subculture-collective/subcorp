// Agent memory — query, write, manage memory entries
import { sql } from '@/lib/db';
import type {
    MemoryEntry,
    MemoryInput,
    MemoryQuery,
    MemoryCache,
} from '../types';
import { logger } from '@/lib/logger';
import { getEmbedding } from '@/lib/llm/embeddings';

const log = logger.child({ module: 'memory' });

const configuredMemoryCap = Number.parseInt(
    process.env.MEMORY_MAX_PER_AGENT ?? '',
    10,
);
const MAX_MEMORIES_PER_AGENT =
    Number.isFinite(configuredMemoryCap) && configuredMemoryCap > 0 ?
        configuredMemoryCap
    :   null;

export async function queryAgentMemories(
    query: MemoryQuery,
): Promise<MemoryEntry[]> {
    const { agentId, types, tags, minConfidence, limit = 50 } = query;

    const rows = await sql<MemoryEntry[]>`
        SELECT * FROM ops_agent_memory
        WHERE agent_id = ${agentId}
        AND superseded_by IS NULL
        ${types?.length ? sql`AND type = ANY(${sql.array(types)}::text[])` : sql``}
        ${tags?.length ? sql`AND tags && ${tags}` : sql``}
        ${minConfidence ? sql`AND confidence >= ${minConfidence}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;

    return rows;
}

/**
 * Query memories by semantic relevance to a topic, blended with recency.
 * Uses pgvector cosine similarity when embeddings are available.
 * Falls back to pure recency if embedding fails.
 *
 * Returns: top K by relevance + top N by recency (deduplicated).
 */
export async function queryRelevantMemories(
    agentId: string,
    topic: string,
    options?: { relevantLimit?: number; recentLimit?: number },
): Promise<MemoryEntry[]> {
    const relevantLimit = options?.relevantLimit ?? 3;
    const recentLimit = options?.recentLimit ?? 2;

    // Always fetch recent memories as baseline
    const recentRows = await sql<MemoryEntry[]>`
        SELECT * FROM ops_agent_memory
        WHERE agent_id = ${agentId}
          AND superseded_by IS NULL
        ORDER BY created_at DESC
        LIMIT ${recentLimit + relevantLimit}
    `;

    // Try semantic search
    const embedding = await getEmbedding(topic);
    if (!embedding) {
        // No embedding available — return recency only
        return recentRows.slice(0, relevantLimit + recentLimit);
    }

    try {
        const vectorStr = `[${embedding.join(',')}]`;
        const relevantRows = await sql<MemoryEntry[]>`
            SELECT * FROM ops_agent_memory
            WHERE agent_id = ${agentId}
              AND superseded_by IS NULL
              AND embedding IS NOT NULL
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${relevantLimit}
        `;

        // Merge: relevant first, then recent (deduplicated)
        const seen = new Set(relevantRows.map(r => r.id));
        const merged = [...relevantRows];
        for (const row of recentRows) {
            if (!seen.has(row.id)) {
                merged.push(row);
                seen.add(row.id);
                if (merged.length >= relevantLimit + recentLimit) break;
            }
        }

        return merged;
    } catch {
        // Vector search failed — fall back to recency
        return recentRows.slice(0, relevantLimit + recentLimit);
    }
}

export async function writeMemory(input: MemoryInput): Promise<string | null> {
    const confidence = input.confidence ?? 0.5;

    // Confidence gate
    if (confidence < 0.4) return null;

    // Dedup via source_trace_id
    if (input.source_trace_id) {
        const [{ count }] = await sql<[{ count: number }]>`
            SELECT COUNT(*)::int as count FROM ops_agent_memory
            WHERE source_trace_id = ${input.source_trace_id}
        `;
        if (count > 0) return null;
    }

    try {
        // Compute embedding (best-effort — null if unavailable)
        const embedding = await getEmbedding(input.content);

        const insertData: Record<string, unknown> = {
            agent_id: input.agent_id,
            type: input.type,
            content: input.content,
            confidence: Math.round(confidence * 100) / 100,
            tags: input.tags ?? [],
            source_trace_id: input.source_trace_id ?? null,
        };

        let row;
        if (embedding) {
            const vectorStr = `[${embedding.join(',')}]`;
            [row] = await sql`
                INSERT INTO ops_agent_memory ${sql(insertData)}
                RETURNING id
            `;
            // Update embedding separately (avoids postgres.js type issues with vector)
            await sql`
                UPDATE ops_agent_memory
                SET embedding = ${vectorStr}::vector
                WHERE id = ${row.id}
            `.catch(() => { /* ignore if vector column not yet available */ });
        } else {
            [row] = await sql`
                INSERT INTO ops_agent_memory ${sql(insertData)}
                RETURNING id
            `;
        }

        return row.id;
    } catch (err) {
        log.error('Failed to write memory', {
            error: err,
            agent_id: input.agent_id,
            type: input.type,
        });
        return null;
    }
}

export async function enforceMemoryCap(agentId: string): Promise<void> {
    if (MAX_MEMORIES_PER_AGENT === null) return;

    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_agent_memory
        WHERE agent_id = ${agentId} AND superseded_by IS NULL
    `;

    if (count <= MAX_MEMORIES_PER_AGENT) return;

    const overage = count - MAX_MEMORIES_PER_AGENT;
    const oldest = await sql<{ id: string }[]>`
        SELECT id FROM ops_agent_memory
        WHERE agent_id = ${agentId} AND superseded_by IS NULL
        ORDER BY created_at ASC
        LIMIT ${overage}
    `;

    if (oldest.length > 0) {
        const ids = oldest.map(r => r.id);
        await sql`DELETE FROM ops_agent_memory WHERE id = ANY(${sql.array(ids)}::uuid[])`;
    }
}

export async function getCachedMemories(
    agentId: string,
    cache: MemoryCache,
): Promise<MemoryEntry[]> {
    if (cache.has(agentId)) return cache.get(agentId)!;
    const memories = await queryAgentMemories({ agentId, limit: 50 });
    cache.set(agentId, memories);
    return memories;
}

export async function countTodayMemories(agentId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_agent_memory
        WHERE agent_id = ${agentId}
        AND created_at >= ${todayStart.toISOString()}
    `;

    return count;
}
