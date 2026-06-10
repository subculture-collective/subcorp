import { sql, jsonb } from '@/lib/db';
import type { ProposalInput } from '../types';

export type ReviewPacketStatus =
    | 'submitted'
    | 'awaiting_review'
    | 'approved'
    | 'rejected'
    | 'blocked'
    | 'archived';

export interface ProposalReviewPacketInput {
    proposalId: string;
    proposal: ProposalInput;
    status: ReviewPacketStatus;
    reason: string;
    decision?: Record<string, unknown>;
}

export interface ReviewPacketEvidence {
    kind: string;
    source: string;
    summary: string;
    data?: Record<string, unknown>;
}

export interface ReviewPacketLineage {
    version: number;
    subject: {
        type: string;
        id: string;
    };
    source: Record<string, unknown> | null;
    parentArtifactIds: string[];
    emittedBy: string;
}

export interface ReviewPacketInput {
    subjectType: string;
    /** UUID of the reviewed subject. Matches ops_review_packets.subject_id. */
    subjectId: string;
    /** Stable public/internal artifact handle for replay, audit, and lineage. */
    artifactId?: string;
    status: ReviewPacketStatus;
    requestedBy: string;
    title: string;
    summary: string;
    previousStatus?: string | null;
    requestedStatus?: string | null;
    evidence?: ReviewPacketEvidence[];
    lineage?: Partial<ReviewPacketLineage>;
    transitionRulesVersion?: number;
    packet: Record<string, unknown>;
    decision?: Record<string, unknown>;
}

interface ReviewPacketDiff {
    from: string | null;
    to: string;
    changed: boolean;
}

const REVIEW_PACKET_SCHEMA_VERSION = 1;
const DEFAULT_TRANSITION_RULES_VERSION = 1;

function createReviewPacketArtifactId(
    subjectType: string,
    subjectId: string,
): string {
    return `review-packet:${subjectType}:${subjectId}`;
}

function valueAsString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function valueAsRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function deriveReviewDiff(
    status: ReviewPacketStatus,
    packet: Record<string, unknown>,
    previousStatus?: string | null,
    requestedStatus?: string | null,
): ReviewPacketDiff {
    const from =
        previousStatus ??
        valueAsString(packet.previous_status) ??
        valueAsString(packet.previousStatus);
    const to =
        requestedStatus ??
        valueAsString(packet.requested_status) ??
        valueAsString(packet.requestedStatus) ??
        status;

    return {
        from,
        to,
        changed: from !== to,
    };
}

function deriveReviewPolicy(
    subjectType: string,
    status: ReviewPacketStatus,
    diff: ReviewPacketDiff,
    transitionRulesVersion: number,
) {
    const terminalDecision = status === 'approved' || status === 'rejected';
    const requiresReviewEvidence =
        terminalDecision || status === 'blocked' || status === 'awaiting_review';

    return {
        version: REVIEW_PACKET_SCHEMA_VERSION,
        derived_from: 'status_diff',
        subject_type: subjectType,
        status,
        diff,
        transition_rules_version: transitionRulesVersion,
        required_evidence: requiresReviewEvidence
            ? ['decision_basis', 'reviewer_or_policy_trace']
            : ['submission_trace'],
        risk: terminalDecision ? 'state_mutation' : 'intake',
    };
}

function deriveTransitionRules(
    subjectType: string,
    status: ReviewPacketStatus,
    diff: ReviewPacketDiff,
    transitionRulesVersion: number,
) {
    return [
        {
            version: transitionRulesVersion,
            rule_id: `${subjectType}:${diff.from ?? 'none'}->${diff.to}`,
            subject_type: subjectType,
            from: diff.from,
            to: diff.to,
            review_packet_status: status,
            allowed: true,
            rationale:
                'Persist a versioned transition receipt before mutating the reviewed subject.',
        },
    ];
}

function normalizeEvidence(
    evidence: ReviewPacketEvidence[] | undefined,
    packet: Record<string, unknown>,
    decision?: Record<string, unknown>,
): ReviewPacketEvidence[] {
    const normalized = [...(evidence ?? [])];
    const sourceTraceId = valueAsString(packet.source_trace_id);
    const reviewSessionId = valueAsString(packet.review_session_id);

    if (sourceTraceId) {
        normalized.push({
            kind: 'source_trace',
            source: sourceTraceId,
            summary: 'Packet includes upstream source trace identifier.',
            data: { source_trace_id: sourceTraceId },
        });
    }

    if (reviewSessionId) {
        normalized.push({
            kind: 'review_session',
            source: reviewSessionId,
            summary: 'Packet includes reviewer session evidence.',
            data: { review_session_id: reviewSessionId },
        });
    }

    if (decision) {
        normalized.push({
            kind: 'decision',
            source: valueAsString(decision.decidedBy) ?? 'unknown',
            summary: `Decision outcome: ${valueAsString(decision.outcome) ?? 'recorded'}`,
            data: decision,
        });
    }

    return normalized;
}

