// Proposal service — create, approve, and manage proposals
import { sql, jsonb } from '@/lib/db';
import type { ProposalInput, Proposal } from '../types';
import { getPolicy } from './policy';
import { checkCapGates } from './cap-gates';
import { emitEvent, emitEventAndCheckReactions } from './events';
import { upsertProposalReviewPacket } from './review-packets';
import { DAILY_PROPOSAL_LIMIT } from '../agents';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'proposal-service' });

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === '23505'
    );
}

async function findReplayProposal(input: ProposalInput): Promise<{
    id: string;
    mission_id: string | null;
} | null> {
    if (!input.source_trace_id) return null;

    const [existing] = await sql<[{ id: string; mission_id: string | null }]>`
        SELECT p.id, m.id AS mission_id
        FROM ops_mission_proposals p
        LEFT JOIN ops_missions m ON m.proposal_id = p.id
        WHERE p.source = ${input.source ?? 'agent'}
          AND p.source_trace_id = ${input.source_trace_id}
          AND p.title = ${input.title}
        ORDER BY p.created_at ASC
        LIMIT 1
    `;

    return existing ?? null;
}

function replayResult(
    existing: { id: string; mission_id: string | null },
    input: ProposalInput,
) {
    log.info('Proposal replay ignored by source_trace_id', {
        proposalId: existing.id,
        missionId: existing.mission_id,
        source: input.source ?? 'agent',
        sourceTraceId: input.source_trace_id,
    });

    return {
        success: true,
        proposalId: existing.id,
        missionId: existing.mission_id ?? undefined,
        replayed: true,
    };
}

export async function createProposalAndMaybeAutoApprove(
    input: ProposalInput,
): Promise<{
    success: boolean;
    proposalId?: string;
    missionId?: string;
    replayed?: boolean;
    reason?: string;
}> {
    // Stable idempotency: callers that can identify their source work item
    // should pass source_trace_id. If the same source is replayed (worker
    // restart/backfill/retry), return the existing proposal/mission instead of
    // creating duplicate accepted work. Match title too so agent sessions can
    // still create multiple distinct proposals under the existing per-session cap.
    if (input.source_trace_id) {
        const existing = await findReplayProposal(input);
        if (existing) {
            return replayResult(existing, input);
        }

        const [{ count: sessionCount }] = await sql<[{ count: number }]>`
            SELECT COUNT(*)::int as count FROM ops_mission_proposals
            WHERE source_trace_id = ${input.source_trace_id}
        `;
        if (sessionCount >= 2) {
            return {
                success: false,
                reason: 'Per-session proposal limit (2) reached. Consolidate ideas into fewer proposals with multiple steps.',
            };
        }
    }

    // Daily proposal limit check
    const todayCount = await countTodayProposals(input.agent_id);
    if (todayCount >= DAILY_PROPOSAL_LIMIT) {
        return {
            success: false,
            reason: `Daily proposal limit (${DAILY_PROPOSAL_LIMIT}) reached for ${input.agent_id}`,
        };
    }

    // Cap gates check
    const gateResult = await checkCapGates(input);
    if (!gateResult.ok) {
        return { success: false, reason: gateResult.reason };
    }

    // Insert proposal. A DB-level replay key protects against concurrent worker
    // retries that all pass the optimistic preflight SELECT above.
    let proposal: { id: string };
    try {
        [proposal] = await sql<[{ id: string }]>`
            INSERT INTO ops_mission_proposals (agent_id, title, description, proposed_steps, source, source_trace_id, status)
            VALUES (
                ${input.agent_id},
                ${input.title},
                ${input.description ?? null},
                ${jsonb(input.proposed_steps)},
                ${input.source ?? 'agent'},
                ${input.source_trace_id ?? null},
                'pending'
            )
            RETURNING id
        `;
    } catch (error) {
        if (input.source_trace_id && isUniqueViolation(error)) {
            const existing = await findReplayProposal(input);
            if (existing) {
                return replayResult(existing, input);
            }
        }

        throw error;
    }

    const proposalId = proposal.id;

    // Check veto policy: block auto-approval for protected step kinds
    const vetoPolicy = await getPolicy('veto_authority');
    if (vetoPolicy.enabled) {
        const protectedKinds =
            (vetoPolicy.protected_step_kinds as string[]) ?? [];
        const hasProtectedStep = input.proposed_steps.some(s =>
            protectedKinds.includes(s.kind),
        );
        if (hasProtectedStep) {
            await upsertProposalReviewPacket({
                proposalId,
                proposal: input,
                status: 'awaiting_review',
                reason: 'Contains protected step kind(s). Requires manual approval.',
                decision: {
                    outcome: 'held_for_review',
                    protectedKinds: input.proposed_steps
                        .filter(s => protectedKinds.includes(s.kind))
                        .map(s => s.kind),
                    decidedBy: 'veto_authority_policy',
                },
            });

            await emitEvent({
                agent_id: input.agent_id,
                kind: 'proposal_held_for_review',
                title: `Held for review: ${input.title}`,
                summary: `Contains protected step kind(s). Requires manual approval.`,
                tags: ['proposal', 'held', 'veto_gate'],
                metadata: {
                    proposalId,
                    protectedKinds: input.proposed_steps
                        .filter(s => protectedKinds.includes(s.kind))
                        .map(s => s.kind),
                },
            });
            return { success: true, proposalId };
        }
    }

    // Check auto-approve
    const autoApprovePolicy = await getPolicy('auto_approve');
    const autoApproveEnabled = autoApprovePolicy.enabled as boolean;
    const allowedKinds =
        (autoApprovePolicy.allowed_step_kinds as string[]) ?? [];

    // Deliberated sources (roundtable conversations, system pipelines) get lower friction:
    // auto-approve as long as auto_approve is enabled, even if step kinds aren't
    // in the explicit allowlist. This ensures roundtable decisions and content
    // revision loops translate to action without extra gates.
    const TRUSTED_SOURCES = new Set(['conversation', 'system']);
    const isTrustedSource = TRUSTED_SOURCES.has(input.source ?? 'agent');

    const shouldAutoApprove =
        autoApproveEnabled &&
        (isTrustedSource ||
            input.proposed_steps.every(step =>
                allowedKinds.includes(step.kind),
            ));

    if (shouldAutoApprove) {
        await upsertProposalReviewPacket({
            proposalId,
            proposal: input,
            status: 'approved',
            reason: `Proposal auto-approved with ${input.proposed_steps.length} step(s)`,
            decision: {
                outcome: 'approved',
                autoApproved: true,
                decidedBy: 'auto_approve_policy',
                trustedSource: isTrustedSource,
            },
        });

        await sql`
            UPDATE ops_mission_proposals
            SET status = 'accepted', auto_approved = true, updated_at = NOW()
            WHERE id = ${proposalId}
        `;

        const missionId = await createMissionFromProposal(proposalId);

        await emitEventAndCheckReactions({
            agent_id: input.agent_id,
            kind: 'proposal_auto_approved',
            title: `Auto-approved: ${input.title}`,
            summary: `Proposal auto-approved with ${input.proposed_steps.length} step(s)`,
            tags: ['proposal', 'auto_approved'],
            metadata: { proposalId, missionId },
        });

        return { success: true, proposalId, missionId };
    }

    await upsertProposalReviewPacket({
        proposalId,
        proposal: input,
        status: 'submitted',
        reason: `Awaiting review. ${input.proposed_steps.length} step(s).`,
    });

    await emitEvent({
        agent_id: input.agent_id,
        kind: 'proposal_created',
        title: `Proposal: ${input.title}`,
        summary: `Awaiting review. ${input.proposed_steps.length} step(s).`,
        tags: ['proposal', 'pending'],
        metadata: { proposalId },
    });

    return { success: true, proposalId };
}

