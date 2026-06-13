// GET /api/ops/roundtable/[sessionId]/pdf — generate transcript PDF with debrief
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { renderTranscriptPdf } from '@/lib/roundtable/transcript-pdf';
import { getVoice } from '@/lib/roundtable/voices';
import type { Debrief } from '@/lib/roundtable/debrief';

export const dynamic = 'force-dynamic';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    const { sessionId } = await params;

    // Load session
    const [session] = await sql<[{
        id: string;
        format: string;
        topic: string;
        participants: string[];
        status: string;
        metadata: Record<string, unknown>;
        created_at: Date;
    }?]>`
        SELECT id, format, topic, participants, status, metadata, created_at
        FROM ops_roundtable_sessions WHERE id = ${sessionId}
    `;

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Load turns
    const turns = await sql<{
        speaker: string;
        dialogue: string;
        turn_number: number;
    }[]>`
        SELECT speaker, dialogue, turn_number
        FROM ops_roundtable_turns
        WHERE session_id = ${sessionId}
        ORDER BY turn_number ASC
    `;

    // Extract debrief from metadata if present
    const debrief = (session.metadata?.debrief as Debrief) ?? null;

    // Build transcript data
    const data = {
        sessionId: session.id,
        format: session.format,
        topic: session.topic,
        participants: session.participants,
        turns: turns.map(t => ({
            speaker: t.speaker,
            displayName: getVoice(t.speaker)?.displayName ?? t.speaker,
            dialogue: t.dialogue,
            turnNumber: t.turn_number,
        })),
        startedAt: session.created_at.toISOString(),
        completedAt: session.created_at.toISOString(),
        debrief,
    };

    try {
        const pdfBuffer = await renderTranscriptPdf(data);
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="transcript-${sessionId.slice(0, 8)}.pdf"`,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: 'PDF generation failed', detail: (err as Error).message },
            { status: 500 },
        );
    }
}
