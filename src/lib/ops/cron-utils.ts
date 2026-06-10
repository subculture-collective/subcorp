const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(timezone: string): Intl.DateTimeFormat {
    let formatter = timeFormatterCache.get(timezone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
            hour12: false,
        });
        timeFormatterCache.set(timezone, formatter);
    }
    return formatter;
}

function getTimeParts(date: Date, timezone: string) {
    const formatter = getTimeFormatter(timezone);
    return Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
}

function minuteFloor(date: Date): Date {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    return rounded;
}

/** Match a single cron field against a value. Supports *, */
export function matchCronField(field: string, value: number): boolean {
    if (field === '*') return true;

    if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2));
        return Number.isFinite(step) && step > 0 && value % step === 0;
    }

    const values = field.split(',');
    for (const v of values) {
        if (v.includes('-')) {
            const [start, end] = v.split('-').map(Number);
            if (value >= start && value <= end) return true;
        } else if (parseInt(v) === value) {
            return true;
        }
    }

    return false;
}

export function matchesCronAt(cronExpr: string, timezone: string, date: Date): boolean {
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
        matchCronField(minField, minute) &&
        matchCronField(hourField, hour) &&
        matchCronField(domField, dom) &&
        matchCronField(monthField, month) &&
        matchCronField(dowField, dow)
    );
}

/**
 * Determine whether a schedule is due exactly once for this heartbeat.
 * Prefer persisted next_fire_at so stale weekly/monthly jobs recover even if
 * last_fired_at is outside a small scan window. Fall back to a bounded scan.
 */
export function shouldCronScheduleFire(
    cronExpr: string,
    timezone: string,
    lastFiredAt: string | null,
    nextFireAt: string | null,
    now: Date = new Date(),
): boolean {
    const nowMinute = minuteFloor(now);

    if (nextFireAt) {
        const dueAt = minuteFloor(new Date(nextFireAt));
        if (!Number.isNaN(dueAt.getTime()) && dueAt <= nowMinute) {
            return true;
        }
    }

    const fallbackWindowMinutes = 5;
    const maxRecoveryWindowMinutes = 32 * 24 * 60;

    let windowStart =
        lastFiredAt ?
            new Date(new Date(lastFiredAt).getTime() + 60_000)
        :   new Date(nowMinute.getTime() - fallbackWindowMinutes * 60_000);
    windowStart = minuteFloor(windowStart);

    const maxWindowStart = new Date(nowMinute.getTime() - maxRecoveryWindowMinutes * 60_000);
    if (windowStart < maxWindowStart) {
        windowStart = maxWindowStart;
    }

    if (windowStart > nowMinute) return false;

    for (let ts = windowStart.getTime(); ts <= nowMinute.getTime(); ts += 60_000) {
        if (matchesCronAt(cronExpr, timezone, new Date(ts))) return true;
    }

    return false;
}

/** Compute the next fire time after reference time. */
export function computeNextCronFireAt(
    cronExpr: string,
    timezone: string,
    reference: Date = new Date(),
): Date {
    const start = minuteFloor(reference);
    const maxIterations = 32 * 24 * 60;

    for (let i = 1; i <= maxIterations; i++) {
        const candidate = new Date(start.getTime() + i * 60_000);
        if (matchesCronAt(cronExpr, timezone, candidate)) return candidate;
    }

    return new Date(start.getTime() + 86_400_000);
}
