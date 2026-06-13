import { NextRequest, NextResponse } from 'next/server';
import { isTTSEnabled, synthesizeSpeech } from '@/lib/tts/elevenlabs';

const MAX_TEXT_LENGTH = 5000;

/** Availability check — 200 if TTS is configured, 503 if not. */
export async function GET() {
    if (!isTTSEnabled()) {
        return NextResponse.json({ available: false }, { status: 503 });
    }
    return NextResponse.json({ available: true });
}

export async function POST(req: NextRequest) {
    if (!isTTSEnabled()) {
        return NextResponse.json(
            { error: 'TTS not configured' },
            { status: 503 },
        );
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    const { agentId, text } = body as { agentId?: string; text?: string };

    if (!agentId || !text) {
        return NextResponse.json(
            { error: 'Missing required fields: agentId, text' },
            { status: 400 },
        );
    }

    if (text.length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
            { error: `Text exceeds ${MAX_TEXT_LENGTH} character limit` },
            { status: 400 },
        );
    }

    const result = await synthesizeSpeech({ agentId, text });

    if (!result) {
        return NextResponse.json(
            { error: 'Synthesis failed or unsupported agent' },
            { status: 422 },
        );
    }

    return new NextResponse(new Uint8Array(result.audio), {
        status: 200,
        headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(result.audio.length),
            'Cache-Control': 'private, max-age=3600',
        },
    });
}
