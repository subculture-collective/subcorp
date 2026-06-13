// Agent scratchpad — persistent working memory document
// Each agent has a single scratchpad they can read/update between context windows.
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'scratchpad' });

const MAX_SCRATCHPAD_LENGTH = 2000;

/**
 * Get an agent's scratchpad content.
 * Returns empty string if no scratchpad exists yet.
 */
export async function getScratchpad(agentId: string): Promise<string> {
    const [row] = await sql<[{ content: string }?]>`
        SELECT content FROM ops_agent_scratchpad
        WHERE agent_id = ${agentId}
    `;
    return row?.content ?? '';
}

/**
 * Update an agent's scratchpad content.
 * Creates the scratchpad if it doesn't exist (upsert).
 * Truncates to MAX_SCRATCHPAD_LENGTH.
 */
export async function updateScratchpad(
    agentId: string,
    content: string,
): Promise<{ updated: boolean; length: number }> {
    const trimmed = content.slice(0, MAX_SCRATCHPAD_LENGTH);

    try {
        await sql`
            INSERT INTO ops_agent_scratchpad (agent_id, content, updated_at)
            VALUES (${agentId}, ${trimmed}, now())
            ON CONFLICT (agent_id) DO UPDATE
            SET content = ${trimmed},
                updated_at = now()
        `;

        log.info('Scratchpad updated', {
            agentId,
            length: trimmed.length,
        });

        return { updated: true, length: trimmed.length };
    } catch (err) {
        log.error('Failed to update scratchpad', { error: err, agentId });
        return { updated: false, length: 0 };
    }
}
