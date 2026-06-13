// Event-to-Discord dispatcher — routes ops events to appropriate channels
import { postToWebhook } from './client';
import { getWebhookUrl } from './channels';
import type { DiscordChannelName } from './channels';
import { AGENTS } from '../agents';
import { getVoice } from '../roundtable/voices';
import { getAgentAvatarUrl } from './avatars';
import type { AgentId, EventInput } from '../types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'discord-events' });

const DISCORD_MAX_LENGTH = 2000;

/**
 * Split a message into chunks that fit Discord's 2000-char limit.
 * Splits at line boundaries to keep blockquotes intact.
 * Continuation chunks inside a blockquote re-open the `> ` prefix.
 */
function splitDiscordMessage(content: string): string[] {
    if (content.length <= DISCORD_MAX_LENGTH) return [content];

    const lines = content.split('\n');
    const chunks: string[] = [];
    let current = '';

    for (const line of lines) {
        // If adding this line would exceed the limit, flush current chunk
        const candidate = current.length === 0 ? line : `${current}\n${line}`;
        if (candidate.length > DISCORD_MAX_LENGTH) {
            if (current.length > 0) {
                chunks.push(current);
                current = line;
            } else {
                // Single line exceeds limit — hard-split it
                let remaining = line;
                while (remaining.length > DISCORD_MAX_LENGTH) {
                    chunks.push(remaining.slice(0, DISCORD_MAX_LENGTH));
                    remaining = remaining.slice(DISCORD_MAX_LENGTH);
                }
                current = remaining;
            }
        } else {
            current = candidate;
        }
    }
    if (current.length > 0) chunks.push(current);

    return chunks;
}

/** Map event kinds to Discord channel names */
const EVENT_CHANNEL_MAP: Record<string, DiscordChannelName> = {
    // proposals
    proposal_created: 'proposals',
    proposal_auto_approved: 'proposals',
    agent_proposal_vote: 'proposals',
    governance_proposal_created: 'proposals',
    governance_proposal_accepted: 'proposals',
    governance_proposal_rejected: 'proposals',

    // missions
    mission_failed: 'missions',
    mission_succeeded: 'missions',
    agent_session_completed: 'missions',
    agent_session_failed: 'missions',

    // research — step-kind completions for analysis tasks
    research_completed: 'research',
    news_digest_generated: 'research',

    // insights — step-kind completions for synthesis/memory tasks
    insight_generated: 'insights',
    memory_archaeology_complete: 'insights',
    dream_cycle_completed: 'dreams',

    // system-log
    trigger_fired: 'system-log',
    stale_steps_recovered: 'system-log',
    missing_artifacts: 'system-log',

    // drafts
    content_draft_created: 'drafts',
    content_approved: 'drafts',
    content_rejected: 'drafts',

    // project
    agent_spawned: 'project',
    agent_proposal_created: 'project',
};

/** Status emoji for event kinds */
function getKindEmoji(kind: string): string {
    if (kind.includes('dream')) return '💭';
    if (kind.includes('archaeology')) return '🔮';
    if (kind.includes('succeeded') || kind.includes('approved') || kind.includes('completed') || kind.includes('accepted')) return '✅';
    if (kind.includes('failed') || kind.includes('rejected')) return '❌';
    if (kind.includes('proposal')) return '📋';
    if (kind.includes('mission')) return '🚀';
    if (kind.includes('trigger')) return '⚡';
    if (kind.includes('content') || kind.includes('draft')) return '📝';
    if (kind.includes('spawned')) return '🤖';
    return '📡';
}

/** Format the event body with Markdown appropriate to the event kind. */
function formatEventContent(input: EventInput, agentLabel: string, emoji: string): string {
    const kind = input.kind;
    const summary = input.summary?.trim();

    // Dreams / archaeology — poetic content gets blockquoted
    if (kind.includes('dream') || kind.includes('archaeology')) {
        const quoted = summary ? summary.split('\n').map(l => `> ${l}`).join('\n') : '';
        return `${emoji} **${agentLabel}** — *${input.title}*\n${quoted}`;
    }

    // Session completed/failed — compact summary
    if (kind.includes('agent_session')) {
        const meta = input.metadata ?? {};
        const rounds = meta.rounds ? ` · ${meta.rounds} rounds` : '';
        const tools = meta.toolCalls ? ` · ${meta.toolCalls} tool calls` : '';
        let content = `${emoji} **${agentLabel}** — ${input.title}${rounds}${tools}`;
        if (summary) {
            const quoted = summary.split('\n').map(l => `> ${l}`).join('\n');
            content += `\n${quoted}`;
        }
        return content;
    }

    // Proposals — title + description
    if (kind.includes('proposal')) {
        let content = `${emoji} **${agentLabel}** — ${input.title}`;
        if (summary) content += `\n>>> ${summary}`;
        return content;
    }

    // Default — title with optional summary as blockquote
    let content = `${emoji} **${agentLabel}** — ${input.title}`;
    if (summary) {
        content += `\n> ${summary}`;
    }
    return content;
}

/** Post an event to the appropriate Discord channel. */
export async function postEventToDiscord(input: EventInput): Promise<void> {
    const channel = EVENT_CHANNEL_MAP[input.kind];
    if (!channel) return; // unmapped event — skip silently

    const webhookUrl = await getWebhookUrl(channel);
    if (!webhookUrl) return;

    const agent = AGENTS[input.agent_id as AgentId];
    const voice = getVoice(input.agent_id);
    const agentName = agent?.displayName ?? input.agent_id;
    const symbol = voice?.symbol ?? '';
    const emoji = getKindEmoji(input.kind);
    const agentLabel = `${symbol ? symbol + ' ' : ''}${agentName}`;

    const content = formatEventContent(input, agentLabel, emoji);
    const chunks = splitDiscordMessage(content);

    try {
        for (const chunk of chunks) {
            await postToWebhook({
                webhookUrl,
                username: agentName,
                avatarUrl: getAgentAvatarUrl(input.agent_id),
                content: chunk,
            });
        }
    } catch (err) {
        log.warn('Failed to post event to Discord', {
            kind: input.kind,
            channel,
            error: (err as Error).message,
        });
    }
}
