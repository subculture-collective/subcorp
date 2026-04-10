// verify-launch.mjs — Pre-flight check for SUBCORP
// Validates database tables, policies, triggers, and connectivity.
//
// Run: node scripts/go-live/verify-launch.mjs

import postgres from 'postgres';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger.mjs';

dotenv.config({ path: ['.env.local', '.env'] });
const log = createLogger({ service: 'verify-launch' });

// ─── Setup ───

const DATABASE_URL = process.env.DATABASE_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) {
    log.info(msg);
    passed++;
}

function fail(msg) {
    log.error(msg);
    failed++;
}

function warn(msg) {
    log.warn(msg);
    warnings++;
}

// ─── Checks ───

async function checkEnvVars() {
    log.info('Checking environment variables');

    if (DATABASE_URL) pass('DATABASE_URL is set');
    else fail('DATABASE_URL is not set');

    if (CRON_SECRET) pass('CRON_SECRET is set');
    else
        warn(
            'CRON_SECRET is not set (heartbeat will accept unauthenticated requests)',
        );

    if (OPENROUTER_API_KEY) pass('OPENROUTER_API_KEY is set');
    else fail('OPENROUTER_API_KEY is not set (workers need this)');

    if (GHOST_ADMIN_API_KEY) pass('GHOST_ADMIN_API_KEY is set (Ghost mirror enabled)');
    else warn('GHOST_ADMIN_API_KEY is not set (Ghost mirror backfill will wait)');
}

async function checkTables(sql) {
    log.info('Checking database tables');

    const requiredTables = [
        'ops_mission_proposals',
        'ops_missions',
        'ops_mission_steps',
        'ops_agent_events',
        'ops_policy',
        'ops_trigger_rules',
        'ops_agent_reactions',
        'ops_action_runs',
        'ops_roundtable_sessions',
        'ops_roundtable_turns',
        'ops_agent_memory',
        'ops_agent_relationships',
        'ops_initiative_queue',
        'ops_agent_registry',
        'ops_agent_skills',
        'ops_agent_sessions',
        'ops_content_drafts',
        'ops_governance_proposals',
        'ops_agent_proposals',
        'ops_rss_feeds',
        'ops_discord_channels',
        'ops_model_routing',
        'ops_llm_usage',
    ];

    for (const table of requiredTables) {
        try {
            const [{ count }] = await sql.unsafe(
                `SELECT COUNT(*)::int as count FROM ${table}`,
            );
            pass(`${table} (${count} rows)`);
        } catch (err) {
            fail(`${table}: ${err.message}`);
        }
    }
}

async function checkStatusConstraints(sql) {
    log.info('Checking status constraints');

    const checks = [
        {
            table: 'ops_agent_sessions',
            constraint: 'ops_agent_sessions_status_check',
            required: ['pending', 'running', 'succeeded', 'blocked', 'failed', 'timed_out'],
        },
        {
            table: 'ops_mission_steps',
            constraint: 'ops_mission_steps_status_check',
            required: ['queued', 'running', 'succeeded', 'blocked', 'failed', 'skipped'],
        },
        {
            table: 'ops_missions',
            constraint: 'ops_missions_status_check',
            required: ['approved', 'running', 'succeeded', 'blocked', 'failed', 'cancelled'],
        },
    ];

    for (const check of checks) {
        try {
            const rows = await sql`
                SELECT pg_get_constraintdef(c.oid) AS def
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE t.relname = ${check.table}
                  AND c.conname = ${check.constraint}
                LIMIT 1
            `;

            const def = rows?.[0]?.def;
            if (!def) {
                fail(`${check.table}: missing ${check.constraint}`);
                continue;
            }

            const missing = check.required.filter(v => !def.includes(`'${v}'`));
            if (missing.length > 0) {
                fail(
                    `${check.table}: ${check.constraint} missing status(es): ${missing.join(', ')}`,
                );
                continue;
            }

            pass(`${check.table}: ${check.constraint} includes expected statuses`);
        } catch (err) {
            fail(`${check.table}: constraint check failed (${err.message})`);
        }
    }
}

async function checkPolicies(sql) {
    log.info('Checking policies');

    const requiredPolicies = [
        'auto_approve',
        'x_daily_quota',
        'roundtable_policy',
        'system_enabled',
        'reaction_matrix',
        'memory_influence_policy',
        'relationship_drift_policy',
        'initiative_policy',
    ];

    for (const key of requiredPolicies) {
        try {
            const [data] = await sql`
                SELECT key, value FROM ops_policy WHERE key = ${key}
            `;

            if (!data) {
                fail(`Policy "${key}" not found — run make seed-policy`);
            } else {
                const enabled = data.value?.enabled;
                const status =
                    enabled === true ? '🟢 enabled'
                    : enabled === false ? '🔴 disabled'
                    : '⚙️ configured';
                pass(`${key}: ${status}`);
            }
        } catch (err) {
            fail(`Policy "${key}": ${err.message}`);
        }
    }
}

async function checkTriggers(sql) {
    log.info('Checking trigger rules');

    try {
        const data = await sql`
            SELECT name, enabled, fire_count, trigger_event
            FROM ops_trigger_rules
            ORDER BY name
        `;

        if (!data || data.length === 0) {
            fail('No trigger rules found — run make seed-triggers');
            return;
        }

        const reactive = data.filter(
            t => !t.trigger_event.startsWith('proactive_'),
        );
        const proactive = data.filter(t =>
            t.trigger_event.startsWith('proactive_'),
        );

        pass(`${reactive.length} reactive trigger(s)`);
        for (const t of reactive) {
            log.debug('Reactive trigger', {
                name: t.name,
                enabled: t.enabled,
                fire_count: t.fire_count,
            });
        }

        pass(`${proactive.length} proactive trigger(s)`);
        for (const t of proactive) {
            log.debug('Proactive trigger', {
                name: t.name,
                enabled: t.enabled,
                fire_count: t.fire_count,
            });
        }
    } catch (err) {
        fail(`Failed to query trigger rules: ${err.message}`);
    }
}

