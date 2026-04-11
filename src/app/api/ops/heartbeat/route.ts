// /api/ops/heartbeat — The system's pulse
// Fires every 5 minutes via cron. Evaluates triggers, processes reactions,
// recovers stale steps. Each phase is try-catch'd so one failure won't crash the rest.

import { NextRequest, NextResponse } from 'next/server';
import { sql, jsonb } from '@/lib/db';
import { evaluateTriggers } from '@/lib/ops/triggers';
import { processReactionQueue } from '@/lib/ops/reaction-matrix';
import { recoverStaleSteps } from '@/lib/ops/recovery';
import { getPolicy } from '@/lib/ops/policy';
import { checkScheduleAndEnqueue } from '@/lib/roundtable/orchestrator';
import { learnFromOutcomes } from '@/lib/ops/outcome-learner';
import { checkAndQueueInitiatives } from '@/lib/ops/initiative';
import { checkArtifactFreshness } from '@/lib/ops/artifact-health';
import { checkTemplateHealth } from '@/lib/ops/template-health';
import { evaluateCronSchedules } from '@/lib/ops/cron-scheduler';
import { generateDailyDigest } from '@/lib/ops/digest';
import { runDreamCycle, hasAgentDreamedToday } from '@/lib/ops/dreams';
import {
    getRebellingAgents,
    attemptRebellionResolution,
    enqueueRebellionCrossExam,
} from '@/lib/ops/rebellion';
import { fetchAllFeeds, generateNewsDigest } from '@/lib/ops/rss';
import { generateDailyNewspaper } from '@/lib/ops/newspaper';
import { AGENT_IDS } from '@/lib/agents';
import { logger } from '@/lib/logger';
import { withRequestContext } from '@/lib/with-request-context';

const log = logger.child({ route: 'heartbeat' });

export const dynamic = 'force-dynamic';

const CONTENT_STEP_KINDS = new Set([
    'analyze_discourse',
    'scan_signals',
    'research_topic',
    'distill_insight',
    'draft_thread',
    'draft_essay',
    'critique_content',
    'refine_narrative',
    'prepare_statement',
    'content_revision',
    'publish_blog',
]);

const GOVERNANCE_STEP_KINDS = new Set([
    'audit_system',
    'review_policy',
    'convene_roundtable',
    'propose_workflow',
    'update_directive',
    'self_evolution',
]);

const CONTENT_RATIO_LOOKBACK_DAYS = 7;

type StepCategory = 'content' | 'governance' | 'other';

interface StepKindCount {
    kind: string;
    count: number;
    category: StepCategory;
}

interface ContentRatioMetric {
    lookback_days: number;
    total_active_steps: number;
    classified_steps: number;
    content_steps: number;
    governance_steps: number;
    other_steps: number;
    content_share: number | null;
    governance_share: number | null;
    content_to_governance_ratio: number | null;
    meets_target: boolean | null;
    by_kind: StepKindCount[];
}

function classifyStepKind(kind: string): StepCategory {
    if (CONTENT_STEP_KINDS.has(kind)) return 'content';
    if (GOVERNANCE_STEP_KINDS.has(kind)) return 'governance';
    return 'other';
}

async function getRecentContentRatioMetric(): Promise<ContentRatioMetric> {
    const stepCounts = await sql<{ kind: string | null; count: string }[]>`
        SELECT kind, COUNT(*)::text AS count
        FROM ops_mission_steps
        WHERE status <> 'queued'
          AND COALESCE(completed_at, started_at, updated_at, created_at) >= NOW() - INTERVAL '7 days'
        GROUP BY kind
        ORDER BY COUNT(*) DESC, kind ASC
    `;

    const byKind: StepKindCount[] = [];
    let totalActiveSteps = 0;
    let contentSteps = 0;
    let governanceSteps = 0;
    let otherSteps = 0;

    for (const row of stepCounts) {
        const count = parseInt(row.count, 10);
        const kind = row.kind ?? 'unknown';
        const category = classifyStepKind(kind);

        byKind.push({ kind, count, category });
        totalActiveSteps += count;

        if (category === 'content') contentSteps += count;
        else if (category === 'governance') governanceSteps += count;
        else otherSteps += count;
    }

    const classifiedSteps = contentSteps + governanceSteps + otherSteps;
    const contentShare =
        classifiedSteps > 0 ? contentSteps / classifiedSteps : null;
    const governanceShare =
        classifiedSteps > 0 ? governanceSteps / classifiedSteps : null;
    const contentToGovernanceRatio =
        governanceSteps > 0 ? contentSteps / governanceSteps : null;

    return {
        lookback_days: CONTENT_RATIO_LOOKBACK_DAYS,
        total_active_steps: totalActiveSteps,
        classified_steps: classifiedSteps,
        content_steps: contentSteps,
        governance_steps: governanceSteps,
        other_steps: otherSteps,
        content_share: contentShare,
        governance_share: governanceShare,
        content_to_governance_ratio: contentToGovernanceRatio,
        meets_target:
            contentShare === null ? null : contentShare >= 0.7,
        by_kind: byKind,
    };
}

