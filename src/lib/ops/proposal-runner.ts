// Proposal runner — execute accepted proposal steps with per-step approval checks.

import { createHash } from 'crypto';
import type { Proposal, ProposedStep } from '../types';

export interface ProposalRuntimeContext {
    missionId?: string;
    stepId?: string;
    workerId?: string;
    checkedAt?: string;
    approvalExpiresAt?: string | null;
    [key: string]: unknown;
}

export type ProposalStepExecutor = (
    step: ProposedStep,
    runtimeContext: ProposalRuntimeContext,
) => Promise<void>;

export type ExecutableAuthorityDecision =
    | {
          outcome: 'ALLOW';
          reason: 'proposal_step_covered_by_active_approval';
          proposalId: string;
          stepHash: string;
      }
    | {
          outcome: 'DENY';
          reason:
              | 'proposal_not_accepted'
              | 'checked_at_required_for_expiring_approval'
              | 'checked_at_invalid'
              | 'approval_expiry_invalid'
              | 'approval_expired'
              | 'actor_not_assigned_agent'
              | 'step_not_covered_by_approval';
          message: string;
          proposalId: string;
          stepHash: string;
      };

export function stableJson(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;

    const entries = Object.entries(value as Record<string, unknown>).sort(
        ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
        .map(
            ([key, entryValue]) =>
                `${JSON.stringify(key)}:${stableJson(entryValue)}`,
        )
        .join(',')}}`;
}

export function hashStep(step: ProposedStep): string {
    return createHash('sha256')
        .update(
            stableJson({
                kind: step.kind,
                payload: step.payload ?? {},
                assigned_agent: step.assigned_agent ?? null,
                output_path: step.output_path ?? null,
            }),
        )
        .digest('hex');
}

function sameStep(left: ProposedStep, right: ProposedStep): boolean {
    return (
        left.kind === right.kind &&
        stableJson(left.payload ?? {}) === stableJson(right.payload ?? {}) &&
        (left.assigned_agent ?? null) === (right.assigned_agent ?? null) &&
        (left.output_path ?? null) === (right.output_path ?? null)
    );
}

export function resolveExecutableAuthority(
    proposal: Proposal,
    step: ProposedStep,
    actor: string,
    runtimeContext: ProposalRuntimeContext,
): ExecutableAuthorityDecision {
    const stepHash = hashStep(step);

    if (proposal.status !== 'accepted') {
        return {
            outcome: 'DENY',
            reason: 'proposal_not_accepted',
            message: `Proposal ${proposal.id} is not currently accepted; ${actor} cannot execute ${step.kind}`,
            proposalId: proposal.id,
            stepHash,
        };
    }

    if (runtimeContext.approvalExpiresAt) {
        if (!runtimeContext.checkedAt) {
            return {
                outcome: 'DENY',
                reason: 'checked_at_required_for_expiring_approval',
                message: `Approval for proposal ${proposal.id} has an expiry but no deterministic checkedAt time was supplied before step ${step.kind}`,
                proposalId: proposal.id,
                stepHash,
            };
        }

        const checkedAtTime = Date.parse(runtimeContext.checkedAt);
        if (Number.isNaN(checkedAtTime)) {
            return {
                outcome: 'DENY',
                reason: 'checked_at_invalid',
                message: `Approval check time for proposal ${proposal.id} is invalid before step ${step.kind}`,
                proposalId: proposal.id,
                stepHash,
            };
        }

        const approvalExpiresAtTime = Date.parse(runtimeContext.approvalExpiresAt);
        if (Number.isNaN(approvalExpiresAtTime)) {
            return {
                outcome: 'DENY',
                reason: 'approval_expiry_invalid',
                message: `Approval expiry for proposal ${proposal.id} is invalid before step ${step.kind}`,
                proposalId: proposal.id,
                stepHash,
            };
        }

        if (approvalExpiresAtTime <= checkedAtTime) {
            return {
                outcome: 'DENY',
                reason: 'approval_expired',
                message: `Approval for proposal ${proposal.id} expired before step ${step.kind}`,
                proposalId: proposal.id,
                stepHash,
            };
        }
    }

    if (
        !proposal.proposed_steps.some(proposedStep =>
            sameStep(proposedStep, step),
        )
    ) {
        return {
            outcome: 'DENY',
            reason: 'step_not_covered_by_approval',
            message: `Step ${step.kind} is not covered by current approval for proposal ${proposal.id}`,
            proposalId: proposal.id,
            stepHash,
        };
    }

    if (step.assigned_agent && step.assigned_agent !== actor) {
        return {
            outcome: 'DENY',
            reason: 'actor_not_assigned_agent',
            message: `Step ${step.kind} is assigned to ${step.assigned_agent}; ${actor} cannot execute it for proposal ${proposal.id}`,
            proposalId: proposal.id,
            stepHash,
        };
    }

    return {
        outcome: 'ALLOW',
        reason: 'proposal_step_covered_by_active_approval',
        proposalId: proposal.id,
        stepHash,
    };
}

export async function assertApprovalStillValid(
    proposal: Proposal,
    step: ProposedStep,
    actor: string,
    runtimeContext: ProposalRuntimeContext,
): Promise<void> {
    const decision = resolveExecutableAuthority(
        proposal,
        step,
        actor,
        runtimeContext,
    );
    if (decision.outcome === 'DENY') {
        throw new Error(decision.message);
    }
}

export async function runApprovedProposal(
    proposal: Proposal,
    steps: ProposedStep[],
    actor: string,
    runtimeContext: ProposalRuntimeContext,
    executeStep: ProposalStepExecutor,
): Promise<void> {
    for (const step of steps) {
        await assertApprovalStillValid(proposal, step, actor, runtimeContext);
        await executeStep(step, runtimeContext);
    }
}
