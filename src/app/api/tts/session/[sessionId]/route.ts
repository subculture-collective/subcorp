// API route for cached TTS MP3 files
// GET  — stream cached MP3 (or 404)
// POST — save concatenated MP3 blob
// DELETE — remove cached file (for regeneration)

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const AUDIO_DIR = '/workspace/audio';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const log = logger.child({ route: 'tts/session' });

function validateSessionId(sessionId: string): string | null {
    if (!UUID_RE.test(sessionId)) return null;
    return path.join(AUDIO_DIR, `${sessionId}.mp3`);
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    const { sessionId } = await params;
    const filePath = validateSessionId(sessionId);
    if (!filePath) {
        return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    try {
        const data = await readFile(filePath);
        return new NextResponse(data, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${sessionId}.mp3"`,
                'Content-Length': String(data.byteLength),
            },
        });
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    const { sessionId } = await params;
    const filePath = validateSessionId(sessionId);
    if (!filePath) {
        return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    try {
        if (!existsSync(AUDIO_DIR)) {
            await mkdir(AUDIO_DIR, { recursive: true });
        }

        const buffer = Buffer.from(await req.arrayBuffer());
        await writeFile(filePath, buffer);
        return NextResponse.json({ ok: true });
    } catch (err) {
        log.error('TTS cache write failed', { error: err, sessionId });
        return NextResponse.json({ error: 'Write failed' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    const { sessionId } = await params;
    const filePath = validateSessionId(sessionId);
    if (!filePath) {
        return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    try {
        await unlink(filePath);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}
