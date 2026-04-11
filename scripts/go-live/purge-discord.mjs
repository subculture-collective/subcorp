#!/usr/bin/env node

// purge-discord.mjs — Delete all bot messages from Discord channels.
//
// Queries ops_discord_channels for enabled channels, then paginates through
// each channel's messages and deletes only messages owned by this bot or
// posted via webhooks:
//   - Messages < 14 days old: bulk-delete (2-100 per call)
//   - Messages >= 14 days old: individual DELETE
//
// Skips voice channels and exits gracefully if DISCORD_BOT_TOKEN is missing.
//
// Usage:
//   make purge-discord
//   DATABASE_URL="..." DISCORD_BOT_TOKEN="..." node scripts/go-live/purge-discord.mjs

import postgres from 'postgres';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger.mjs';

dotenv.config({ path: ['.env.local', '.env'] });
const log = createLogger({ service: 'purge-discord' });

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const MAX_RETRIES = 3;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
let cachedBotUserId = null;

if (!BOT_TOKEN) {
    log.warn('DISCORD_BOT_TOKEN not set, skipping purge');
    process.exit(0);
}

if (!process.env.DATABASE_URL) {
    log.fatal('Missing DATABASE_URL');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

// ─── Discord API helpers ───

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function discordFetch(path, options = {}) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(`${DISCORD_API}${path}`, {
            ...options,
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (res.status === 429) {
            const retryAfterHeader = res.headers.get('Retry-After');
            const retryMs = retryAfterHeader
                ? Math.ceil(parseFloat(retryAfterHeader) * 1000)
                : 2000 * (attempt + 1);
            log.warn('Rate limited, backing off', { retryMs, attempt, path });
            if (attempt < MAX_RETRIES) {
                await sleep(retryMs);
                continue;
            }
        }

        const remaining = res.headers.get('X-RateLimit-Remaining');
        const resetAfter = res.headers.get('X-RateLimit-Reset-After');
        if (remaining === '0' && resetAfter) {
            const waitMs = Math.ceil(parseFloat(resetAfter) * 1000);
            log.info('Discord bucket exhausted, pacing next request', {
                waitMs,
                path,
            });
            await sleep(waitMs);
        }

        return res;
    }
    throw new Error(`discordFetch: exhausted retries for ${path}`);
}

async function getBotUserId() {
    if (cachedBotUserId) return cachedBotUserId;

    const res = await discordFetch('/users/@me');
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
            `Failed to resolve bot identity: ${res.status} ${text.slice(0, 200)}`,
        );
    }

    const data = await res.json();
    cachedBotUserId = data.id;
    return cachedBotUserId;
}

function isOwnedByBot(message, botUserId) {
    return Boolean(message.webhook_id) || message.author?.id === botUserId;
}

// ─── Message fetching ───

async function fetchAllMessages(channelId) {
    const messages = [];
    let before = undefined;

    while (true) {
        const query = before
            ? `?limit=100&before=${before}`
            : '?limit=100';

        const res = await discordFetch(`/channels/${channelId}/messages${query}`);

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            log.warn('Failed to fetch messages', {
                status: res.status,
                channelId,
                body: text.slice(0, 200),
            });
            break;
        }

        const batch = await res.json();
        if (batch.length === 0) break;

        messages.push(...batch);
        before = batch[batch.length - 1].id;

        // Small delay between pagination calls
        await sleep(300);
    }

    return messages;
}

// ─── Deletion ───

async function bulkDelete(channelId, messageIds) {
    const res = await discordFetch(`/channels/${channelId}/messages/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ messages: messageIds }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        log.warn('Bulk delete failed', {
            status: res.status,
            channelId,
            count: messageIds.length,
            body: text.slice(0, 200),
        });
        return false;
    }
    return true;
}

async function deleteMessage(channelId, messageId) {
    const res = await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
        method: 'DELETE',
    });

    if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => '');
        log.warn('Delete failed', {
            status: res.status,
            channelId,
            messageId,
            body: text.slice(0, 200),
        });
        return false;
    }
    return true;
}

async function purgeChannel(channelId, channelName) {
    const botUserId = await getBotUserId();
    const messages = (await fetchAllMessages(channelId)).filter(message =>
        isOwnedByBot(message, botUserId),
    );
    if (messages.length === 0) {
        log.info('No messages', { channel: channelName });
        return 0;
    }

    const now = Date.now();
    const recent = []; // < 14 days — eligible for bulk delete
    const old = [];    // >= 14 days — individual delete only

    for (const msg of messages) {
        const age = now - new Date(msg.timestamp).getTime();
        if (age < FOURTEEN_DAYS_MS) {
            recent.push(msg.id);
        } else {
            old.push(msg.id);
        }
    }

    let deleted = 0;

    // Bulk delete recent messages in batches of 100
    for (let i = 0; i < recent.length; i += 100) {
        const batch = recent.slice(i, i + 100);
        if (batch.length < 2) {
            // Bulk delete requires 2-100 IDs; delete single individually
            for (const id of batch) {
                if (await deleteMessage(channelId, id)) deleted++;
                await sleep(400);
            }
        } else {
            if (await bulkDelete(channelId, batch)) {
                deleted += batch.length;
            }
            await sleep(1200); // Bulk delete has stricter rate limits
        }
    }

    // Individual delete for old messages
    for (const id of old) {
        if (await deleteMessage(channelId, id)) deleted++;
        await sleep(400); // ~2.5 req/s — safe under 5/s limit
    }

    log.info('Purged channel', {
        channel: channelName,
        total: messages.length,
        deleted,
        recent: recent.length,
        old: old.length,
    });

    return deleted;
}

// ─── Main ───

async function main() {
    log.info('Starting Discord purge');

    try {
        // Query enabled non-voice channels from DB
        const channels = await sql`
            SELECT name, discord_channel_id, category
            FROM ops_discord_channels
            WHERE enabled = true AND category != 'voice'
            ORDER BY name
        `;

        log.info('Channels to purge', { count: channels.length });

        let totalDeleted = 0;
        for (const ch of channels) {
            log.info('Purging channel', { channel: ch.name, id: ch.discord_channel_id, category: ch.category });
            const count = await purgeChannel(ch.discord_channel_id, ch.name);
            totalDeleted += count;
            await sleep(750);
        }

        log.info('Purge complete', { totalDeleted, channels: channels.length });
    } catch (err) {
        log.fatal('Purge failed', { error: err });
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
