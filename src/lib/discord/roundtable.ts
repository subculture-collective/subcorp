// Discord roundtable posting — plain messages in channel (no threads)
import { postToWebhook, postToWebhookWithFiles } from './client';
import { getWebhookUrl, getChannelForFormat } from './channels';
import { getVoice } from '../roundtable/voices';
import { getAgentAvatarUrl } from './avatars';
import { formatForDiscord } from './format';
import { logger } from '@/lib/logger';
import type {
    RoundtableSession,
    ConversationTurnEntry,
    SessionStatus,
} from '../types';

const log = logger.child({ module: 'discord-roundtable' });

/**
 * Post a conversation start message to the channel.
 * Returns a channel identifier (webhook URL) for subsequent posts.
 */
export async function postConversationStart(
    session: RoundtableSession,
): Promise<string | null> {
    const channelName = getChannelForFormat(session.format);
    const webhookUrl = await getWebhookUrl(channelName);
    if (!webhookUrl) return null;

    const participantList = session.participants
        .map((p) => {
            const voice = getVoice(p);
            return voice ? `${voice.symbol} ${voice.displayName}` : p;
        })
        .join(', ');

    const content = `📡 **${session.format}** — *starting*\n> ${session.topic}\n-# ${participantList}`;

    await postToWebhook({
        webhookUrl,
        username: '📡 Subcult Roundtable',
        content,
    });

    log.info('Roundtable start posted to Discord', {
        sessionId: session.id,
        channel: channelName,
    });

    // Return the webhook URL as the "thread" identifier — reused for turns and summary
    return webhookUrl;
}

/**
 * Post a single conversation turn to the channel.
 * Uses the speaker's symbol + name as the webhook username.
 */
export async function postConversationTurn(
    session: RoundtableSession,
    entry: ConversationTurnEntry,
    webhookUrl: string,
    audio?: { audio: Buffer; filename: string } | null,
): Promise<void> {
    const voice = getVoice(entry.speaker);
    const username = voice
        ? `${voice.symbol} ${voice.displayName}`
        : entry.speaker;
    const avatarUrl = getAgentAvatarUrl(entry.speaker);

    const audioFile = audio
        ? [{ filename: audio.filename, data: audio.audio, contentType: 'audio/mpeg' }]
        : undefined;

    // Discord enforces 2000 char limit per message — split long dialogue
    if (entry.dialogue.length <= 2000) {
        await postToWebhookWithFiles({
            webhookUrl, username, avatarUrl, content: entry.dialogue,
            files: audioFile,
        });
    } else {
        const chunks = splitDialogue(entry.dialogue, 2000);
        for (let i = 0; i < chunks.length; i++) {
            // Attach audio to first chunk only
            await postToWebhookWithFiles({
                webhookUrl, username, avatarUrl, content: chunks[i],
                files: i === 0 ? audioFile : undefined,
            });
        }
    }
}

/**
 * Post a summary message when the conversation ends.
 */
export async function postConversationSummary(
    session: RoundtableSession,
    history: ConversationTurnEntry[],
    status: SessionStatus,
    webhookUrl: string,
    abortReason?: string,
): Promise<void> {
    const speakers = [...new Set(history.map((h) => h.speaker))];
    const speakerNames = speakers
        .map((s) => {
            const voice = getVoice(s);
            return voice ? `${voice.symbol} ${voice.displayName}` : s;
        })
        .join(', ');

    const statusIcon = status === 'completed' ? '✅' : '❌';
    let content = `${statusIcon} **${session.format}** — *${status}* · ${history.length} turns\n-# ${speakerNames}`;

    if (abortReason) {
        content += `\n> ⚠️ *${abortReason}*`;
    }

    await postToWebhook({
        webhookUrl,
        username: '📡 Subcult Roundtable',
        content,
    });
}

/**
 * Post an artifact to the channel.
 * Called after the artifact synthesizer completes.
 * Splits long artifacts into multiple messages to avoid Discord's 2000 char limit.
 */
