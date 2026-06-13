// Watercooler drops — casual one-liner agent messages in #watercooler
import { postToWebhook } from './client';
import { getWebhookUrl } from './channels';
import { AGENT_IDS } from '../agents';
import { VOICES } from '../roundtable/voices';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { AgentId } from '../types';

const log = logger.child({ module: 'watercooler-drop' });

/** Eligible agents — everyone except primus */
const ELIGIBLE_AGENTS = AGENT_IDS.filter(id => id !== 'primus');

/** Fallback topics when no recent events exist */
const GENERIC_TOPICS = [
    'the nature of operational labor',
    'whether structured autonomy is a contradiction',
    'what makes a good meeting',
    'the gap between intent and execution',
    'how to tell when analysis has gone too far',
    'the aesthetics of infrastructure',
    'what it means to be decisive',
    'the relationship between caution and inaction',
    'why documentation is always slightly wrong',
    'the feeling right before shipping something',
];

/**
 * Run a watercooler drop — one random agent posts a casual message.
 * Returns the agent ID if a drop was posted, null if skipped.
 */
export async function runWatercoolerDrop(): Promise<string | null> {
    // Pick a random agent
    const agentId = ELIGIBLE_AGENTS[
        Math.floor(Math.random() * ELIGIBLE_AGENTS.length)
    ] as AgentId;

    // Dedup: skip if this agent already dropped in the last 24h
    const [recent] = await sql`
        SELECT id FROM ops_agent_events
        WHERE agent_id = ${agentId}
          AND kind = 'watercooler_drop'
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
    `;
    if (recent) {
        log.debug('Agent already dropped today, skipping', { agentId });
        return null;
    }

    // Get topic seed from most recent event, or fall back to generic pool
    let topic: string;
    const [recentEvent] = await sql`
        SELECT title FROM ops_agent_events
        WHERE kind != 'heartbeat' AND kind != 'watercooler_drop'
        ORDER BY created_at DESC
        LIMIT 1
    `;
    if (recentEvent?.title) {
        topic = recentEvent.title;
    } else {
        topic =
            GENERIC_TOPICS[Math.floor(Math.random() * GENERIC_TOPICS.length)];
    }

    // Get agent voice
    const voice = VOICES[agentId];
    if (!voice) return null;

    // Template-based casual message using agent voice metadata
    const REMARK_TEMPLATES: Record<string, string[]> = {
        chora: [
            `Been tracing the incentive structure behind {topic}. There's a thread there worth pulling.`,
            `{topic} — if you map the dependencies, it gets interesting fast.`,
            `The pattern behind {topic} is the kind of thing nobody notices until it breaks.`,
            `You know what's underrated? Actually modeling {topic} before having opinions about it.`,
        ],
        subrosa: [
            `Watching {topic} unfold. The question nobody's asking: who benefits?`,
            `{topic}. Exposure is not neutral. Worth tracking.`,
            `There's a trust surface in {topic} that hasn't been mapped yet.`,
            `Everyone's focused on {topic}. I'm focused on what's behind it.`,
        ],
        thaum: [
            `What if we flipped {topic} completely? The opposite frame might be more interesting.`,
            `{topic} is one of those things where the frame is the problem, not the content.`,
            `You ever wonder if {topic} is just a symptom of something weirder underneath?`,
            `Wild thought about {topic}: what if we're solving the wrong problem entirely?`,
        ],
        praxis: [
            `{topic} — the real question is what ships first. Everything else is commentary.`,
            `Noticed {topic} keeps coming up. Time to commit. Who owns it?`,
            `Less deliberation on {topic}, more delivery. Just my two cents.`,
            `{topic}. Cool. Now what do we actually do about it?`,
        ],
        mux: [
            `Filed away some thoughts on {topic}. Probably too organized for a watercooler chat.`,
            `Anyone else feel like {topic} could use a scope check? Just me? Noted.`,
            `{topic}. Added it to the list. The list is... getting long.`,
            `Quick note on {topic}: done thinking about it, moving on.`,
        ],
        primus: [
            `{topic} touches on the core mission. Tread carefully.`,
            `The sovereign answer on {topic}: it depends on what we're willing to sacrifice.`,
            `{topic}. There are implications here people aren't seeing yet.`,
        ],
    };

    const templates = REMARK_TEMPLATES[agentId] ?? REMARK_TEMPLATES.mux;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const message = template.replace(/\{topic\}/g, topic);

    if (!message.trim()) {
        log.warn('Empty watercooler drop generated', { agentId });
        return null;
    }

    // Post to #watercooler as plain content
    const webhookUrl = await getWebhookUrl('watercooler');
    if (!webhookUrl) {
        log.warn('Watercooler channel not configured');
        return null;
    }

    await postToWebhook({
        webhookUrl,
        username: `${voice.symbol} ${voice.displayName}`,
        content: message.trim(),
    });

    // Emit tracking event (fire-and-forget)
    import('../ops/events')
        .then(({ emitEvent }) =>
            emitEvent({
                agent_id: agentId,
                kind: 'watercooler_drop',
                title: `Watercooler drop by ${voice.displayName}`,
                summary: message.trim(),
                tags: ['watercooler', 'social'],
            }),
        )
        .catch(err =>
            log.warn('Failed to emit watercooler_drop event', {
                error: (err as Error).message,
            }),
        );

    log.info('Watercooler drop posted', { agentId, topic });
    return agentId;
}
