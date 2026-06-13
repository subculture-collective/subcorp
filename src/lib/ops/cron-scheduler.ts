// Cron Scheduler — evaluates cron schedules and enqueues agent sessions
// Called by the heartbeat (Phase 8). Uses cron-parser to compute next fire times.

import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentTenantContext } from '@/lib/tenant/context';
import { computeNextCronFireAt, shouldCronScheduleFire } from './cron-utils';

const log = logger.child({ module: 'cron-scheduler' });

interface CronScheduleRow {
    id: string;
    name: string;
    agent_id: string;
    cron_expression: string;
    timezone: string;
    prompt: string;
    timeout_seconds: number;
    max_tool_rounds: number;
    last_fired_at: string | null;
    next_fire_at: string | null;
}

function scheduleSlot(schedule: Pick<CronScheduleRow, 'id' | 'next_fire_at'>): string {
    const base = schedule.next_fire_at ? new Date(schedule.next_fire_at) : new Date();
    base.setSeconds(0, 0);
    return `${schedule.id}:${base.toISOString()}`;
}

/**
 * Evaluate all enabled cron schedules and enqueue sessions for any that should fire.
 * Called by the heartbeat every 5 minutes.
 */
export async function evaluateCronSchedules(): Promise<{
    evaluated: number;
    fired: number;
}> {
    const schedules = await sql<CronScheduleRow[]>`
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

            const tenant = getCurrentTenantContext();
            const firedThisSchedule = await sql.begin(async tx => {
                const db = tx as unknown as typeof sql;
                const [locked] = await db<[CronScheduleRow?]>`
                    SELECT * FROM ops_cron_schedules
                    WHERE id = ${schedule.id}
                    FOR UPDATE SKIP LOCKED
                `;
                if (!locked) return false;
                if (!shouldCronScheduleFire(
                    locked.cron_expression,
                    locked.timezone,
                    locked.last_fired_at,
                    locked.next_fire_at,
                )) {
                    return false;
                }

                const slot = scheduleSlot(locked);
                const scheduledFor = locked.next_fire_at ? new Date(locked.next_fire_at) : new Date();
                const inserted = await db<{ id: string }[]>`
                    INSERT INTO ops_agent_sessions (
                        agent_id, prompt, source, source_id,
                        timeout_seconds, max_tool_rounds,
                        tenant_id, workspace_id, scheduled_for, schedule_slot
                    ) VALUES (
                        ${locked.agent_id},
                        ${locked.prompt},
                        'cron',
                        ${locked.id},
                        ${locked.timeout_seconds},
                        ${locked.max_tool_rounds},
                        ${tenant.tenantId},
                        ${tenant.workspaceId},
                        ${scheduledFor.toISOString()},
                        ${slot}
                    )
                    ON CONFLICT (tenant_id, source, source_id, schedule_slot)
                    WHERE source = 'cron' AND schedule_slot IS NOT NULL
                    DO NOTHING
                    RETURNING id
                `;
                if (inserted.length === 0) return false;

                const nextFireAt = computeNextCronFireAt(locked.cron_expression, locked.timezone);
                await db`
                    UPDATE ops_cron_schedules
                    SET last_fired_at = NOW(),
                        next_fire_at = ${nextFireAt.toISOString()},
                        updated_at = NOW()
                    WHERE id = ${locked.id}
                `;
                return true;
            });

            if (!firedThisSchedule) continue;

            const nextFireAt = computeNextCronFireAt(schedule.cron_expression, schedule.timezone);

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
