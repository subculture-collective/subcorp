// Append-only evidence ledger for mission execution contract step outcomes.
import { sql, jsonb } from '@/lib/db';
import type { MissionExecutionContract } from './proposal-service';

export type ExecutionEvidenceOutcome =
    | 'dispatched'
    | 'succeeded'
    | 'blocked'
    | 'failed'
    | 'skipped';

type ContractStep = MissionExecutionContract['approvedSteps'][number];

export interface ExecutionEvidenceInput {
    missionId: string;
    stepId: string;
    contract: MissionExecutionContract;
    contractStep: ContractStep;
    outcome: ExecutionEvidenceOutcome;
    evidence?: Record<string, unknown>;
    acceptanceResults?: Array<Record<string, unknown>>;
    blockerClass?: string | null;
    artifactPaths?: string[];
    recordedBy?: string | null;
}

function normalizeArtifactPaths(paths: string[] | undefined): string[] {
    return [...new Set((paths ?? []).filter(path => path.trim().length > 0))];
}

function defaultAcceptanceResults(
    criteria: string[],
    outcome: ExecutionEvidenceOutcome,
): Array<Record<string, unknown>> {
    return criteria.map(criterion => ({
        criterion,
        status:
            outcome === 'dispatched' ? 'pending'
            : 'not_verified',
        note:
            outcome === 'succeeded' ?
                'Session succeeded, but acceptance criteria require explicit validator evidence before being marked passed.'
            :   undefined,
    }));
}

export function blockerClassForOutcome(
    outcome: ExecutionEvidenceOutcome,
    reason?: string | null,
): string | null {
    if (outcome === 'succeeded' || outcome === 'dispatched') return null;
    const normalized = (reason ?? '').toLowerCase();
    if (normalized.includes('veto')) return 'veto';
    if (normalized.includes('timed out') || normalized.includes('timeout')) {
        return 'timeout';
    }
    if (normalized.includes('blocked')) return 'agent_blocked';
    if (normalized.includes('contract') || normalized.includes('approval')) {
        return 'approval_boundary';
    }
    if (normalized.includes('tool') || normalized.includes('file') || normalized.includes('bash')) {
        return 'tooling';
    }
    return outcome;
}

export async function recordExecutionEvidence(
    input: ExecutionEvidenceInput,
): Promise<void> {
    const [attempt] = await sql<[{ retry_count: number }]>`
        SELECT COUNT(*)::int AS retry_count
        FROM ops_mission_step_execution_evidence
        WHERE step_id = ${input.stepId}
          AND outcome IN ('dispatched', 'failed', 'blocked')
    `;

    const acceptanceCriteria = input.contractStep.acceptanceCriteria;
    const acceptanceResults =
        input.acceptanceResults ??
        defaultAcceptanceResults(acceptanceCriteria, input.outcome);

    await sql`
        INSERT INTO ops_mission_step_execution_evidence (
            mission_id,
            step_id,
            contract_hash,
            contract_step_index,
            step_hash,
            step_kind,
            outcome,
            acceptance_criteria,
            acceptance_results,
            blocker_class,
            retry_count,
            artifact_paths,
            evidence,
            recorded_by
        ) VALUES (
            ${input.missionId},
            ${input.stepId},
            ${input.contract.contractHash},
            ${input.contractStep.index},
            ${input.contractStep.stepHash},
            ${input.contractStep.kind},
            ${input.outcome},
            ${jsonb(acceptanceCriteria)},
            ${jsonb(acceptanceResults)},
            ${input.blockerClass ?? null},
            ${attempt?.retry_count ?? 0},
            ${normalizeArtifactPaths(input.artifactPaths)},
            ${jsonb(input.evidence ?? {})},
            ${input.recordedBy ?? null}
        )
    `;
}
