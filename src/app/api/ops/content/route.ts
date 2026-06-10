// /api/ops/content — List and manage content drafts
import { NextRequest, NextResponse } from 'next/server';
import { sql, jsonb } from '@/lib/db';
import { requireAuthOrCron } from '@/lib/auth/middleware';
import { retryGhostMirrorForDraft } from '@/lib/ops/content-publication';
import {
    createOrUpdateReviewPacket,
    type ReviewPacketStatus,
} from '@/lib/ops/review-packets';

export const dynamic = 'force-dynamic';

const MAX_NOTES_LENGTH = 5000;

class StaleContentStatusError extends Error {
    constructor(readonly expectedStatus: string) {
        super(`Update failed due to stale status. Expected ${expectedStatus}`);
    }
}

function toReviewPacketStatus(status: string): ReviewPacketStatus {
    if (status === 'review') return 'awaiting_review';
    if (status === 'approved') return 'approved';
    if (status === 'rejected') return 'rejected';
    return 'submitted';
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const author = searchParams.get('author');
    const contentType = searchParams.get('content_type');
    const limit = Math.min(
        parseInt(searchParams.get('limit') ?? '20', 10),
        100,
    );

    try {
        const rows = await sql`
            SELECT * FROM ops_content_drafts
            WHERE 1=1
            ${status ? sql`AND status = ${status}` : sql``}
            ${author ? sql`AND author_agent = ${author}` : sql``}
            ${contentType ? sql`AND content_type = ${contentType}` : sql``}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;

        return NextResponse.json({ drafts: rows });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}

export async function PATCH(req: NextRequest) {
    const authResult = await requireAuthOrCron(req);
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = (await req.json()) as {
            id?: string;
            status?: string;
            notes?: string;
            action?: string;
        };

        if (body.action === 'retry_ghost_mirror') {
            if (!body.id) {
                return NextResponse.json(
                    { error: 'Missing required field: id' },
                    { status: 400 },
                );
            }

            const retry = await retryGhostMirrorForDraft(body.id);
            return NextResponse.json(
                {
                    success: retry.ok,
                    mirrored: retry.mirrored,
                    id: body.id,
                    action: body.action,
                    message: retry.message,
                },
                { status: retry.ok ? 200 : 400 },
            );
        }

        if (!body.id || !body.status) {
            return NextResponse.json(
                { error: 'Missing required fields: id, status' },
                { status: 400 },
            );
        }

        // Validate notes field type and length
        if (body.notes !== undefined) {
            if (typeof body.notes !== 'string') {
                return NextResponse.json(
                    { error: 'Notes field must be a string' },
                    { status: 400 },
                );
            }
            if (body.notes.length > MAX_NOTES_LENGTH) {
                return NextResponse.json(
                    {
                        error: `Notes field too long (max ${MAX_NOTES_LENGTH} characters)`,
                    },
                    { status: 400 },
                );
            }
        }

        // Validate status value
        const validStatuses = [
            'draft',
            'review',
            'approved',
            'rejected',
        ];
        if (!validStatuses.includes(body.status)) {
            return NextResponse.json(
                {
                    error: `Invalid status: ${body.status}. Must be one of: ${validStatuses.join(', ')}`,
                },
                { status: 400 },
            );
        }

        // Load current draft to validate transition
        const [draft] = await sql<
            [
                {
                    id: string;
                    status: string;
                    author_agent: string;
                    title: string;
                    content_type: string;
                }?,
            ]
        >`
            SELECT id, status, author_agent, title, content_type
            FROM ops_content_drafts
            WHERE id = ${body.id}
        `;

        if (!draft) {
            return NextResponse.json(
                { error: 'Draft not found' },
                { status: 404 },
            );
        }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            draft: ['review'],
            review: ['approved', 'rejected'],
            approved: ['rejected'],
            rejected: ['draft'], // Allow re-drafting
            published: [],
        };

        const allowed = validTransitions[draft.status] ?? [];
        if (!allowed.includes(body.status)) {
            return NextResponse.json(
                {
                    error: `Invalid transition: ${draft.status} → ${body.status}. Allowed: ${allowed.join(', ') || 'none'}`,
                },
                { status: 400 },
            );
        }

        // Persist a durable review packet before mutating content status. This
        // replaces ad hoc event-handler status mutation with a replayable gate.
        const verdict =
            body.status === 'approved' ? 'approve'
            : body.status === 'rejected' ? 'reject'
            : 'mixed';
        const note = body.notes
            ? { reviewer: 'manual', verdict, notes: body.notes }
            : null;

        await sql.begin(async tx => {
            await createOrUpdateReviewPacket(
                {
                    subjectType: 'content_draft',
                    subjectId: draft.id,
                    status: toReviewPacketStatus(body.status),
                    requestedBy: draft.author_agent,
                    title: draft.title,
                    summary: `Manual content status transition: ${draft.status} → ${body.status}`,
                    packet: {
                        draftId: draft.id,
                        author_agent: draft.author_agent,
                        content_type: draft.content_type,
                        previous_status: draft.status,
                        requested_status: body.status,
                        updated_by: 'content-api',
                    },
                    decision:
                        body.status === 'approved' || body.status === 'rejected'
                            ? {
                                  outcome: body.status,
                                  decidedBy: 'manual',
                                  notes: body.notes ?? null,
                              }
                            : undefined,
                },
                tx as typeof sql,
            );

            const result = await tx`
                UPDATE ops_content_drafts
                SET status = ${body.status},
                    reviewer_notes = CASE
                        WHEN ${note ? jsonb([note]) : null}::jsonb IS NULL THEN reviewer_notes
                        ELSE reviewer_notes || ${note ? jsonb([note]) : null}::jsonb
                    END,
                    updated_at = NOW()
                WHERE id = ${body.id}
                AND status = ${draft.status}
                RETURNING id
            `;

            if (result.length === 0) {
                throw new StaleContentStatusError(draft.status);
            }
        });

        return NextResponse.json({
            success: true,
            id: body.id,
            status: body.status,
        });
    } catch (err) {
        if (err instanceof StaleContentStatusError) {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }

        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}
