// Proposal service — create proposals, record approval evaluations, and manage
// proposal-derived missions.
import { sql, jsonb } from '@/lib/db';
import { createHash } from 'crypto';
import { z } from 'zod';
import type { ProposalInput, Proposal } from '../types';
import {
    getPolicyRecord,
    policyHash,
    policyVersion,
    type PolicyRecord,
} from './policy';
import { hashStep, stableJson } from './proposal-runner';
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

const approvalEvaluationOutcomeSchema = z.enum([
    'approved',
    'held_for_review',
    'pending_review',
]);

type ApprovalEvaluationOutcome = z.infer<typeof approvalEvaluationOutcomeSchema>;

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

const approvalRiskClassSchema = z.enum(['low', 'medium', 'high']);

type ApprovalRiskClass = z.infer<typeof approvalRiskClassSchema>;

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

const recordSchema = z.record(z.string(), z.unknown());

const stepApprovalDecisionSchema = z
    .object({
        stepHash: z.string().min(1),
        stepKind: z.string().min(1),
        outcome: approvalEvaluationOutcomeSchema,
        riskClass: approvalRiskClassSchema,
        matchedRule: z.string().min(1),
        reason: z.string().min(1),
        policyVersion: z.string().min(1),
        policyHash: z.string().min(1),
    })
    .strict();

type ApprovalEvaluationRecord = {
    id: string;
    outcome: ApprovalEvaluationOutcome;
    reason: string;
    trusted_source: boolean;
    step_decisions: Record<string, StepApprovalDecision>;
    decision: Record<string, unknown>;
    created_at: string;
};

const missionExecutionContractSchema = z
    .object({
        schemaVersion: z.literal(1),
        sealed: z.literal(true),
        proposalId: z.string().min(1),
        proposalRevision: z.string().min(1),
        proposalHash: z.string().min(1),
        approvalEvaluationId: z.string().min(1),
        approvedAt: z.string().datetime({ offset: true }),
        expiresAt: z.string().datetime({ offset: true }),
        rationale: z.string().min(1),
        approver: z
            .object({
                type: z.enum(['policy', 'operator', 'agent']),
                id: z.string().min(1),
                metadata: recordSchema,
            })
            .strict(),
        beneficiary: z.string().min(1),
        riskOwner: z.string().min(1),
        approvedSteps: z.array(
            z
                .object({
                    index: z.number().int().nonnegative(),
                    kind: z.string().min(1),
                    stepHash: z.string().min(1),
                    payload: recordSchema,
                    assignedAgent: z.string().min(1).nullable(),
                    outputPath: z.string().min(1).nullable(),
                    acceptanceCriteria: z.array(z.string().min(1)),
                    approvalDecision: stepApprovalDecisionSchema.nullable(),
                })
                .strict(),
        ),
        contractHash: z.string().min(1),
    })
    .strict();

export type MissionExecutionContract = z.infer<
    typeof missionExecutionContractSchema
