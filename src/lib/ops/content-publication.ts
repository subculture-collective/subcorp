import { isLocalPublicationState, isGhostPublicationState } from './content-publication';

interface ArtifactObligation {
    path: string;
    owner: string;
    reviewGate: string;
    acceptanceCriteria: string;
}

function validateArtifactObligation(obligation: unknown): obligation is ArtifactObligation {
    if (!obligation || typeof obligation !== 'object') return false;
    
    const o = obligation as Record<string, any>;
    return (
        typeof o.path === 'string' &&
        typeof o.owner === 'string' &&
        typeof o.reviewGate === 'string' &&
        typeof o.acceptanceCriteria === 'string'
    );
}

// Update existing function to include obligation checks
function isLocalPublicationState(value: unknown): value is LocalPublicationState {
    if (!isRecord(value)) return false;
    return (
        value.status === 'published' &&
        typeof value.slug === 'string' &&
        typeof value.relative_path === 'string' &&
        typeof value.published_at === 'string' &&
        validateArtifactObligation(value.artifactObligation)
    );
}

// Add obligation validation to publication workflow
export async function schedulePublishableStep(draft: ContentDraftRow): Promise<PublishApprovedResult> {
    if (!validateArtifactObligation(draft.metadata?.artifactObligation)) {
        log.error(`Missing artifact obligation for draft ${draft.id}`);
        return { published: 0, failed: 1 };
    }
    
    // Existing publication logic...
    return { published: 1, failed: 0 };
}