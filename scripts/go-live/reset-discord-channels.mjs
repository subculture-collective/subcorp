#!/usr/bin/env node

// reset-discord-channels.mjs — Fast destructive Discord channel wipe.
//
// Recreates each enabled app-managed non-voice channel from its current Discord
// settings, updates .env + ops_discord_channels to point at the new channel,
// clears webhook credentials so the app recreates webhooks, then deletes the old
// channel.
//
// This avoids slow message-by-message deletion and Discord's old-message purge
// wall. It intentionally destroys channel history and changes channel IDs.
//
// Usage:
//   node scripts/go-live/reset-discord-channels.mjs --dry-run
//   node scripts/go-live/reset-discord-channels.mjs --yes --write-env

import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger.mjs';

dotenv.config({ path: ['.env.local', '.env'] });

const log = createLogger({ service: 'reset-discord-channels' });

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const MAX_RETRIES = 5;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const yes = args.has('--yes');
const writeEnv = args.has('--write-env');
const envFileArg = process.argv.find(arg => arg.startsWith('--env-file='));
const envFile = path.resolve(envFileArg?.split('=')[1] ?? '.env');

if (!dryRun && !yes) {
    log.fatal('Refusing destructive reset without --yes. Use --dry-run to preview.');
    process.exit(1);
}

if (!BOT_TOKEN) {
    log.fatal('Missing DISCORD_BOT_TOKEN');
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    log.fatal('Missing DATABASE_URL');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function discordFetch(route, options = {}) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(`${DISCORD_API}${route}`, {
            ...options,
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json',
                ...(options.reason ? { 'X-Audit-Log-Reason': encodeURIComponent(options.reason) } : {}),
                ...options.headers,
            },
        });

        if (res.status === 429) {
            const body = await res.json().catch(() => null);
            const retryAfter = body?.retry_after ?? res.headers.get('Retry-After');
            const retryMs = Math.ceil(Number(retryAfter || 1) * 1000);
            log.warn('Discord rate limited, backing off', { route, retryMs, attempt });
            await sleep(retryMs);
            continue;
        }

        const remaining = res.headers.get('X-RateLimit-Remaining');
        const resetAfter = res.headers.get('X-RateLimit-Reset-After');
        if (remaining === '0' && resetAfter) {
            const waitMs = Math.ceil(Number(resetAfter) * 1000);
            log.info('Discord bucket exhausted, pacing next request', { route, waitMs });
            await sleep(waitMs);
        }

        return res;
    }

    throw new Error(`discordFetch: exhausted retries for ${route}`);
}

async function readDiscordJson(route, context) {
    const res = await discordFetch(route);
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${context}: ${res.status} ${body.slice(0, 300)}`);
    }
    return res.json();
}

function buildCreateChannelPayload(source, fallbackName) {
    const payload = {
        name: source.name ?? fallbackName,
        type: source.type,
        topic: source.topic ?? undefined,
        nsfw: Boolean(source.nsfw),
        rate_limit_per_user: source.rate_limit_per_user ?? 0,
        parent_id: source.parent_id ?? undefined,
        permission_overwrites: source.permission_overwrites ?? [],
        position: source.position,
    };

    // Text/forum/media channel optional defaults. Only include when Discord
    // returned them; unsupported fields are ignored here rather than guessed.
    for (const key of [
        'default_auto_archive_duration',
        'default_thread_rate_limit_per_user',
        'default_sort_order',
        'default_forum_layout',
    ]) {
        if (source[key] !== undefined && source[key] !== null) {
            payload[key] = source[key];
        }
    }

    return payload;
}

async function createReplacementChannel(guildId, source, name) {
    const res = await discordFetch(`/guilds/${guildId}/channels`, {
        method: 'POST',
        body: JSON.stringify(buildCreateChannelPayload(source, name)),
        reason: `Subcorp reset recreate for #${name}`,
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Create replacement failed for ${name}: ${res.status} ${body.slice(0, 300)}`);
    }

    return res.json();
}

async function patchChannel(channelId, patch, name) {
    const res = await discordFetch(`/channels/${channelId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
        reason: `Subcorp reset positioning for #${name}`,
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        log.warn('Failed to patch replacement channel position/settings', {
            channel: name,
            status: res.status,
            body: body.slice(0, 300),
        });
        return false;
    }

    return true;
}

async function deleteChannel(channelId, name) {
    const res = await discordFetch(`/channels/${channelId}`, {
        method: 'DELETE',
        reason: `Subcorp reset delete old #${name}`,
    });

    if (!res.ok && res.status !== 404) {
        const body = await res.text().catch(() => '');
        throw new Error(`Delete failed for ${name}: ${res.status} ${body.slice(0, 300)}`);
    }
}

function envVarForChannel(name) {
    return `DISCORD_CHANNEL_${name.toUpperCase().replace(/-/g, '_')}`;
}

async function updateEnvFile(updates) {
    let content = await fs.readFile(envFile, 'utf8');

    for (const { name, newId } of updates) {
        const key = envVarForChannel(name);
        const line = `${key}=${newId}`;
        const re = new RegExp(`^${key}=.*$`, 'm');
        if (re.test(content)) {
            content = content.replace(re, line);
        } else {
            content = `${content.replace(/\n?$/, '\n')}${line}\n`;
        }
    }

    await fs.writeFile(envFile, content, 'utf8');
}

async function getTargetChannels() {
    return sql`
        SELECT id, name, discord_channel_id, discord_guild_id, category
        FROM ops_discord_channels
        WHERE enabled = true AND category != 'voice'
        ORDER BY name
    `;
}

