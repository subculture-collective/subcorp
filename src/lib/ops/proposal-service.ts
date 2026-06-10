// Proposal service — create proposals, record approval evaluations, and manage
// proposal-derived missions.
import { sql, jsonb } from '@/lib/db';
import type { ProposalInput, Proposal } from '../types';
import {
    getPolicyRecord,
    policyHash,
    policyVersion,
    type PolicyRecord,
} from './policy';
import { hashStep } from './proposal-runner';
import { checkCapGates } from './cap-gates';
import { emitEvent, emitEventAndCheckReactions } from './events';
import { upsertProposalReviewPacket } from './review-packets';
import { DAILY_PROPOSAL_LIMIT } from '../agents';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'proposal-service' });

type ProposalCreateResult = {
    success: boolean;
    proposalId?: string;
    missionId?: string;
    replayed?: boolean;
    reason?: string;
};

type ApprovalEvaluationOutcome =
    | 'approved'
    | 'held_for_review'
    | 'pending_review';

interface ApprovalEvaluation {
    outcome: ApprovalEvaluationOutcome;
    reason: string;
    autoApproveEnabled: boolean;
    trustedSource: boolean;
    allowedKinds: string[];
    protectedKinds: string[];
    proposedStepKinds: string[];
    blockedStepKinds: string[];
    decidedBy: string;
    stepDecisions: Record<string, StepApprovalDecision>;
}

type ApprovalRiskClass = 'low' | 'medium' | 'high';

interface StepApprovalDecision {
    stepHash: string;
    stepKind: string;
    outcome: ApprovalEvaluationOutcome;
    riskClass: ApprovalRiskClass;
    matchedRule: string;
    reason: string;
    policyVersion: string;
    policyHash: string;
}

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
): Promise<ProposalCreateResult> {
    const created = await createProposal(input);
    if (!created.success || !created.proposalId || created.replayed) {
        return created;
    }

    return evaluateProposalApproval(created.proposalId, input);
}

export async function createProposal(
    input: ProposalInput,
): Promise<ProposalCreateResult> {
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

    await upsertProposalReviewPacket({
        proposalId,
        proposal: input,
        status: 'submitted',
        reason: `Proposal created. Approval evaluation pending. ${input.proposed_steps.length} step(s).`,
    });

    await emitEvent({
        agent_id: input.agent_id,
        kind: 'proposal_created',
        title: `Proposal: ${input.title}`,
        summary: `Proposal created. Approval evaluation pending. ${input.proposed_steps.length} step(s).`,
        tags: ['proposal', 'pending'],
        metadata: { proposalId },
    });

    return { success: true, proposalId };
}

export async function evaluateProposalApproval(
    proposalId: string,
    input: ProposalInput,
): Promise<ProposalCreateResult> {
    const evaluation = await buildApprovalEvaluation(input);
    await recordApprovalEvaluation(proposalId, evaluation);

    if (evaluation.outcome === 'held_for_review') {
        await upsertProposalReviewPacket({
            proposalId,
            proposal: input,
            status: 'awaiting_review',
            reason: evaluation.reason,
            decision: evaluationDecision(evaluation),
        });

        await emitEvent({
            agent_id: input.agent_id,
            kind: 'proposal_held_for_review',
            title: `Held for review: ${input.title}`,
            summary: evaluation.reason,
            tags: ['proposal', 'held', 'veto_gate'],
            metadata: {
                proposalId,
                evaluationOutcome: evaluation.outcome,
                protectedKinds: evaluation.blockedStepKinds,
            },
        });
        return { success: true, proposalId };
    }

    if (evaluation.outcome === 'approved') {
        await upsertProposalReviewPacket({
            proposalId,
            proposal: input,
            status: 'approved',
            reason: evaluation.reason,
            decision: evaluationDecision(evaluation),
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
            summary: evaluation.reason,
            tags: ['proposal', 'auto_approved'],
            metadata: {
                proposalId,
                missionId,
                evaluationOutcome: evaluation.outcome,
            },
        });

        return { success: true, proposalId, missionId };
    }

    await upsertProposalReviewPacket({
        proposalId,
        proposal: input,
        status: 'submitted',
        reason: evaluation.reason,
        decision: evaluationDecision(evaluation),
    });

    return { success: true, proposalId };
}

