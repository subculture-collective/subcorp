import { createHash, randomUUID } from 'node:crypto';

const REQUIRED_REVIEW_PACKET_FIELDS = [
    'draftText',
    'channel',
    'audience',
    'requestedDecision',
    'disclosureClass',
] as const;

type RequiredReviewPacketField = (typeof REQUIRED_REVIEW_PACKET_FIELDS)[number];

export interface ContentReviewPacketInput {
    title?: unknown;
    draftText?: unknown;
    channel?: unknown;
    audience?: unknown;
    requestedDecision?: unknown;
    disclosureClass?: unknown;
}

export interface ContentReviewMission {
    kind: 'content_review';
    artifactId: string;
    title: string;
    channel: string;
    audience: string;
    requestedDecision: string;
    disclosureClass: string;
}

export type ContentReviewGateResult =
    | {
          accepted: false;
          missingFields: RequiredReviewPacketField[];
          artifactId: null;
          bodyChecksum: null;
          reviewMission: null;
      }
    | {
          accepted: true;
          missingFields: [];
          artifactId: string;
          bodyChecksum: string;
          reviewMission: ContentReviewMission;
      };

function requiredString(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function checksumBody(body: string): string {
    return createHash('sha256').update(body, 'utf8').digest('hex');
}

export function validateContentReviewPacket(
    input: ContentReviewPacketInput,
): ContentReviewGateResult {
    const normalized = {
        title: requiredString(input.title) ?? 'Untitled draft',
        draftText: requiredString(input.draftText),
        channel: requiredString(input.channel),
        audience: requiredString(input.audience),
        requestedDecision: requiredString(input.requestedDecision),
        disclosureClass: requiredString(input.disclosureClass),
    };

    const missingFields = REQUIRED_REVIEW_PACKET_FIELDS.filter(
        field => normalized[field] === null,
    );

    if (missingFields.length > 0) {
        return {
            accepted: false,
            missingFields,
            artifactId: null,
            bodyChecksum: null,
            reviewMission: null,
        };
    }

    const artifactId = `content-review:${randomUUID()}`;
    const bodyChecksum = checksumBody(normalized.draftText as string);

    return {
        accepted: true,
        missingFields: [],
        artifactId,
        bodyChecksum,
        reviewMission: {
            kind: 'content_review',
            artifactId,
            title: normalized.title,
            channel: normalized.channel as string,
            audience: normalized.audience as string,
            requestedDecision: normalized.requestedDecision as string,
            disclosureClass: normalized.disclosureClass as string,
        },
    };
}
