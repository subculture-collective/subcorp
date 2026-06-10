// Cron Scheduler — evaluates cron schedules and enqueues agent sessions
// Called by the heartbeat (Phase 8). Uses cron-parser to compute next fire times.

import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeNextCronFireAt, shouldCronScheduleFire } from './cron-utils';

const log = logger.child({ module: 'cron-scheduler' });

/**
 * Evaluate all enabled cron schedules and enqueue sessions for any that should fire.
 * Called by the heartbeat every 5 minutes.
 */
export async function evaluateCronSchedules(): Promise<{
    evaluated: number;
    fired: number;
}> {
    const schedules = await sql`
        SELECT * FROM ops_cron_schedules
        WHERE enabled = true
    `;

    let fired = 0;

    for (const schedule of schedules) {
        try {
            if (!shouldCronScheduleFire(
                schedule.cron_expression,
                schedule.timezone,
                schedule.last_fired_at,
                schedule.next_fire_at,
            )) {
                continue;
            }

            // Enqueue agent session
            await sql`
                INSERT INTO ops_agent_sessions (
                    agent_id, prompt, source, source_id,
                    timeout_seconds, max_tool_rounds
                ) VALUES (
                    ${schedule.agent_id},
                    ${schedule.prompt},
                    'cron',
                    ${schedule.id},
                    ${schedule.timeout_seconds},
                    ${schedule.max_tool_rounds}
                )
            `;

            // Update schedule timestamps
            const nextFireAt = computeNextCronFireAt(schedule.cron_expression, schedule.timezone);
            await sql`
                UPDATE ops_cron_schedules
                SET last_fired_at = NOW(),
                    next_fire_at = ${nextFireAt.toISOString()},
                    updated_at = NOW()
                WHERE id = ${schedule.id}
            `;

            log.info('Cron schedule fired', {
                name: schedule.name,
                agent: schedule.agent_id,
                nextFire: nextFireAt.toISOString(),
            });

            fired++;
        } catch (err) {
            log.error('Cron schedule evaluation failed', {
                error: err,
                scheduleId: schedule.id,
                name: schedule.name,
            });
        }
    }

    return { evaluated: schedules.length, fired };
}