async function buildApprovalEvaluation(
    input: ProposalInput,
): Promise<ApprovalEvaluation> {
    // Check veto policy: block auto-approval for protected step kinds
    const vetoPolicyRecord = await getPolicyRecord('veto_authority');
    const vetoPolicy = vetoPolicyRecord.value;
    const protectedKinds =
        vetoPolicy.enabled ?
            ((vetoPolicy.protected_step_kinds as string[]) ?? [])
        :   [];
    const proposedStepKinds = input.proposed_steps.map(step => step.kind);
    const blockedStepKinds = proposedStepKinds.filter(kind =>
        protectedKinds.includes(kind),
    );

    const autoApprovePolicyRecord = await getPolicyRecord('auto_approve');
    const autoApprovePolicy = autoApprovePolicyRecord.value;
    const autoApproveEnabled = autoApprovePolicy.enabled as boolean;
    const allowedKinds =
        (autoApprovePolicy.allowed_step_kinds as string[]) ?? [];
    const policyFingerprint = buildApprovalPolicyFingerprint([
        autoApprovePolicyRecord,
        vetoPolicyRecord,
    ]);

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

    const buildStepDecisions = (
        outcome: ApprovalEvaluationOutcome,
    ): Record<string, StepApprovalDecision> =>
        Object.fromEntries(
            input.proposed_steps.map(step => {
                const stepHash = hashStep(step);
                const decision = buildStepApprovalDecision({
                    step,
                    stepHash,
                    outcome,
                    isTrustedSource,
                    autoApproveEnabled,
                    allowedKinds,
                    protectedKinds,
                    policyFingerprint,
                });
                return [stepHash, decision];
            }),
        );

    if (blockedStepKinds.length > 0) {
        return {
            outcome: 'held_for_review',
            reason: 'Contains protected step kind(s). Requires manual approval.',
            autoApproveEnabled,
            trustedSource: isTrustedSource,
            allowedKinds,
            protectedKinds,
            proposedStepKinds,
            blockedStepKinds,
            decidedBy: 'veto_authority_policy',
            stepDecisions: buildStepDecisions('held_for_review'),
        };
    }

    if (shouldAutoApprove) {
        return {
            outcome: 'approved',
            reason: `Proposal auto-approved with ${input.proposed_steps.length} step(s)`,
            autoApproveEnabled,
            trustedSource: isTrustedSource,
            allowedKinds,
            protectedKinds,
            proposedStepKinds,
            blockedStepKinds,
            decidedBy: 'auto_approve_policy',
            stepDecisions: buildStepDecisions('approved'),
        };
    }

    return {
        outcome: 'pending_review',
        reason: `Awaiting review. ${input.proposed_steps.length} step(s).`,
        autoApproveEnabled,
        trustedSource: isTrustedSource,
        allowedKinds,
        protectedKinds,
        proposedStepKinds,
        blockedStepKinds,
        decidedBy: 'auto_approve_policy',
        stepDecisions: buildStepDecisions('pending_review'),
    };
}

function buildApprovalPolicyFingerprint(
    policies: PolicyRecord[],
): { version: string; hash: string } {
    const normalizedPolicies = policies.map(normalizePolicyRecord);
    return {
        version: normalizedPolicies
            .map(policy => `${policy.key}@${policy.version}`)
            .join('|'),
        hash: policyHash({
            key: 'approval_policy_bundle',
            value: Object.fromEntries(
                normalizedPolicies.map(policy => [policy.key, policy.value]),
            ),
            updated_at: normalizedPolicies
                .map(policy => `${policy.key}:${policy.updated_at ?? 'null'}`)
                .join('|'),
        }),
    };
}

function normalizePolicyRecord(policy: Awaited<ReturnType<typeof getPolicyRecord>>) {
    return {
        key: policy.key,
        value: policy.value,
        updated_at: policy.updated_at,
        version: policyVersion(policy),
    };
}

