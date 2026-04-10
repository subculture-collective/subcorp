// /api/ops/content — List and manage content drafts
import { NextRequest, NextResponse } from 'next/server';
import { sql, jsonb } from '@/lib/db';
import { requireAuthOrCron } from '@/lib/auth/middleware';
import { retryGhostMirrorForDraft } from '@/lib/ops/content-publication';

export const dynamic = 'force-dynamic';

const MAX_NOTES_LENGTH = 5000;

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
        const [draft] = await sql<[{ id: string; status: string }?]>`
            SELECT id, status FROM ops_content_drafts WHERE id = ${body.id}
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

        if (body.notes) {
            // Append note to reviewer_notes array
            // Map status to verdict value
            const verdict =
                body.status === 'approved' ? 'approve'
                : body.status === 'rejected' ? 'reject'
                : 'mixed';
            const result = await sql`
                UPDATE ops_content_drafts
                SET status = ${body.status},
                    reviewer_notes = reviewer_notes || ${jsonb([{ reviewer: 'manual', verdict, notes: body.notes }])}::jsonb,
                    updated_at = NOW()
                WHERE id = ${body.id}
                AND status = ${draft.status}
                RETURNING id
            `;

            if (result.length === 0) {
                return NextResponse.json(
                    {
                        error: `Update failed due to stale status. Expected ${draft.status}`,
                    },
                    { status: 409 },
                );
            }
        } else {
            const result = await sql`
                UPDATE ops_content_drafts
                SET status = ${body.status},
                    updated_at = NOW()
                WHERE id = ${body.id}
                AND status = ${draft.status}
                RETURNING id
            `;

            if (result.length === 0) {
                return NextResponse.json(
                    {
                        error: `Update failed due to stale status. Expected ${draft.status}`,
                    },
                    { status: 409 },
                );
            }
        }

        return NextResponse.json({
            success: true,
            id: body.id,
            status: body.status,
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}
