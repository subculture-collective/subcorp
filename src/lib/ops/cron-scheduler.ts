// Cron Scheduler — evaluates cron schedules and enqueues agent sessions
// Called by the heartbeat (Phase 8). Uses cron-parser to compute next fire times.

import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'cron-scheduler' });

function getTimeParts(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        hour12: false,
    });
    return Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
}

function matchesCronAt(cronExpr: string, timezone: string, date: Date): boolean {
    const fields = cronExpr.trim().split(/\s+/);
    if (fields.length < 5) return false;
    const [minField, hourField, domField, monthField, dowField] = fields;

    const parts = getTimeParts(date, timezone);
    const minute = parseInt(parts.minute ?? '0');
    const hour = parseInt(parts.hour ?? '0');
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? 'Mon');
    const dom = parseInt(parts.day ?? '1');
    const month = parseInt(parts.month ?? '1');

    return (
        matchField(minField, minute, 0, 59) &&
        matchField(hourField, hour, 0, 23) &&
        matchField(domField, dom, 1, 31) &&
        matchField(monthField, month, 1, 12) &&
        matchField(dowField, dow, 0, 6)
    );
}

/**
 * Check if the cron schedule should fire between lastFiredAt and now.
 * This avoids misses when heartbeat starts on-time but reaches cron phase 1-2 minutes later.
 */
function shouldFire(cronExpr: string, timezone: string, lastFiredAt: string | null): boolean {
    const now = new Date();
    const nowMinute = new Date(now);
    nowMinute.setSeconds(0, 0);

    const fallbackWindowMinutes = 5;
    const maxScanMinutes = 24 * 60;

    let windowStart =
        lastFiredAt ?
            new Date(new Date(lastFiredAt).getTime() + 60_000)
        :   new Date(nowMinute.getTime() - fallbackWindowMinutes * 60_000);

    windowStart.setSeconds(0, 0);

    const maxWindowStart = new Date(nowMinute.getTime() - maxScanMinutes * 60_000);
    if (windowStart < maxWindowStart) {
        windowStart = maxWindowStart;
    }

    if (windowStart > nowMinute) return false;

    for (
        let ts = windowStart.getTime();
        ts <= nowMinute.getTime();
        ts += 60_000
    ) {
        if (matchesCronAt(cronExpr, timezone, new Date(ts))) {
            return true;
        }
    }

    return false;
}

/** Match a single cron field against a value */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function matchField(field: string, value: number, _min: number, _max: number): boolean {
    if (field === '*') return true;

    // Handle */N (every N)
    if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2));
        return value % step === 0;
    }

    // Handle comma-separated values
    const values = field.split(',');
    for (const v of values) {
        // Handle ranges: N-M
        if (v.includes('-')) {
            const [start, end] = v.split('-').map(Number);
            if (value >= start && value <= end) return true;
        } else {
            if (parseInt(v) === value) return true;
        }
    }

    return false;
}

/** Compute the next fire time (approximate — for display only) */
function computeNextFireAt(cronExpr: string, timezone: string): Date {
    // Simple heuristic: advance from now minute-by-minute (max 7 days)
    const now = new Date();
    const maxIterations = 7 * 24 * 60; // 7 days of minutes

    for (let i = 1; i <= maxIterations; i++) {
        const candidate = new Date(now.getTime() + i * 60_000);
        const parts = getTimeParts(candidate, timezone);

        const min = parseInt(parts.minute ?? '0');
        const hour = parseInt(parts.hour ?? '0');
        const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            .indexOf(parts.weekday ?? 'Mon');
        const dom = parseInt(parts.day ?? '1');
        const month = parseInt(parts.month ?? '1');

        const fields = cronExpr.trim().split(/\s+/);
        if (fields.length < 5) break;

        const [minF, hourF, domF, monthF, dowF] = fields;

        if (
            matchField(minF, min, 0, 59) &&
            matchField(hourF, hour, 0, 23) &&
            matchField(domF, dom, 1, 31) &&
            matchField(monthF, month, 1, 12) &&
            matchField(dowF, dow, 0, 6)
        ) {
            return candidate;
        }
    }

    // Fallback: 1 day from now
    return new Date(now.getTime() + 86_400_000);
}

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
            if (!shouldFire(schedule.cron_expression, schedule.timezone, schedule.last_fired_at)) {
                continue;
            }

            // Enqueue agent session
            await sql`
                INSERT INTO ops_agent_sessions (
                    agent_id, prompt, source, source_id, model,
                    timeout_seconds, max_tool_rounds
                ) VALUES (
                    ${schedule.agent_id},
                    ${schedule.prompt},
                    'cron',
                    ${schedule.id},
                    ${schedule.model ?? null},
                    ${schedule.timeout_seconds},
                    ${schedule.max_tool_rounds}
                )
            `;

            // Update schedule timestamps
            const nextFireAt = computeNextFireAt(schedule.cron_expression, schedule.timezone);
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