function buildStepApprovalDecision(input: {
    step: ProposalInput['proposed_steps'][number];
    stepHash: string;
    outcome: ApprovalEvaluationOutcome;
    isTrustedSource: boolean;
    autoApproveEnabled: boolean;
    allowedKinds: string[];
    protectedKinds: string[];
    policyFingerprint: { version: string; hash: string };
}): StepApprovalDecision {
    const {
        step,
        stepHash,
        outcome,
        isTrustedSource,
        autoApproveEnabled,
        allowedKinds,
        protectedKinds,
        policyFingerprint,
    } = input;

    if (protectedKinds.includes(step.kind)) {
        return {
            stepHash,
            stepKind: step.kind,
            outcome: 'held_for_review',
            riskClass: 'high',
            matchedRule: 'veto_authority.protected_step_kind',
            reason: `Step kind ${step.kind} is protected by veto authority policy.`,
            policyVersion: policyFingerprint.version,
            policyHash: policyFingerprint.hash,
        };
    }

    if (!autoApproveEnabled) {
        return {
            stepHash,
            stepKind: step.kind,
            outcome,
            riskClass: 'medium',
            matchedRule: 'auto_approve.disabled',
            reason: 'Auto-approval policy is disabled.',
            policyVersion: policyFingerprint.version,
            policyHash: policyFingerprint.hash,
        };
    }

    if (isTrustedSource) {
        return {
            stepHash,
            stepKind: step.kind,
            outcome,
            riskClass: 'low',
            matchedRule: 'auto_approve.trusted_source',
            reason: 'Trusted source may auto-approve this step under current policy.',
            policyVersion: policyFingerprint.version,
            policyHash: policyFingerprint.hash,
        };
    }

    if (allowedKinds.includes(step.kind)) {
        return {
            stepHash,
            stepKind: step.kind,
            outcome,
            riskClass: 'low',
            matchedRule: 'auto_approve.allowed_step_kind',
            reason: `Step kind ${step.kind} is listed in auto-approve policy.`,
            policyVersion: policyFingerprint.version,
            policyHash: policyFingerprint.hash,
        };
    }

    return {
        stepHash,
        stepKind: step.kind,
        outcome,
        riskClass: 'medium',
        matchedRule: 'auto_approve.step_kind_not_allowed',
        reason: `Step kind ${step.kind} is not listed in auto-approve policy.`,
        policyVersion: policyFingerprint.version,
        policyHash: policyFingerprint.hash,
    };
}

async function recordApprovalEvaluation(
    proposalId: string,
    evaluation: ApprovalEvaluation,
): Promise<string> {
    const [record] = await sql<[{ id: string }]>`
        INSERT INTO ops_proposal_approval_evaluations (
            proposal_id,
            outcome,
            reason,
            auto_approve_enabled,
            trusted_source,
            allowed_step_kinds,
            protected_step_kinds,
            proposed_step_kinds,
            blocked_step_kinds,
            step_decisions,
            decision
        ) VALUES (
            ${proposalId},
            ${evaluation.outcome},
            ${evaluation.reason},
            ${evaluation.autoApproveEnabled},
            ${evaluation.trustedSource},
            ${jsonb(evaluation.allowedKinds)},
            ${jsonb(evaluation.protectedKinds)},
            ${jsonb(evaluation.proposedStepKinds)},
            ${jsonb(evaluation.blockedStepKinds)},
            ${jsonb(evaluation.stepDecisions)},
            ${jsonb(evaluationDecision(evaluation))}
        )
        RETURNING id
    `;

    return record.id;
}

function evaluationDecision(
    evaluation: ApprovalEvaluation,
): Record<string, unknown> {
    return {
        outcome: evaluation.outcome,
        autoApproved: evaluation.outcome === 'approved',
        decidedBy: evaluation.decidedBy,
        trustedSource: evaluation.trustedSource,
        autoApproveEnabled: evaluation.autoApproveEnabled,
        allowedKinds: evaluation.allowedKinds,
        protectedKinds: evaluation.protectedKinds,
        proposedStepKinds: evaluation.proposedStepKinds,
        blockedStepKinds: evaluation.blockedStepKinds,
        stepDecisions: evaluation.stepDecisions,
    };
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
