// RSS News Digest — fetch feeds, store items, synthesize briefings as Mux
import { XMLParser } from 'fast-xml-parser';
import { sql, jsonb } from '@/lib/db';
import { llmGenerate } from '@/lib/llm/client';
import { getVoice } from '@/lib/roundtable/voices';
import { emitEvent } from '@/lib/ops/events';
import { postToWebhook } from '@/lib/discord/client';
import { getWebhookUrl } from '@/lib/discord/channels';
import { getAgentAvatarUrl } from '@/lib/discord/avatars';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'rss' });

// ─── Types ───

interface RssFeed {
    id: string;
    name: string;
    url: string;
    category: string;
}

interface RssItem {
    title: string;
    description: string | null;
    link: string | null;
    guid: string;
    pubDate: Date | null;
}

export interface NewsDigestEntry {
    id: string;
    slot: string;
    digest_date: string;
    summary: string;
    item_count: number;
    items: { title: string; link: string | null; feed_name: string; category: string }[];
    generated_by: string;
    created_at: string;
}

// ─── Helpers ───

/** Strip HTML tags from RSS descriptions. */
export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
});

/** Parse RSS/Atom feed XML into items. */
function parseRssFeed(xml: string): RssItem[] {
    const parsed = parser.parse(xml);
    const items: RssItem[] = [];

    // RSS 2.0: rss > channel > item
    const rssItems = parsed?.rss?.channel?.item;
    if (rssItems) {
        const arr = Array.isArray(rssItems) ? rssItems : [rssItems];
        for (const item of arr) {
            items.push({
                title: String(item.title ?? '').trim(),
                description: item.description ? stripHtml(String(item.description)) : null,
                link: item.link ? String(item.link).trim() : null,
                guid: String(item.guid?.['#text'] ?? item.guid ?? item.link ?? item.title ?? '').trim(),
                pubDate: item.pubDate ? new Date(item.pubDate) : null,
            });
        }
        return items;
    }

    // Atom: feed > entry
    const atomEntries = parsed?.feed?.entry;
    if (atomEntries) {
        const arr = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
        for (const entry of arr) {
            const link = entry.link?.['@_href'] ?? (Array.isArray(entry.link) ? entry.link[0]?.['@_href'] : null);
            items.push({
                title: String(entry.title?.['#text'] ?? entry.title ?? '').trim(),
                description: entry.summary ? stripHtml(String(entry.summary?.['#text'] ?? entry.summary)) : null,
                link: link ? String(link).trim() : null,
                guid: String(entry.id ?? link ?? entry.title ?? '').trim(),
                pubDate: entry.updated ? new Date(entry.updated) : (entry.published ? new Date(entry.published) : null),
            });
        }
    }

    return items;
}

// ─── Public: fetch all feeds ───

/**
 * Fetch all enabled RSS feeds, parse items, and upsert into ops_rss_items.
 * Returns the count of new items inserted.
 */
export async function fetchAllFeeds(): Promise<number> {
    const feeds = await sql<RssFeed[]>`
        SELECT id, name, url, category
        FROM ops_rss_feeds
        WHERE enabled = true
    `;

    if (feeds.length === 0) return 0;

    let totalNew = 0;

    for (const feed of feeds) {
        try {
            const response = await fetch(feed.url, {
                headers: { 'User-Agent': 'SubcultCorp/1.0 RSS Fetcher' },
                signal: AbortSignal.timeout(15_000),
            });

            if (!response.ok) {
                log.warn('RSS fetch failed', { feed: feed.name, status: response.status });
                continue;
            }

            const xml = await response.text();
            const items = parseRssFeed(xml);

            for (const item of items) {
                if (!item.title || !item.guid) continue;

                const result = await sql`
                    INSERT INTO ops_rss_items (feed_id, guid, title, description, link, pub_date)
                    VALUES (
                        ${feed.id},
                        ${item.guid},
                        ${item.title},
                        ${item.description},
                        ${item.link},
                        ${item.pubDate?.toISOString() ?? null}
                    )
                    ON CONFLICT (feed_id, guid) DO NOTHING
                    RETURNING id
                `;
                if (result.length > 0) totalNew++;
            }

            // Update last_fetched_at
            await sql`
                UPDATE ops_rss_feeds SET last_fetched_at = NOW() WHERE id = ${feed.id}
            `;
        } catch (err) {
            log.warn('RSS feed error', { feed: feed.name, error: (err as Error).message });
        }
    }

    if (totalNew > 0) {
        log.info('RSS: fetched new items', { count: totalNew });
    }

    return totalNew;
}

// ─── Public: generate news digest ───