function deriveLineage(
    subjectType: string,
    subjectId: string,
    requestedBy: string,
    packet: Record<string, unknown>,
    lineage?: Partial<ReviewPacketLineage>,
): ReviewPacketLineage {
    const source =
        valueAsRecord(packet.source) ??
        {
            source_trace_id: valueAsString(packet.source_trace_id),
            review_session_id: valueAsString(packet.review_session_id),
            updated_by: valueAsString(packet.updated_by),
        };

    return {
        version: REVIEW_PACKET_SCHEMA_VERSION,
        subject: lineage?.subject ?? { type: subjectType, id: subjectId },
        source: lineage?.source ?? source,
        parentArtifactIds: lineage?.parentArtifactIds ?? [],
        emittedBy: lineage?.emittedBy ?? requestedBy,
    };
}

function buildReviewPacket(input: ReviewPacketInput): Record<string, unknown> {
    const {
        subjectType,
        subjectId,
        artifactId,
        status,
        requestedBy,
        previousStatus,
        requestedStatus,
        evidence,
        lineage,
        transitionRulesVersion = DEFAULT_TRANSITION_RULES_VERSION,
        packet,
        decision,
    } = input;
    const resolvedArtifactId =
        artifactId ?? createReviewPacketArtifactId(subjectType, subjectId);
    const diff = deriveReviewDiff(status, packet, previousStatus, requestedStatus);

    return {
        ...packet,
        artifactId: resolvedArtifactId,
        artifact_id: resolvedArtifactId,
        schema_version: REVIEW_PACKET_SCHEMA_VERSION,
        diff,
        reviewPolicy: deriveReviewPolicy(
            subjectType,
            status,
            diff,
            transitionRulesVersion,
        ),
        reviewEvidence: normalizeEvidence(evidence, packet, decision),
        lineage: deriveLineage(subjectType, subjectId, requestedBy, packet, lineage),
        transitionRules: deriveTransitionRules(
            subjectType,
            status,
            diff,
            transitionRulesVersion,
        ),
    };
}

/**
 * Create or update a durable review packet for any review-gated subject.
 *
 * This is the write gate for review state transitions: callers should persist
 * the packet before mutating the subject status so every approval/rejection has
 * a replayable record behind it instead of relying on ephemeral event handling.
 */
export async function createOrUpdateReviewPacket(
    input: ReviewPacketInput,
    db: typeof sql = sql,
): Promise<string> {
    const {
        subjectType,
        subjectId,
        artifactId,
        status,
        requestedBy,
        title,
        summary,
        decision,
        transitionRulesVersion = DEFAULT_TRANSITION_RULES_VERSION,
    } = input;
    const resolvedArtifactId =
        artifactId ?? createReviewPacketArtifactId(subjectType, subjectId);
    const enrichedPacket = buildReviewPacket(input);

    const [row] = await db<[{ id: string }]>`
        INSERT INTO ops_review_packets (
            artifact_id,
            subject_type,
            subject_id,
            status,
            requested_by,
            title,
            summary,
            transition_rules_version,
            packet,
            decision,
            decided_at
        ) VALUES (
            ${resolvedArtifactId},
            ${subjectType},
            ${subjectId},
            ${status},
            ${requestedBy},
            ${title},
            ${summary},
            ${transitionRulesVersion},
            ${jsonb(enrichedPacket)},
            ${decision ? jsonb(decision) : null},
            ${decision ? db`NOW()` : null}
        )
        ON CONFLICT (subject_type, subject_id) DO UPDATE SET
            artifact_id = EXCLUDED.artifact_id,
            status = EXCLUDED.status,
            requested_by = EXCLUDED.requested_by,
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            transition_rules_version = EXCLUDED.transition_rules_version,
            packet = EXCLUDED.packet,
            decision = EXCLUDED.decision,
            decided_at = EXCLUDED.decided_at,
            updated_at = NOW()
        RETURNING id
    `;

    return row.id;
}

/**
 * Create or update the durable review packet for a mission proposal.
 *
 * Call this before emitting review notifications or recording approval state so
 * every outward signal has a persisted packet behind it for replay/repair.
 */
export async function upsertProposalReviewPacket({
    proposalId,
    proposal,
    status,
    reason,
    decision,
}: ProposalReviewPacketInput): Promise<string> {
    const packet = {
        proposalId,
        agent_id: proposal.agent_id,
        title: proposal.title,
        description: proposal.description ?? null,
        proposed_steps: proposal.proposed_steps,
        source: proposal.source ?? 'agent',
        source_trace_id: proposal.source_trace_id ?? null,
        reason,
        updated_by: 'proposal-service',
    };

    return createOrUpdateReviewPacket({
        subjectType: 'mission_proposal',
        subjectId: proposalId,
        status,
        requestedBy: proposal.agent_id,
        title: proposal.title,
        summary: reason,
        previousStatus: 'pending',
        requestedStatus: status,
        packet,
        decision,
    });
}