function compareSnowflakesDesc(a, b) {
    const left = BigInt(a.id);
    const right = BigInt(b.id);
    if (left === right) return 0;
    return left > right ? -1 : 1;
}

async function getGuildChannels(guildId) {
    return readDiscordJson(`/guilds/${guildId}/channels`, `Fetch guild channels failed for ${guildId}`);
}

function findExistingReplacement(guildChannels, source, oldId) {
    const sameName = guildChannels
        .filter(channel =>
            channel.id !== oldId &&
            channel.name === source.name &&
            channel.type === source.type,
        )
        .sort(compareSnowflakesDesc);

    return {
        replacement: sameName[0] ?? null,
        extras: sameName.slice(1),
    };
}

async function main() {
    const targets = await getTargetChannels();
    log.info('Discord channel reset starting', {
        count: targets.length,
        dryRun,
        writeEnv,
        envFile: writeEnv ? envFile : undefined,
    });

    if (targets.length === 0) return;

    const plannedEnvUpdates = [];
    const resetRows = [];
    const guildChannelCache = new Map();

    for (const ch of targets) {
        const envKey = envVarForChannel(ch.name);
        const configuredEnvId = process.env[envKey];
        if (configuredEnvId && configuredEnvId !== ch.discord_channel_id) {
            log.warn('Env channel ID differs from DB row', {
                channel: ch.name,
                envKey,
                envId: configuredEnvId,
                dbId: ch.discord_channel_id,
            });
        }

        const source = await readDiscordJson(
            `/channels/${ch.discord_channel_id}`,
            `Fetch source channel failed for ${ch.name}`,
        );

        log.info('Planned channel reset', {
            channel: ch.name,
            oldId: ch.discord_channel_id,
            parentId: source.parent_id,
            position: source.position,
            type: source.type,
        });

        if (dryRun) continue;

        if (!guildChannelCache.has(ch.discord_guild_id)) {
            guildChannelCache.set(ch.discord_guild_id, await getGuildChannels(ch.discord_guild_id));
        }

        const guildChannels = guildChannelCache.get(ch.discord_guild_id);
        const existing = findExistingReplacement(guildChannels, source, ch.discord_channel_id);
        let replacement;
        const extraReplacementIds = existing.extras.map(channel => channel.id);
        try {
            if (existing.replacement) {
                replacement = existing.replacement;
                log.info('Reusing existing replacement channel from prior partial reset', {
                    channel: ch.name,
                    replacementId: replacement.id,
                    extraDuplicateCount: extraReplacementIds.length,
                });
            } else {
                replacement = await createReplacementChannel(ch.discord_guild_id, source, ch.name);
                guildChannels.push(replacement);
                log.info('Created replacement Discord channel', {
                    channel: ch.name,
                    oldId: ch.discord_channel_id,
                    newId: replacement.id,
                });
            }

            await patchChannel(
                replacement.id,
                {
                    parent_id: source.parent_id ?? null,
                    position: source.position,
                    topic: source.topic ?? null,
                    nsfw: Boolean(source.nsfw),
                    rate_limit_per_user: source.rate_limit_per_user ?? 0,
                },
                ch.name,
            );

            resetRows.push({
                rowId: ch.id,
                name: ch.name,
                oldId: ch.discord_channel_id,
                newId: replacement.id,
                extraReplacementIds,
            });
            plannedEnvUpdates.push({ name: ch.name, newId: replacement.id });
        } catch (error) {
            if (replacement?.id && !existing.replacement) {
                await deleteChannel(replacement.id, `${ch.name}-failed-replacement-cleanup`).catch(cleanupError => {
                    log.warn('Failed to clean up replacement channel after reset failure', {
                        channel: ch.name,
                        replacementId: replacement.id,
                        error: cleanupError,
                    });
                });
            }
            throw error;
        }

        await sleep(750);
    }

    if (dryRun) {
        log.info('Dry run complete; no channels changed');
        return;
    }

    if (writeEnv) {
        await updateEnvFile(plannedEnvUpdates);
        log.info('Updated Discord channel IDs in env file', { envFile, count: plannedEnvUpdates.length });
    } else {
        log.warn('Env file not updated. If DISCORD_CHANNEL_* vars are set, they can overwrite DB rows on app startup. Re-run with --write-env.');
    }

    await sql.begin(async tx => {
        for (const row of resetRows) {
            await tx`
                UPDATE ops_discord_channels
                SET discord_channel_id = ${row.newId}, webhook_id = NULL, webhook_token = NULL
                WHERE id = ${row.rowId}
            `;
        }
    });
    log.info('Updated ops_discord_channels and cleared webhook credentials', { count: resetRows.length });

    for (const row of resetRows) {
        await deleteChannel(row.oldId, row.name);
        log.info('Deleted old Discord channel', { channel: row.name, oldId: row.oldId, newId: row.newId });
        for (const duplicateId of row.extraReplacementIds) {
            await deleteChannel(duplicateId, `${row.name}-extra-duplicate`);
            log.info('Deleted extra duplicate Discord channel', { channel: row.name, duplicateId });
        }
        await sleep(750);
    }

    log.info('Discord channel reset complete. Restart app/worker so env + webhook caches reload.', {
        reset: resetRows.length,
    });
}

main()
    .catch(error => {
        log.fatal('Discord channel reset failed', { error });
        process.exit(1);
    })
    .finally(async () => {
        await sql.end();
    });
