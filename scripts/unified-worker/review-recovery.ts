export interface ReviewDraft {
    id: string;
    title: string;
    review_session_id: string | null;
}

export interface ReviewDraftRecoveryLogger {
    info(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}

export async function processCompletedReviewDrafts(
    drafts: ReviewDraft[],
    processReviewSession: (reviewSessionId: string) => Promise<void>,
    logger: ReviewDraftRecoveryLogger,
): Promise<number> {
    if (drafts.length === 0) return 0;

    logger.info('Catching up stuck content reviews', { count: drafts.length });

    let processed = 0;
    for (const draft of drafts) {
        try {
            await processReviewSession(draft.review_session_id!);
            processed += 1;
            logger.info('Stuck review processed', {
                draftId: draft.id,
                title: draft.title,
            });
        } catch (err) {
            logger.error('Failed to process stuck review', {
                error: err,
                draftId: draft.id,
            });
        }
    }

    return processed;
}

export async function releaseStaleReviewDrafts(
    drafts: ReviewDraft[],
    resetDraftToDraft: (draftId: string) => Promise<boolean>,
    logger: ReviewDraftRecoveryLogger,
): Promise<number> {
    if (drafts.length === 0) return 0;

    logger.info('Releasing stale content reviews back to draft', {
        count: drafts.length,
    });

    let released = 0;
    for (const draft of drafts) {
        try {
            const didReset = await resetDraftToDraft(draft.id);
            if (didReset) {
                released += 1;
                logger.info('Stale review draft reset to draft', {
                    draftId: draft.id,
                    title: draft.title,
                    previousReviewSessionId: draft.review_session_id,
                });
            }
        } catch (err) {
            logger.error('Failed to release stale review draft', {
                error: err,
                draftId: draft.id,
            });
        }
    }

    return released;
}
