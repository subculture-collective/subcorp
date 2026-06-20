// Cap gates — rate limiters and safety checks for proposals
import { sql } from '@/lib/db';
import type { ProposalInput, GateResult } from '../types';
import { getPolicy } from './policy';

const MAX_CONCURRENT_MISSIONS = 50;
const MAX_DAILY_STEPS_PER_AGENT = 200;
const ACTIVE_MISSION_STALE_HOURS = 24;

const ACTIVE_MISSION_STATUSES = ['approved', 'running'];
const ACTIVE_STEP_STATUSES = ['queued', 'running'];

function positiveNumberOrDefault(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getMissionCapPolicy(): Promise<{
    maxConcurrentMissions: number;
    maxDailyStepsPerAgent: number;
    activeMissionStaleHours: number;
}> {
    try {
        const policy = await getPolicy('mission_caps');
        return {
            maxConcurrentMissions:
                positiveNumberOrDefault(
                    policy?.max_concurrent_missions ?? process.env.MISSION_CAP_MAX_CONCURRENT,
                    MAX_CONCURRENT_MISSIONS,
                ),
            maxDailyStepsPerAgent:
                positiveNumberOrDefault(
                    policy?.max_daily_steps_per_agent ?? process.env.MISSION_CAP_MAX_DAILY_STEPS_PER_AGENT,
                    MAX_DAILY_STEPS_PER_AGENT,
                ),
            activeMissionStaleHours:
                positiveNumberOrDefault(
                    policy?.active_mission_stale_hours ?? process.env.MISSION_CAP_ACTIVE_STALE_HOURS,
                    ACTIVE_MISSION_STALE_HOURS,
                ),
        };
    } catch {
        return {
            maxConcurrentMissions: positiveNumberOrDefault(
                process.env.MISSION_CAP_MAX_CONCURRENT,
                MAX_CONCURRENT_MISSIONS,
            ),
            maxDailyStepsPerAgent: positiveNumberOrDefault(
                process.env.MISSION_CAP_MAX_DAILY_STEPS_PER_AGENT,
                MAX_DAILY_STEPS_PER_AGENT,
            ),
            activeMissionStaleHours: positiveNumberOrDefault(
                process.env.MISSION_CAP_ACTIVE_STALE_HOURS,
                ACTIVE_MISSION_STALE_HOURS,
            ),
        };
    }
}

export async function checkCapGates(input: ProposalInput): Promise<GateResult> {
    const missionCapPolicy = await getMissionCapPolicy();

    // Gate 1: Active mission count
    const [{ count: activeMissions }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_missions
        WHERE status = ANY(${ACTIVE_MISSION_STATUSES})
          AND (
            EXISTS (
                SELECT 1 FROM ops_mission_steps s
                WHERE s.mission_id = ops_missions.id
                  AND s.status = ANY(${ACTIVE_STEP_STATUSES})
            )
            OR updated_at >= NOW() - (${missionCapPolicy.activeMissionStaleHours} * INTERVAL '1 hour')
          )
    `;

    if (activeMissions >= missionCapPolicy.maxConcurrentMissions) {
        return {
            ok: false,
            reason: `Too many active missions (${activeMissions}/${missionCapPolicy.maxConcurrentMissions}; statuses=${ACTIVE_MISSION_STATUSES.join(',')}; active_steps=${ACTIVE_STEP_STATUSES.join(',')}; stale_window_hours=${missionCapPolicy.activeMissionStaleHours})`,
        };
    }

    // Gate 2: Daily step count per agent
    const dailySteps = await countTodaySteps(input.agent_id);

    if (dailySteps >= missionCapPolicy.maxDailyStepsPerAgent) {
        return {
            ok: false,
            reason: `Daily step limit reached for ${input.agent_id} (${dailySteps}/${missionCapPolicy.maxDailyStepsPerAgent}; counts all attempted steps created today)`,
        };
    }

    // Gate 3: Content draft cap (policy-driven)
    try {
        const contentPolicy = await getPolicy('content_caps');
        const maxDrafts = (contentPolicy?.max_drafts_per_day as number) ?? 10;

        const draftKinds = ['draft_thread', 'draft_essay', 'prepare_statement'];
        const hasDraftStep = input.proposed_steps.some(s =>
            draftKinds.includes(s.kind),
        );

        if (hasDraftStep) {
            const todayStart = new Date();
            todayStart.setUTCHours(0, 0, 0, 0);

            const [{ count: todayDrafts }] = await sql<[{ count: number }]>`
                SELECT COUNT(*)::int as count FROM ops_mission_steps s
                JOIN ops_missions m ON s.mission_id = m.id
                WHERE m.created_by = ${input.agent_id}
                AND s.kind = ANY(${draftKinds})
                AND s.created_at >= ${todayStart.toISOString()}
            `;

            if (todayDrafts >= maxDrafts) {
                return {
                    ok: false,
                    reason: `Daily content draft limit reached (${todayDrafts}/${maxDrafts})`,
                };
            }
        }
    } catch {
        // content_caps policy may not exist; skip this gate
    }

    return { ok: true };
}

export async function countTodaySteps(agentId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_mission_steps s
        JOIN ops_missions m ON s.mission_id = m.id
        WHERE m.created_by = ${agentId}
        AND s.created_at >= ${todayStart.toISOString()}
    `;

    return count;
}
