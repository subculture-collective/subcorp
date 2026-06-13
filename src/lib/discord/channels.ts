// Discord channel registry — backed by ops_discord_channels table
// Environment variable overrides:
//   DISCORD_CHANNEL_<NAME>=<discord_channel_id>
//   e.g. DISCORD_CHANNEL_ROUNDTABLE=1471411876213686313
//        DISCORD_CHANNEL_DAILY_DIGEST=1471411999999999999
// Hyphens in channel names become underscores in env var names.
// New channels are auto-created in DB on first lookup.
import { sql } from '@/lib/db';
import { getOrCreateWebhook } from './client';
import { logger } from '@/lib/logger';
import type { ConversationFormat } from '../types';

const log = logger.child({ module: 'discord-channels' });

export type DiscordChannelName =
    | 'roundtable'
    | 'brainstorm'
    | 'drafts'
    | 'watercooler'
    | 'missions'
    | 'system-log'
    | 'research'
    | 'insights'
    | 'proposals'
    | 'project'
    | 'daily-digest'
    | 'news-digest'
    | 'dreams'
    | 'sanctum-chat'
    | 'newsletter';

/** Map conversation formats to Discord channel names */
const FORMAT_CHANNEL_MAP: Record<ConversationFormat, DiscordChannelName> = {
    standup: 'roundtable',
    checkin: 'roundtable',
    triage: 'roundtable',
    deep_dive: 'roundtable',
    risk_review: 'roundtable',
    strategy: 'roundtable',
    planning: 'roundtable',
    shipping: 'roundtable',
    retro: 'roundtable',
    debate: 'roundtable',
    cross_exam: 'roundtable',
    reframe: 'roundtable',
    content_review: 'roundtable',
    brainstorm: 'brainstorm',
    writing_room: 'drafts',
    watercooler: 'watercooler',
    agent_design: 'roundtable',
    voice_chat: 'roundtable',
};

/** Build a webhook URL from separate id + token columns */
function buildWebhookUrl(webhookId: string, webhookToken: string): string {
    return `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;
}

// ─── Env var sync ───

const ENV_PREFIX = 'DISCORD_CHANNEL_';
let envSynced = false;

/**
 * Parse DISCORD_CHANNEL_* env vars and upsert into ops_discord_channels.
 * Called once on first getWebhookUrl() call.
 *
 * Env var naming:
 *   DISCORD_CHANNEL_ROUNDTABLE=1471411876213686313
 *   DISCORD_CHANNEL_DAILY_DIGEST=1471411999999999999
 *
 * Underscores in env var names become hyphens in channel names.
 *   DAILY_DIGEST → daily-digest
 */
async function syncEnvToDb(): Promise<void> {
    if (envSynced) return;
    envSynced = true;

    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return;

    for (const [key, value] of Object.entries(process.env)) {
        if (!key.startsWith(ENV_PREFIX) || !value) continue;

        const rawName = key.slice(ENV_PREFIX.length);
        if (!rawName) continue;

        // Convert UPPER_SNAKE to lower-kebab: DAILY_DIGEST → daily-digest
        const channelName = rawName.toLowerCase().replace(/_/g, '-');
        const channelId = value.trim();

        if (!channelId) continue;

        try {
            await sql`
                INSERT INTO ops_discord_channels (discord_channel_id, discord_guild_id, name, category, purpose)
                VALUES (${channelId}, ${guildId}, ${channelName}, 'env', ${'Set via DISCORD_CHANNEL env var'})
                ON CONFLICT (discord_channel_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    enabled = true
            `;
            // Remove stale rows: same name but different channel_id (env is source of truth)
            await sql`
                DELETE FROM ops_discord_channels
                WHERE name = ${channelName} AND discord_channel_id != ${channelId}
            `;
            channelCache.delete(channelName);
            log.info('Discord channel synced from env', { name: channelName, channelId });
        } catch (error) {
            log.error('Failed to sync discord channel env var', { name: channelName, channelId, error });
        }
    }
}

// In-memory cache: channelName -> { channelId, webhookUrl }
const channelCache = new Map<
    string,
    { discordChannelId: string; webhookUrl: string | null; enabled: boolean }
>();

/** Get the webhook URL for a named channel. Auto-provisions if missing. */
export async function getWebhookUrl(
    channelName: DiscordChannelName | string,
): Promise<string | null> {
    await syncEnvToDb();

    const cached = channelCache.get(channelName);
    if (cached) {
        if (!cached.enabled) return null;
        if (cached.webhookUrl) return cached.webhookUrl;
    }

    // DB lookup — existing schema uses webhook_id + webhook_token (not webhook_url)
    const [row] = await sql<
        [
            {
                discord_channel_id: string;
                webhook_id: string | null;
                webhook_token: string | null;
                enabled: boolean;
            },
        ]
    >`
        SELECT discord_channel_id, webhook_id, webhook_token, enabled
        FROM ops_discord_channels
        WHERE name = ${channelName}
    `;

    if (!row) {
        log.debug('Channel not configured', { channelName });
        return null;
    }

    if (!row.enabled) {
        channelCache.set(channelName, {
            discordChannelId: row.discord_channel_id,
            webhookUrl: null,
            enabled: false,
        });
        return null;
    }

    // Build URL from stored webhook credentials
    if (row.webhook_id && row.webhook_token) {
        const webhookUrl = buildWebhookUrl(row.webhook_id, row.webhook_token);
        channelCache.set(channelName, {
            discordChannelId: row.discord_channel_id,
            webhookUrl,
            enabled: true,
        });
        return webhookUrl;
    }

    // Auto-provision webhook via bot API
    const webhookUrl = await getOrCreateWebhook(row.discord_channel_id);
    if (webhookUrl) {
        // Parse id/token from URL and store back to DB
        const match = webhookUrl.match(/\/webhooks\/(\d+)\/(.+)$/);
        if (match) {
            await sql`
                UPDATE ops_discord_channels
                SET webhook_id = ${match[1]}, webhook_token = ${match[2]}
                WHERE name = ${channelName}
            `;
        }
        channelCache.set(channelName, {
            discordChannelId: row.discord_channel_id,
            webhookUrl,
            enabled: true,
        });
    }

    return webhookUrl;
}

/** Get both the webhook URL and Discord channel ID for a named channel. */
export async function getChannelInfo(
    channelName: DiscordChannelName | string,
): Promise<{ webhookUrl: string; channelId: string } | null> {
    const webhookUrl = await getWebhookUrl(channelName);
    if (!webhookUrl) return null;

    const cached = channelCache.get(channelName);
    if (!cached?.discordChannelId) return null;

    return { webhookUrl, channelId: cached.discordChannelId };
}

/** Resolve which channel a conversation format posts to. */
export function getChannelForFormat(
    format: ConversationFormat,
): DiscordChannelName {
    return FORMAT_CHANNEL_MAP[format];
}