export async function GET(req: NextRequest) {
    return withRequestContext(req, async () => {
        const startTime = Date.now();

        // ── Auth check ──
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        // ── Kill switch check ──
        const systemPolicy = await getPolicy('system_enabled');
        if (!(systemPolicy.enabled as boolean)) {
            return NextResponse.json({
                status: 'disabled',
                message: 'System is disabled via policy',
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: Record<string, any> = {};

        // ── Phase 1: Evaluate triggers ──
        try {
            results.triggers = await evaluateTriggers(4000);
        } catch (err) {
            results.triggers = { error: (err as Error).message };
            log.error('Trigger evaluation failed', { error: err });
        }

        // ── Phase 2: Process reaction queue ──
        try {
            results.reactions = await processReactionQueue(3000);
        } catch (err) {
            results.reactions = { error: (err as Error).message };
            log.error('Reaction processing failed', { error: err });
        }

        // ── Phase 3: Recover stale steps ──
        try {
            results.stale = await recoverStaleSteps();
        } catch (err) {
            results.stale = { error: (err as Error).message };
            log.error('Stale recovery failed', { error: err });
        }

        // ── Phase 4: Check roundtable schedule ──
        try {
            results.roundtable = await checkScheduleAndEnqueue();
        } catch (err) {
            results.roundtable = { error: (err as Error).message };
            log.error('Roundtable schedule check failed', { error: err });
        }

        // ── Phase 5: Learn from outcomes ──
        try {
            results.learning = await learnFromOutcomes();
        } catch (err) {
            results.learning = { error: (err as Error).message };
            log.error('Outcome learning failed', { error: err });
        }

        // ── Phase 6: Queue agent initiatives ──
        try {
            results.initiatives = await checkAndQueueInitiatives();
        } catch (err) {
            results.initiatives = { error: (err as Error).message };
            log.error('Initiative queueing failed', { error: err });
        }

        // ── Phase 7: Expire stale proposals ──
        try {
            const expired = await sql`
                UPDATE ops_mission_proposals
                SET status = 'rejected', updated_at = NOW()
                WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'
                RETURNING id
            `;
            results.expired_proposals = expired.length;
            if (expired.length > 0) {
                log.info('Expired stale proposals', { count: expired.length });
            }
        } catch (err) {
            results.expired_proposals = { error: (err as Error).message };
            log.error('Stale proposal expiry failed', { error: err });
        }

        // ── Phase 8: Artifact freshness check ──
        try {
            results.artifacts = await checkArtifactFreshness();
        } catch (err) {
            results.artifacts = { error: (err as Error).message };
            log.error('Artifact freshness check failed', { error: err });
        }

        // ── Phase 9: Evaluate cron schedules ──
        try {
            results.cron = await evaluateCronSchedules();
        } catch (err) {
            results.cron = { error: (err as Error).message };
            log.error('Cron schedule evaluation failed', { error: err });
        }

        // ── Phase 10: Template health check ──
        try {
            results.templateHealth = await checkTemplateHealth();
        } catch (err) {
            results.templateHealth = { error: (err as Error).message };
            log.error('Template health check failed', { error: err });
        }

        // ── Phase 11: Daily digest (once per day, ~11PM CST / 5AM UTC) ──
        try {
            const nowUtc = new Date();
            const cstHour = (nowUtc.getUTCHours() - 6 + 24) % 24; // UTC → CST offset
            if (cstHour >= 22 || cstHour <= 1) {
                // Window around 11PM CST — generateDailyDigest deduplicates internally
                const digestId = await generateDailyDigest();
                results.digest =
                    digestId ?
                        { generated: true, id: digestId }
                    :   { generated: false, reason: 'already_exists' };
            } else {
                results.digest = { generated: false, reason: 'outside_window' };
            }
        } catch (err) {
            results.digest = { error: (err as Error).message };
            log.error('Daily digest generation failed', { error: err });
        }

        // ── Phase 12: Dream cycles (midnight–6AM CST / 6AM–12PM UTC) ──
        try {
            const nowUtc = new Date();
            const cstHour = (nowUtc.getUTCHours() - 6 + 24) % 24;
            if (cstHour >= 0 && cstHour < 6) {
                // Select 1-2 random agents who haven't dreamed today
                const candidates: string[] = [];
                for (const agentId of AGENT_IDS) {
                    if (agentId === 'primus') continue; // primus doesn't dream
                    const dreamed = await hasAgentDreamedToday(agentId);
                    if (!dreamed) candidates.push(agentId);
                }

                if (candidates.length > 0) {
                    // Pick 1-2 random agents
                    const shuffled = candidates.sort(() => Math.random() - 0.5);
                    const dreamCount = Math.min(
                        1 + Math.floor(Math.random() * 2),
                        shuffled.length,
                    );
                    const dreamers = shuffled.slice(0, dreamCount);

                    const dreamResults = [];
                    const dreamErrors = [];
                    for (const agentId of dreamers) {
                        try {
                            const result = await runDreamCycle(agentId);
                            if (result) {
                                dreamResults.push({
                                    agentId: result.agentId,
                                    dreamType: result.dreamType,
                                    dreamId: result.dreamId,
                                });
                            }
                        } catch (agentErr) {
                            log.error('Dream cycle failed for agent', { 
                                agentId, 
                                error: agentErr 
                            });
                            dreamErrors.push({
                                agentId,
                                error: (agentErr as Error).message,
                            });
                        }
                    }
                    results.dreams = {
                        window: true,
                        candidates: candidates.length,
                        dreamers,
                        completed: dreamResults,
                    };
                    if (dreamErrors.length > 0) {
                        results.dreams.errors = dreamErrors;
                    }
                } else {
                    results.dreams = {
                        window: true,
                        candidates: 0,
                        reason: 'all_agents_dreamed_today',
                    };
                }
            } else {
                results.dreams = {
                    window: false,
                    reason: 'outside_dream_hours',
                };
            }
        } catch (err) {
            results.dreams = { error: (err as Error).message };
            log.error('Dream cycle phase failed', { error: err });
        }

        // ── Phase 13: Rebellion resolution checks ──
        try {
            const rebels = await getRebellingAgents();
            if (rebels.length > 0) {
                const rebellionResults: Array<{
                    agentId: string;
                    resolved: boolean;
                    crossExamQueued?: boolean;
                }> = [];

                for (const rebel of rebels) {
                    const resolved = await attemptRebellionResolution(
                        rebel.agentId,
                    );
                    if (resolved) {
                        rebellionResults.push({
                            agentId: rebel.agentId,
                            resolved: true,
                        });
                    } else {
                        const sessionId = await enqueueRebellionCrossExam(
                            rebel.agentId,
                        );
                        rebellionResults.push({
                            agentId: rebel.agentId,
                            resolved: false,
                            crossExamQueued: sessionId !== null,
                        });
                    }
                }

                results.rebellions = {
                    active: rebels.length,
                    results: rebellionResults,
                };
            } else {
                results.rebellions = { active: 0 };
            }
        } catch (err) {
            results.rebellions = { error: (err as Error).message };
            log.error('Rebellion resolution check failed', { error: err });
        }

        // ── Phase 14: Watercooler drops (waking hours, 15% probability) ──
        try {
            const nowUtc = new Date();
            const cstHour = (nowUtc.getUTCHours() - 6 + 24) % 24;
            if (cstHour >= 8 && cstHour < 22) {
                if (Math.random() < 0.15) {
                    const { runWatercoolerDrop } = await import(
                        '@/lib/discord/watercooler-drop'
                    );
                    const dropped = await runWatercoolerDrop();
                    results.watercooler = dropped
                        ? { posted: true, agent: dropped }
                        : { posted: false, reason: 'skipped_or_deduped' };
                } else {
                    results.watercooler = {
                        posted: false,
                        reason: 'probability_skip',
                    };
                }
            } else {
                results.watercooler = {
                    posted: false,
                    reason: 'outside_waking_hours',
                };
            }
        } catch (err) {
            results.watercooler = { error: (err as Error).message };
            log.error('Watercooler drop failed', { error: err });
        }

        // ── Phase 15: Fetch RSS feeds (every heartbeat) ──
        try {
            const newItems = await fetchAllFeeds();
            results.rss_fetch = { new_items: newItems };
        } catch (err) {
            results.rss_fetch = { error: (err as Error).message };
            log.error('RSS fetch failed', { error: err });
        }

        // ── Phase 16: Generate news digest (2x daily — morning 8-9AM, evening 7-8PM CST) ──
        try {
            const nowUtc = new Date();
            const cstHour = (nowUtc.getUTCHours() - 6 + 24) % 24;
            if (cstHour >= 8 && cstHour < 9) {
                const digestId = await generateNewsDigest('morning');
                results.news_digest = digestId
                    ? { generated: true, slot: 'morning', id: digestId }
                    : { generated: false, reason: 'already_exists_or_insufficient' };
            } else if (cstHour >= 19 && cstHour < 20) {
                const digestId = await generateNewsDigest('evening');
                results.news_digest = digestId
                    ? { generated: true, slot: 'evening', id: digestId }
                    : { generated: false, reason: 'already_exists_or_insufficient' };
            } else {
                results.news_digest = { generated: false, reason: 'outside_window' };
            }
        } catch (err) {
            results.news_digest = { error: (err as Error).message };
            log.error('News digest generation failed', { error: err });
        }

        // ── Phase 17: Daily newspaper (morning ~7-9 AM CST) ──
        try {
            const nowUtc = new Date();
            const cstHour = (nowUtc.getUTCHours() - 6 + 24) % 24;
            if (cstHour >= 7 && cstHour < 9) {
                const editionId = await generateDailyNewspaper();
                results.newspaper = editionId
                    ? { generated: true, id: editionId }
                    : { generated: false, reason: 'already_exists_or_insufficient' };
            } else {
                results.newspaper = { generated: false, reason: 'outside_window' };
            }
        } catch (err) {
            results.newspaper = { error: (err as Error).message };
            log.error('Daily newspaper generation failed', { error: err });
        }

        // ── Phase 18: Weekly newsletter (Monday 8-10AM CST) ──
        try {
            const cstHour = (new Date().getUTCHours() - 6 + 24) % 24;
            const dayOfWeek = new Date().getUTCDay(); // 0=Sun, 1=Mon
            if (dayOfWeek === 1 && cstHour >= 8 && cstHour < 10) {
                const { generateWeeklyNewsletter } = await import('@/lib/ops/newsletter');
                const editionId = await generateWeeklyNewsletter();
                results.newsletter = editionId
                    ? { generated: true, id: editionId }
                    : { generated: false, reason: 'already_exists_or_no_data' };
            } else {
                results.newsletter = { generated: false, reason: 'not_monday_morning' };
            }
        } catch (err) {
            results.newsletter = { error: (err as Error).message };
            log.error('Weekly newsletter generation failed', { error: err });
        }

        // ── Phase 19: Content-vs-governance activity ratio (last 7 days) ──
        try {
            results.content_ratio = await getRecentContentRatioMetric();
        } catch (err) {
            results.content_ratio = { error: (err as Error).message };
            log.error('Content ratio metric failed', { error: err });
        }

        const durationMs = Date.now() - startTime;

        // ── Write audit log + heartbeat event ──
        try {
            await sql`
            INSERT INTO ops_action_runs (action, status, result, duration_ms)
            VALUES ('heartbeat', 'succeeded', ${jsonb(results)}, ${durationMs})
        `;
            await sql`
            INSERT INTO ops_agent_events (agent_id, kind, title, summary, tags, metadata)
            VALUES (
                'system',
                'heartbeat',
                'System heartbeat',
                ${`${durationMs}ms — ${results.triggers?.evaluated ?? 0} triggers, ${results.roundtable?.enqueued ? '1 enqueued' : 'idle'}`},
                ${sql.array(['heartbeat', 'system'])},
                ${jsonb({ duration_ms: durationMs, ...results })}
            )
        `;
        } catch (err) {
            log.error('Failed to write audit log', { error: err });
        }

        return NextResponse.json({
            status: 'ok',
            duration_ms: durationMs,
            ...results,
        });
    }); // withRequestContext
}
