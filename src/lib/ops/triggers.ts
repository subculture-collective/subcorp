import { createMission } from '@/lib/mission-service';

// ... existing code ...

async function checkContentDraftCreated(draftId: string): Promise<TriggerCheckResult> {
    const draft = await getDraft(draftId);
    
    if (!draft.body || draft.body.length < MIN_REVIEWABLE_DRAFT_BODY_CHARS) {
        const missingFields = ['draft_body'];
        const acceptanceCriteria = await validateContentReviewPacket(draft);
        
        // Replace logevent with bounded revisecontentdraft mission
        await createMission('revisecontentdraft', {
            draftId,
            missingFields,
            acceptanceCriteria,
        });
        
        return {
            fired: false,
            reason: `Content draft ${draftId} missing required fields: ${missingFields.join(', ')}`
        };
    }
    
    // ... existing validation logic ...
}