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
    drafturi: string;
    audience: string;
    publicationthesis: string;
    redaction_level: string;
    owner: string;
    artifactHash: string;
    timestamp: string;
    // Forewarning template integration
    forewarningTemplate: string;
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
