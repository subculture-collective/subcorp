import { sql } from '@/lib/db';
import { ReviewPacketInput } from './review-packets';

export interface ValidationCriteria {
    criterion: string;
    weight: number;
    score: number;
    threshold: number;
    result: 'pass' | 'fail' | 'warning';
}

export interface ValidationConfig {
    criteria: ValidationCriteria[];
    totalThreshold: number;
}

export const defaultValidationConfig: ValidationConfig = {
    criteria: [
        {
            criterion: 'complete_draft_body',
            weight: 0.2,
            score: 0,
            threshold: 0.5,
            result: 'fail'
        },
        {
            criterion: 'artifact_path_provided',
            weight: 0.2,
            score: 0,
            threshold: 0.5,
            result: 'fail'
        },
        {
            criterion: 'author_identity_verified',
            weight: 0.2,
            score: 0,
            threshold: 0.5,
            result: 'fail'
        },
        {
            criterion: 'audience_defined',
            weight: 0.2,
            score: 0,
            threshold: 0.5,
            result: 'fail'
        },
        {
            criterion: 'permission_scope_verified',
            weight: 0.2,
            score: 0,
            threshold: 0.5,
            result: 'fail'
        }
    ],
    totalThreshold: 0.7
};

export async function validateProposal(proposal: ReviewPacketInput): Promise<ValidationConfig> {
    const config = { ...defaultValidationConfig };

    // Check if draft body is complete
    const draftBodyScore = proposal.packet.body ? 1 : 0;
    config.criteria[0].score = draftBodyScore;

    // Check if artifact path is provided
    const artifactPathScore = proposal.artifactId ? 1 : 0;
    config.criteria[1].score = artifactPathScore;

    // Check if author is verified
    const authorVerifiedScore = proposal.owner ? 1 : 0;
    config.criteria[2].score = authorVerifiedScore;

    // Check if audience is defined
    const audienceDefinedScore = proposal.audience ? 1 : 0;
    config.criteria[3].score = audienceDefinedScore;

    // Check if permission scope is verified
    const permissionVerifiedScore = proposal.packet.permission_scope ? 1 : 0;
    config.criteria[4].score = permissionVerifiedScore;

    // Calculate total score
    const totalScore = config.criteria.reduce((sum, criterion) => {
        return sum + (criterion.weight * criterion.score);
    }, 0);

    config.totalThreshold = 0.7;

    return config;
}

export function applyValidationResults(proposal: ReviewPacketInput, config: ValidationConfig): ReviewPacketInput {
    const totalScore = config.criteria.reduce((sum, criterion) => {
        return sum + (criterion.weight * criterion.score);
    }, 0);

    // Set validation results
    proposal.validationCriteria = config.criteria;
    proposal.totalScore = totalScore;

    // Determine overall status based on total score
    if (totalScore >= config.totalThreshold) {
        proposal.status = 'approved';
    } else {
        proposal.status = 'blocked';
        proposal.reason = 'Validation criteria not met';
    }

    return proposal;
}