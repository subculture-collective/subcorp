// Condition Evaluator — evaluates declarative trigger conditions from JSONB
//
// Supported condition types:
//   query_count  — SELECT COUNT(*) with dynamic WHERE clauses
//   event_exists — checks ops_agent_events for recent matching events
//   event_absent — inverse of event_exists
//   time_window  — checks current hour against after/before bounds
//   probability  — Math.random() < value
//   all / any    — recursive combinators

import { sql } from '@/lib/db';

// ─── Types ───

interface QueryCountCondition {
    type: 'query_count';
    table: string;
    where: Record<string, unknown>;
    operator: '==' | '>=' | '<=' | '>' | '<' | '!=';
    threshold: number;
}

interface EventCondition {
    type: 'event_exists' | 'event_absent';
    kind: string;
    lookback_minutes: number;
}

interface TimeWindowCondition {
    type: 'time_window';
    after?: number; // hour (0-23)
    before?: number; // hour (0-23)
}

interface ProbabilityCondition {
    type: 'probability';
    value: number; // 0-1
}

interface CombinatorCondition {
    type: 'all' | 'any';
    conditions: TriggerCondition[];
}

export type TriggerCondition =
    | QueryCountCondition
    | EventCondition
    | TimeWindowCondition
    | ProbabilityCondition
    | CombinatorCondition;

// ─── Security: whitelist of queryable tables ───

const ALLOWED_TABLES = new Set([
    'ops_mission_steps',
    'ops_roundtable_sessions',
    'ops_mission_proposals',
    'ops_agent_memory',
    'ops_agent_events',
    'ops_missions',
]);

// ─── Evaluator ───

export async function evaluateCondition(condition: TriggerCondition): Promise<boolean> {
    switch (condition.type) {
        case 'query_count':
            return evaluateQueryCount(condition);
        case 'event_exists':
            return evaluateEvent(condition, true);
        case 'event_absent':
            return evaluateEvent(condition, false);
        case 'time_window':
            return evaluateTimeWindow(condition);
        case 'probability':
            return Math.random() < condition.value;
        case 'all':
            for (const sub of condition.conditions) {
                if (!(await evaluateCondition(sub))) return false;
            }
            return true;
        case 'any':
            for (const sub of condition.conditions) {
                if (await evaluateCondition(sub)) return true;
            }
            return false;
        default:
            return false;
    }
}

// ─── query_count ───

async function evaluateQueryCount(cond: QueryCountCondition): Promise<boolean> {
    if (!ALLOWED_TABLES.has(cond.table)) {
        throw new Error(`Table "${cond.table}" is not in the query whitelist`);
    }

    // Build WHERE clauses from the condition's where object
    const clauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const [key, val] of Object.entries(cond.where)) {
        // Special synthetic keys
        if (key === 'created_today') {
            if (val) {
                clauses.push(`created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')`);
            }
            continue;
        }
        if (key === 'status_in' && Array.isArray(val)) {
            clauses.push(`status = ANY($${paramIdx}::text[])`);
            values.push(val);
            paramIdx++;
            continue;
        }
        if (key === 'updated_at_older_than_minutes' && typeof val === 'number') {
            clauses.push(`updated_at < NOW() - make_interval(mins => $${paramIdx}::int)`);
            values.push(val);
            paramIdx++;
            continue;
        }
        if (key === 'created_in_last_hours' && typeof val === 'number') {
            clauses.push(`created_at >= NOW() - make_interval(hours => $${paramIdx}::int)`);
            values.push(val);
            paramIdx++;
            continue;
        }
        if (key === 'confidence_gte' && typeof val === 'number') {
            clauses.push(`confidence >= $${paramIdx}`);
            values.push(val);
            paramIdx++;
            continue;
        }
        if (key === 'superseded_by_is_null' && val === true) {
            clauses.push(`superseded_by IS NULL`);
            continue;
        }

        // Default: simple equality on a column
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            clauses.push(`${sanitizeColumn(key)} = $${paramIdx}`);
            values.push(val);
            paramIdx++;
        }
    }

    const whereStr = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `SELECT COUNT(*)::int as count FROM ${cond.table} ${whereStr}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [row] = await sql.unsafe<[{ count: number }]>(query, values as any[]);
    const count = row.count;

    return compare(count, cond.operator, cond.threshold);
}

// ─── event_exists / event_absent ───

async function evaluateEvent(cond: EventCondition, expectExists: boolean): Promise<boolean> {
    const cutoff = new Date(Date.now() - cond.lookback_minutes * 60_000).toISOString();

    const [row] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_agent_events
        WHERE kind = ${cond.kind} AND created_at >= ${cutoff}
    `;

    const exists = row.count > 0;
    return expectExists ? exists : !exists;
}

// ─── time_window ───

function evaluateTimeWindow(cond: TimeWindowCondition): boolean {
    const hour = new Date().getUTCHours();
    if (cond.after != null && hour < cond.after) return false;
    if (cond.before != null && hour >= cond.before) return false;
    return true;
}

// ─── Helpers ───

function compare(count: number, op: string, threshold: number): boolean {
    switch (op) {
        case '==': return count === threshold;
        case '>=': return count >= threshold;
        case '<=': return count <= threshold;
        case '>':  return count > threshold;
        case '<':  return count < threshold;
        case '!=': return count !== threshold;
        default:   return false;
    }
}

/** Only allow simple column names (no SQL injection via dynamic keys) */
function sanitizeColumn(name: string): string {
    if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
        throw new Error(`Invalid column name: "${name}"`);
    }
    return name;
}