>;

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
    const [proposal] = await sql<[Proposal]>`
        SELECT * FROM ops_mission_proposals WHERE id = ${proposalId}
    `;
    if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found for approval evaluation`);
    }

    const policyVersions = [
        ...new Set(
            Object.values(evaluation.stepDecisions)
                .map(decision => decision.policyVersion)
                .filter(version => version.trim().length > 0),
        ),
    ];

    const [record] = await sql<[{ id: string }]>`
        INSERT INTO ops_proposal_approval_evaluations (
            proposal_id,
            proposal_revision,
            proposal_hash,
            policy_versions,
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
            ${proposalRevision(proposal)},
            ${sha256(proposalSnapshot(proposal))},
            ${policyVersions.length > 0 ? policyVersions : ['none']},
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

function sha256(value: unknown): string {
    return createHash('sha256').update(stableJson(value)).digest('hex');
}

function proposalRevision(proposal: Proposal): string {
    return `${proposal.id}:${proposal.updated_at}`;
}

function proposalSnapshot(proposal: Proposal): Record<string, unknown> {
    return {
        id: proposal.id,
        agent_id: proposal.agent_id,
        title: proposal.title,
        description: proposal.description ?? null,
        status: proposal.status,
        proposed_steps: proposal.proposed_steps,
        source: proposal.source,
        source_trace_id: proposal.source_trace_id ?? null,
        auto_approved: proposal.auto_approved,
        created_at: proposal.created_at,
        updated_at: proposal.updated_at,
    };
}

function normalizeAcceptanceCriteria(value: unknown, fallback: string): string[] {
    if (Array.isArray(value)) {
        const criteria = value.filter(
            (entry): entry is string =>
                typeof entry === 'string' && entry.trim().length > 0,
        );
        if (criteria.length > 0) return criteria;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        return [value.trim()];
    }

    return [fallback];
}

function stringFromPayload(
    proposal: Proposal,
    key: 'beneficiary' | 'risk_owner' | 'riskOwner',
): string | null {
    for (const step of proposal.proposed_steps) {
        const value = step.payload?.[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

async function latestApprovedEvaluation(
    proposalId: string,
): Promise<ApprovalEvaluationRecord> {
    const [evaluation] = await sql<[ApprovalEvaluationRecord]>`
        SELECT id, outcome, reason, trusted_source, step_decisions, decision, created_at
        FROM ops_proposal_approval_evaluations
        WHERE proposal_id = ${proposalId}
        ORDER BY created_at DESC
        LIMIT 1
    `;

    if (!evaluation) {
        throw new Error(
            `Proposal ${proposalId} has no approval evaluation; refusing to create mission`,
        );
    }

    if (evaluation.outcome !== 'approved') {
        throw new Error(
            `Proposal ${proposalId} latest evaluation is ${evaluation.outcome}; refusing to create mission`,
        );
    }

    return evaluation;
}

function buildExecutionContract(
    proposal: Proposal,
    evaluation: ApprovalEvaluationRecord,
): MissionExecutionContract {
    if (proposal.status !== 'accepted') {
        throw new Error(
            `Proposal ${proposal.id} is ${proposal.status}; only accepted proposals can produce missions`,
        );
    }

    const proposalHash = sha256(proposalSnapshot(proposal));
    const approvedAt = new Date(evaluation.created_at).toISOString();
    const expiresAt = new Date(
        new Date(evaluation.created_at).getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const decidedBy =
        typeof evaluation.decision.decidedBy === 'string' ?
            evaluation.decision.decidedBy
        :   'unknown_approver';

    const unsignedContract = {
        schemaVersion: 1 as const,
        sealed: true as const,
        proposalId: proposal.id,
        proposalRevision: proposalRevision(proposal),
        proposalHash,
        approvalEvaluationId: evaluation.id,
        approvedAt,
        expiresAt,
        rationale: evaluation.reason,
        approver: {
            type: 'policy' as const,
            id: decidedBy,
            metadata: {
                trustedSource: evaluation.trusted_source,
                decision: evaluation.decision,
            },
        },
        beneficiary:
            stringFromPayload(proposal, 'beneficiary') ?? proposal.agent_id,
        riskOwner:
            stringFromPayload(proposal, 'risk_owner') ??
            stringFromPayload(proposal, 'riskOwner') ??
            proposal.agent_id,
        approvedSteps: proposal.proposed_steps.map((step, index) => {
            const stepHash = hashStep(step);
            const payload = step.payload ?? {};
            return {
                index,
                kind: step.kind,
                stepHash,
                payload,
                assignedAgent: step.assigned_agent ?? null,
                outputPath: step.output_path ?? null,
                acceptanceCriteria: normalizeAcceptanceCriteria(
                    payload.acceptance_criteria ?? payload.acceptanceCriteria,
                    `Step ${index + 1} (${step.kind}) completes successfully without violating the approved payload boundary.`,
                ),
                approvalDecision: evaluation.step_decisions[stepHash] ?? null,
            };
        }),
    };

    const contract = {
        ...unsignedContract,
        contractHash: sha256(unsignedContract),
    };

    return validateExecutionContract(contract, proposal);
}

export function validateSealedExecutionContract(
    contract: unknown,
): MissionExecutionContract {
    const parsedContract = missionExecutionContractSchema.parse(contract);
    const unsignedContract = { ...parsedContract } as Omit<
        MissionExecutionContract,
        'contractHash'
    > & { contractHash?: string };
    delete unsignedContract.contractHash;

    const requiredStrings: Array<[string, unknown]> = [
        ['proposalId', parsedContract.proposalId],
        ['proposalRevision', parsedContract.proposalRevision],
        ['proposalHash', parsedContract.proposalHash],
        ['approvalEvaluationId', parsedContract.approvalEvaluationId],
        ['approvedAt', parsedContract.approvedAt],
        ['expiresAt', parsedContract.expiresAt],
        ['rationale', parsedContract.rationale],
        ['approver.id', parsedContract.approver.id],
        ['beneficiary', parsedContract.beneficiary],
        ['riskOwner', parsedContract.riskOwner],
        ['contractHash', parsedContract.contractHash],
    ];

    for (const [field, value] of requiredStrings) {
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`Execution contract missing required field ${field}`);
        }
    }

    if (parsedContract.schemaVersion !== 1 || parsedContract.sealed !== true) {
        throw new Error('Execution contract must be schemaVersion=1 and sealed');
    }

    if (parsedContract.approvedSteps.length === 0) {
        throw new Error('Execution contract must include at least one approved step');
    }

    if (
        Date.parse(parsedContract.expiresAt) <=
        Date.parse(parsedContract.approvedAt)
    ) {
        throw new Error('Execution contract expiry must be after approval time');
    }

    for (const approvedStep of parsedContract.approvedSteps) {
        if (approvedStep.acceptanceCriteria.length === 0) {
            throw new Error(
                `Execution contract step ${approvedStep.index} has no acceptance criteria`,
            );
        }
        if (approvedStep.approvalDecision?.outcome !== 'approved') {
            throw new Error(
                `Execution contract step ${approvedStep.index} is missing an approved decision`,
            );
        }
    }

    if (parsedContract.contractHash !== sha256(unsignedContract)) {
        throw new Error('Execution contract hash is invalid');
    }

    return parsedContract;
}

function validateExecutionContract(
    contract: unknown,
    proposal: Proposal,
): MissionExecutionContract {
    const parsedContract = validateSealedExecutionContract(contract);

    if (parsedContract.proposalId !== proposal.id) {
        throw new Error('Execution contract proposalId does not match proposal');
    }

    if (parsedContract.proposalRevision !== proposalRevision(proposal)) {
        throw new Error('Execution contract proposal revision does not match proposal');
    }

    if (parsedContract.proposalHash !== sha256(proposalSnapshot(proposal))) {
        throw new Error('Execution contract proposal hash does not match proposal');
    }

    if (parsedContract.approvedSteps.length !== proposal.proposed_steps.length) {
        throw new Error('Execution contract approved steps do not match proposal');
    }

    for (const approvedStep of parsedContract.approvedSteps) {
        const proposedStep = proposal.proposed_steps[approvedStep.index];
        if (!proposedStep || approvedStep.stepHash !== hashStep(proposedStep)) {
            throw new Error(
                `Execution contract step ${approvedStep.index} does not match proposal`,
            );
        }
    }

    return parsedContract;
}

export async function createMissionFromProposal(
    proposalId: string,
): Promise<string> {
    const [proposal] = await sql<[Proposal]>`
        SELECT * FROM ops_mission_proposals WHERE id = ${proposalId}
    `;

    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    const approvalEvaluation = await latestApprovedEvaluation(proposalId);
    const executionContract = buildExecutionContract(
        proposal,
        approvalEvaluation,
    );

    const [mission] = await sql<
        [{ id: string; created: boolean; execution_contract: MissionExecutionContract }]
    >`
        INSERT INTO ops_missions (proposal_id, title, description, status, created_by, execution_contract)
        VALUES (
            ${proposalId},
            ${proposal.title},
            ${proposal.description ?? null},
            'approved',
            ${proposal.agent_id},
            ${jsonb(executionContract)}
        )
        ON CONFLICT (proposal_id) WHERE proposal_id IS NOT NULL DO UPDATE
            SET execution_contract = COALESCE(ops_missions.execution_contract, EXCLUDED.execution_contract),
                updated_at = CASE
                    WHEN ops_missions.execution_contract IS NULL THEN NOW()
                    ELSE ops_missions.updated_at
                END
        RETURNING id, (xmax = 0) AS created, execution_contract
    `;

    const missionId = mission.id;

    validateExecutionContract(mission.execution_contract, proposal);

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
