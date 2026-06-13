// ElevenLabs TTS — server-side speech synthesis via ElevenLabs Flash v2.5
// Zero dependencies (raw fetch, Node 22 native). Fully optional — no API key = no audio.
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'tts-elevenlabs' });

// ─── Voice ID Mapping ───

const VOICE_ID_MAP: Record<string, string> = {
    chora: 'xNtG3W2oqJs0cJZuTyBc',
    subrosa: 'lUCNYQh2kqW2wiie85Qk',
    primus: 'Bj9UqZbhQsanLzgalpEG',
    thaum: 'nzeAacJi50IvxcyDnMXa',
    praxis: '1Z7qQDyqapTm8qBfJx6e',
    mux: 'Xh5OictnmgRO4dff7pLm',
};

// ─── Pronunciation Dictionary ───
// Uploaded via ElevenLabs API — contains IPA for agent names + project vocab
// PLS source: src/lib/tts/subcorp-dictionary.pls
const PRONUNCIATION_DICTIONARY = {
    id: 'T4J4acgqOqGRunucNgJI',
    versionId: 'g1QwEizFIrzvEAsPWLNP',
};

// ─── Public API ───

export function isTTSEnabled(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
}

/** Strip markdown formatting before sending to TTS API. */
export function sanitizeForTTS(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '') // code blocks
        .replace(/`([^`]+)`/g, '$1')    // inline code
        .replace(/#{1,6}\s?/g, '')      // headings
        .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
        .replace(/\*([^*]+)\*/g, '$1')     // italic
        .replace(/^>\s?/gm, '')            // blockquotes
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text only
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images → remove
        .replace(/[-*_]{3,}/g, '')        // horizontal rules
        .replace(/\n{3,}/g, '\n\n')       // collapse excess newlines
        .trim();
}

export interface SynthesizeSpeechOptions {
    agentId: string;
    text: string;
    turn?: number;
}

export interface TTSResult {
    audio: Buffer;
    filename: string;
}

/**
 * Synthesize speech for an agent's dialogue.
 * Returns null immediately if TTS is disabled or no voice mapping exists.
 * Never throws — catches all errors, logs warning, returns null.
 */
export async function synthesizeSpeech(
    options: SynthesizeSpeechOptions,
): Promise<TTSResult | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return null;

    const voiceId = VOICE_ID_MAP[options.agentId];
    if (!voiceId) return null;

    const sanitized = sanitizeForTTS(options.text);
    if (!sanitized) return null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3&output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text: sanitized,
                    model_id: 'eleven_flash_v2_5',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                    pronunciation_dictionary_locators: [
                        {
                            pronunciation_dictionary_id: PRONUNCIATION_DICTIONARY.id,
                            version_id: PRONUNCIATION_DICTIONARY.versionId,
                        },
                    ],
                }),
                signal: controller.signal,
            },
        );

        clearTimeout(timeout);

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            log.warn('ElevenLabs TTS request failed', {
                status: res.status,
                body: body.slice(0, 200),
                agentId: options.agentId,
            });
            return null;
        }

        const arrayBuffer = await res.arrayBuffer();
        const audio = Buffer.from(arrayBuffer);
        const turnSuffix = options.turn != null ? options.turn : 0;
        const filename = `${options.agentId}-turn-${turnSuffix}.mp3`;

        log.info('TTS synthesis completed', {
            agentId: options.agentId,
            turn: options.turn,
            audioBytes: audio.length,
        });

        return { audio, filename };
    } catch (err) {
        log.warn('TTS synthesis error', {
            error: (err as Error).message,
            agentId: options.agentId,
            turn: options.turn,
        });
        return null;
    }
}