export async function createMissionFromProposal(
    proposalId: string,
): Promise<string> {
    const [proposal] = await sql<[Proposal]>`
        SELECT * FROM ops_mission_proposals WHERE id = ${proposalId}
    `;

    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    const [mission] = await sql<[{ id: string; created: boolean }]>`
        INSERT INTO ops_missions (proposal_id, title, description, status, created_by)
        VALUES (
            ${proposalId},
            ${proposal.title},
            ${proposal.description ?? null},
            'approved',
            ${proposal.agent_id}
        )
        ON CONFLICT (proposal_id) WHERE proposal_id IS NOT NULL DO UPDATE
            SET proposal_id = EXCLUDED.proposal_id
        RETURNING id, (xmax = 0) AS created
    `;

    const missionId = mission.id;

    if (!mission.created) {
        return missionId;
    }

    const steps = proposal.proposed_steps;
    let stepCount = 0;

    for (const step of steps) {
        await sql`
            INSERT INTO ops_mission_steps (mission_id, kind, status, payload, assigned_agent, output_path)
            VALUES (
                ${missionId},
                ${step.kind},
                'queued',
                ${jsonb(step.payload ?? {})},
                ${step.assigned_agent ?? null},
                ${step.output_path ?? null}
            )
        `;
        stepCount++;
    }

    if (stepCount === 0) {
        log.warn('Mission created with no steps — marking as failed', {
            missionId,
            proposalId,
        });
        await sql`
            UPDATE ops_missions
            SET status = 'failed', failure_reason = 'No steps created (empty proposal)'
            WHERE id = ${missionId}
        `;
    }

    return missionId;
}

export async function countTodayProposals(agentId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [{ count }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_mission_proposals
        WHERE agent_id = ${agentId}
        AND created_at >= ${todayStart.toISOString()}
    `;

    return count;
}
