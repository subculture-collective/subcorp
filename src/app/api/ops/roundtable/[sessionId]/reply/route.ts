// /api/ops/roundtable/[sessionId]/reply — Inject a user turn into a voice_chat session
import { NextRequest, NextResponse } from 'next/server';
import { sql, jsonb } from '@/lib/db';
import { emitEvent } from '@/lib/ops/events';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'roundtable/reply' });

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    const { sessionId } = await params;

    if (!UUID_RE.test(sessionId)) {
        return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const message = typeof body.message === 'string' ? body.message.trim() : '';

        if (message.length < 1) {
            return NextResponse.json(
                { error: 'Message must not be empty.' },
                { status: 400 },
            );
        }

        if (message.length > 1000) {
            return NextResponse.json(
                { error: 'Message must be 1000 characters or fewer.' },
                { status: 400 },
            );
        }

        // Verify session exists and is a running voice_chat
        const sessions = await sql<
            Array<{ status: string; format: string; turn_count: number }>
        >`
            SELECT status, format, turn_count FROM ops_roundtable_sessions
            WHERE id = ${sessionId}
            LIMIT 1
        `;

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const session = sessions[0];

        if (session.format !== 'voice_chat') {
            return NextResponse.json(
                { error: 'Reply injection is only supported for voice_chat sessions' },
                { status: 400 },
            );
        }

        if (session.status !== 'running' && session.status !== 'pending') {
            return NextResponse.json(
                { error: `Session is ${session.status}, cannot accept replies` },
                { status: 409 },
            );
        }

        // Get next turn number
        const [{ max_turn }] = await sql<[{ max_turn: number | null }]>`
            SELECT MAX(turn_number) as max_turn FROM ops_roundtable_turns
            WHERE session_id = ${sessionId}
        `;
        const nextTurn = (max_turn ?? -1) + 1;

        // Insert the user turn
        await sql`
            INSERT INTO ops_roundtable_turns (session_id, turn_number, speaker, dialogue, metadata)
            VALUES (${sessionId}, ${nextTurn}, ${'user'}, ${message}, ${jsonb({ source: 'voice_reply' })})
        `;

        // Update session turn count
        await sql`
            UPDATE ops_roundtable_sessions
            SET turn_count = ${nextTurn + 1}
            WHERE id = ${sessionId}
        `;

        // Emit event so SSE picks it up
        await emitEvent({
            agent_id: 'user',
            kind: 'conversation_turn',
            title: `User: ${message}`,
            tags: ['conversation', 'turn', 'voice_chat', 'user_reply'],
            metadata: {
                sessionId,
                turn: nextTurn,
                dialogue: message,
            },
        });

        log.info('User reply injected', { sessionId, turn: nextTurn, messageLength: message.length });

        return NextResponse.json({ success: true, turn: nextTurn }, { status: 200 });
    } catch (err) {
        log.error('POST error', { error: err });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