/**
 * Generate a news digest for the given slot (morning/evening).
 * Dedup check: skips if digest already exists for today+slot.
 * Returns digest ID on success, null if skipped.
 */
export async function generateNewsDigest(
    slot: 'morning' | 'evening',
): Promise<string | null> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Dedup check
    const existing = await sql<{ id: string }[]>`
        SELECT id FROM ops_news_digests
        WHERE digest_date = ${today} AND slot = ${slot}
    `;
    if (existing.length > 0) {
        log.debug('News digest already exists', { date: today, slot });
        return null;
    }

    // Query recent items: last 12h for morning, since morning digest for evening
    let since: string;
    if (slot === 'morning') {
        since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    } else {
        // Since morning digest, or last 12h if no morning digest
        const morningDigest = await sql<{ created_at: string }[]>`
            SELECT created_at FROM ops_news_digests
            WHERE digest_date = ${today} AND slot = 'morning'
        `;
        since = morningDigest.length > 0
            ? morningDigest[0].created_at
            : new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    }

    const recentItems = await sql<{
        title: string;
        description: string | null;
        link: string | null;
        feed_name: string;
        category: string;
    }[]>`
        SELECT
            ri.title,
            ri.description,
            ri.link,
            rf.name AS feed_name,
            rf.category
        FROM ops_rss_items ri
        JOIN ops_rss_feeds rf ON rf.id = ri.feed_id
        WHERE ri.created_at >= ${since}
        ORDER BY ri.pub_date DESC NULLS LAST
        LIMIT 30
    `;

    if (recentItems.length < 3) {
        log.debug('Not enough RSS items for digest', { count: recentItems.length, slot });
        return null;
    }

    // Build compact prompt
    const itemLines = recentItems.map(
        (item) => `- [${item.category}] ${item.title}${item.description ? ': ' + item.description.slice(0, 200) : ''}`,
    ).join('\n');

    // Get Mux's voice
    const muxVoice = getVoice('mux');
    const systemDirective = muxVoice?.systemDirective
        ?? 'You are Mux, the information officer of a multi-agent collective.';

    const summary = await llmGenerate({
        messages: [
            { role: 'system', content: systemDirective },
            {
                role: 'user',
                content: `Write a concise ${slot} news briefing from today's RSS feed items. Group by theme, highlight what matters most for an AI-focused tech collective. Be concise and informative.\n\nItems:\n${itemLines}\n\nWrite a 2-4 paragraph briefing.`,
            },
        ],
        temperature: 0.5,
        maxTokens: 2000,
        trackingContext: { agentId: 'mux', context: 'news_digest' },
    });

    if (!summary) {
        log.warn('LLM returned empty summary for news digest', { slot });
        return null;
    }

    // Store item metadata
    const itemMeta = recentItems.map((item) => ({
        title: item.title,
        link: item.link,
        feed_name: item.feed_name,
        category: item.category,
    }));

    const [inserted] = await sql<{ id: string }[]>`
        INSERT INTO ops_news_digests (slot, digest_date, summary, item_count, items, generated_by)
        VALUES (${slot}, ${today}, ${summary}, ${recentItems.length}, ${jsonb(itemMeta)}, 'mux')
        RETURNING id
    `;

    // Post to Discord (fire-and-forget)
    postToDiscord(slot, summary, recentItems.length).catch((err) =>
        log.warn('Discord news digest post failed', { error: (err as Error).message }),
    );

    // Emit event
    await emitEvent({
        agent_id: 'mux',
        kind: 'news_digest_generated',
        title: `${slot.charAt(0).toUpperCase() + slot.slice(1)} news digest`,
        summary: `${recentItems.length} items synthesized`,
        tags: ['digest', 'news', 'mux', slot],
        metadata: { digest_id: inserted.id, date: today, slot, item_count: recentItems.length },
    });

    log.info('News digest generated', { slot, date: today, items: recentItems.length, id: inserted.id });
    return inserted.id;
}

// ─── Discord posting ───

async function postToDiscord(slot: string, summary: string, itemCount: number): Promise<void> {
    const webhookUrl = await getWebhookUrl('news-digest');
    if (!webhookUrl) return;

    const slotLabel = slot === 'morning' ? 'Morning' : 'Evening';

    await postToWebhook({
        webhookUrl,
        username: 'Mux',
        avatarUrl: getAgentAvatarUrl('mux'),
        embeds: [{
            title: `${slotLabel} News Briefing`,
            description: summary.slice(0, 4000), // Discord embed limit
            color: 0x6366f1, // Mux's indigo
            footer: { text: `${itemCount} sources synthesized` },
            timestamp: new Date().toISOString(),
        }],
    });
}