async function checkRelationships(sql) {
    log.info('Checking agent relationships');

    try {
        const data = await sql`
            SELECT agent_a, agent_b, affinity, total_interactions
            FROM ops_agent_relationships
        `;

        if (!data || data.length === 0) {
            fail('No relationships found — run make seed-relationships');
            return;
        }

        // 6 agents = 15 pairs
        const expectedPairs = 15;
        if (data.length >= expectedPairs) {
            pass(`${data.length} relationship pair(s) found`);
        } else {
            warn(`${data.length} pair(s) found, expected ${expectedPairs}`);
        }

        for (const r of data) {
            log.debug('Agent relationship', {
                agents: `${r.agent_a} ↔ ${r.agent_b}`,
                affinity: r.affinity,
                interactions: r.total_interactions,
            });
        }
    } catch (err) {
        fail(`Failed to query relationships: ${err.message}`);
    }
}

async function checkRssFeeds(sql) {
    log.info('Checking RSS feeds');

    try {
        const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_rss_feeds WHERE enabled = true
        `;
        if (count > 0) {
            pass(`${count} RSS feed(s) configured`);
        } else {
            fail('No RSS feeds found — run make seed-rss');
        }
    } catch (err) {
        fail(`Failed to query RSS feeds: ${err.message}`);
    }
}

async function checkRecentActivity(sql) {
    log.info('Checking recent activity');

    // Heartbeat runs
    try {
        const runs = await sql`
            SELECT action, status, created_at FROM ops_action_runs
            WHERE action = 'heartbeat'
            ORDER BY created_at DESC LIMIT 3
        `;

        if (runs && runs.length > 0) {
            pass(`Last heartbeat: ${runs[0].status} at ${runs[0].created_at}`);
        } else {
            warn('No heartbeat runs found yet');
        }
    } catch {
        warn('Could not check heartbeat runs');
    }

    // Events
    try {
        const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_agent_events
        `;
        if (count > 0) {
            pass(`${count} events in the system`);
        } else {
            warn('No events yet — system has not started producing');
        }
    } catch {
        warn('Could not check events');
    }

    // Conversations
    try {
        const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
        `;
        if (count > 0) {
            pass(`${count} conversations recorded`);
        } else {
            warn('No conversations yet — fine if roundtable is disabled');
        }
    } catch {
        warn('Could not check conversations');
    }

    // Memories
    try {
        const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_agent_memory
        `;
        if (count > 0) {
            pass(`${count} memories stored`);
        } else {
            warn(
                'No memories yet — need at least one conversation to generate',
            );
        }
    } catch {
        warn('Could not check memories');
    }

    // Missions
    try {
        const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_missions
        `;
        if (count > 0) {
            pass(`${count} missions created`);
        } else {
            warn('No missions yet — proposals need to be approved first');
        }
    } catch {
        warn('Could not check missions');
    }
}

async function checkLLMConnectivity() {
    log.info('Checking LLM API connectivity');

    if (!OPENROUTER_API_KEY) {
        fail('Cannot test LLM — OPENROUTER_API_KEY is not set');
        return;
    }

    try {
        const res = await fetch(`${OPENROUTER_BASE}/models`, {
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            pass(`OpenRouter API reachable at ${OPENROUTER_BASE}`);
        } else {
            fail(`OpenRouter API returned ${res.status}: ${res.statusText}`);
        }
    } catch (err) {
        fail(`OpenRouter API unreachable: ${err.message}`);
    }
}

async function checkToolbox() {
    log.info('Checking toolbox container');

    try {
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const exec = promisify(execFile);

        const { stdout } = await exec('docker', [
            'exec', 'subcult-toolbox', 'bash', '-c',
            'whoami && which curl git node python3 rg',
        ], { timeout: 10_000 });

        const lines = stdout.trim().split('\n');
        const user = lines[0];
        if (user === 'root') {
            pass('Toolbox running as root');
        } else {
            warn(`Toolbox running as "${user}" (expected root)`);
        }
        pass(`Toolbox has ${lines.length - 1} core binaries`);
    } catch (err) {
        fail(`Toolbox unreachable: ${err.message}`);
    }
}

// ─── Main ───

async function main() {
    log.info('Starting launch verification');

    await checkEnvVars();

    if (!DATABASE_URL) {
        log.fatal('Cannot proceed without DATABASE_URL');
        process.exit(1);
    }

    const sql = postgres(DATABASE_URL);

    await checkTables(sql);
    await checkStatusConstraints(sql);
    await checkPolicies(sql);
    await checkTriggers(sql);
    await checkRelationships(sql);
    await checkRssFeeds(sql);
    await checkRecentActivity(sql);
    await checkLLMConnectivity();
    await checkToolbox();

    await sql.end();

    // ─── Summary ───
    log.info('Launch verification complete', { passed, warnings, failed });

    if (failed > 0) {
        log.error('Fix the failures before launching');
        process.exit(1);
    } else if (warnings > 0) {
        log.warn('System is functional but has warnings');
    } else {
        log.info('All checks passed — ready to launch!');
    }
}

main().catch(err => {
    log.fatal('Verification failed', { error: err });
    process.exit(1);
});