export async function postArtifactToDiscord(
    roundtableSessionId: string,
    format: string,
    artifactText: string,
): Promise<void> {
    const { sql } = await import('@/lib/db');

    const [session] = await sql<
        [{ format: string } | undefined]
    >`
        SELECT format FROM ops_roundtable_sessions
        WHERE id = ${roundtableSessionId}
    `;

    const channelName = getChannelForFormat(
        (session?.format ?? format) as RoundtableSession['format'],
    );
    const webhookUrl = await getWebhookUrl(channelName);
    if (!webhookUrl) return;

    const username = '📋 Subcult Artifact';

    // Convert markdown tables to ASCII box tables for Discord
    const formatted = formatForDiscord(artifactText);

    // Split into chunks that fit Discord's 2000 char limit
    const header = '📋 **Artifact**\n';
    const maxChunk = 2000 - header.length - 10; // margin for safety
    const chunks = splitAtBoundaries(formatted, maxChunk);

    for (let i = 0; i < chunks.length; i++) {
        const prefix = i === 0 ? header : '';
        const content = `${prefix}${chunks[i]}`;
        await postToWebhook({ webhookUrl, username, content });
    }

    log.info('Artifact posted to Discord', {
        roundtableSessionId,
        chunks: chunks.length,
    });
}

/**
 * Post a meeting debrief to the roundtable's channel.
 * Posted before the artifact so the feed shows: debrief → artifact.
 */
export async function postDebriefToDiscord(
    roundtableSessionId: string,
    format: string,
    debriefMarkdown: string,
): Promise<void> {
    const channelName = getChannelForFormat(format as RoundtableSession['format']);
    const webhookUrl = await getWebhookUrl(channelName);
    if (!webhookUrl) return;

    const username = '📋 Subcult Debrief';
    const formatted = formatForDiscord(debriefMarkdown);
    const maxChunk = 1990;
    const chunks = splitAtBoundaries(formatted, maxChunk);

    for (const chunk of chunks) {
        await postToWebhook({ webhookUrl, username, content: chunk });
    }

    log.info('Debrief posted to Discord', { roundtableSessionId, chunks: chunks.length });
}

/** Split dialogue text at sentence/paragraph boundaries to stay under maxLen. */
function splitDialogue(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
        if (remaining.length <= maxLen) { chunks.push(remaining); break; }
        let idx = remaining.lastIndexOf('\n\n', maxLen);
        if (idx <= 0) idx = remaining.lastIndexOf('\n', maxLen);
        if (idx <= 0) idx = remaining.lastIndexOf('. ', maxLen);
        if (idx <= 0) idx = remaining.lastIndexOf(' ', maxLen);
        if (idx <= 0) idx = maxLen;
        // Include the period in the chunk
        const end = remaining[idx] === '.' ? idx + 1 : idx;
        chunks.push(remaining.slice(0, end).trimEnd());
        remaining = remaining.slice(end).trimStart();
    }
    return chunks;
}

/** Split text into chunks at paragraph/line boundaries to stay under maxLen.
 *  Avoids splitting inside code blocks (``` ... ```) so tables stay intact. */
function splitAtBoundaries(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
            chunks.push(remaining);
            break;
        }

        // Find code block boundaries in the candidate window
        const window = remaining.slice(0, maxLen);
        const codeBlockStart = window.lastIndexOf('```\n');
        const codeBlockEnd = window.lastIndexOf('\n```');

        // If we're inside an unclosed code block, split before it starts
        if (codeBlockStart > codeBlockEnd && codeBlockStart > 0) {
            const splitIdx = remaining.lastIndexOf('\n\n', codeBlockStart);
            if (splitIdx > 0) {
                chunks.push(remaining.slice(0, splitIdx));
                remaining = remaining.slice(splitIdx).replace(/^\n+/, '');
                continue;
            }
        }

        // Try to split at a paragraph break
        let splitIdx = remaining.lastIndexOf('\n\n', maxLen);
        // Fall back to any newline
        if (splitIdx <= 0) splitIdx = remaining.lastIndexOf('\n', maxLen);
        // Last resort: split at space
        if (splitIdx <= 0) splitIdx = remaining.lastIndexOf(' ', maxLen);
        // Absolute fallback: hard cut
        if (splitIdx <= 0) splitIdx = maxLen;

        chunks.push(remaining.slice(0, splitIdx));
        remaining = remaining.slice(splitIdx).replace(/^\n+/, '');
    }

    return chunks;
}
