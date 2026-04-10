// /api/ops/rss — RSS feed management and news digest listing
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withRequestContext } from '@/lib/with-request-context';

const log = logger.child({ route: 'rss' });

export const dynamic = 'force-dynamic';

// GET — List feeds or digests (public, like roundtable GET)
export async function GET(req: NextRequest) {
    return withRequestContext(req, async () => {
        const type = req.nextUrl.searchParams.get('type') ?? 'digests';

        if (type === 'feeds') {
            const feeds = await sql`
                SELECT id, name, url, category, enabled, last_fetched_at, created_at
                FROM ops_rss_feeds
                ORDER BY created_at
            `;
            return NextResponse.json({ feeds });
        }

        // Default: digests
        const limit = Math.min(
            parseInt(req.nextUrl.searchParams.get('limit') ?? '7', 10),
            50,
        );
        const digests = await sql`
            SELECT id, slot, digest_date, summary, item_count, items, generated_by, created_at
            FROM ops_news_digests
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
        return NextResponse.json({ digests });
    });
}

// POST — Manage feeds (requires CRON_SECRET auth)
export async function POST(req: NextRequest) {
    return withRequestContext(req, async () => {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const body = await req.json();
            const action = body.action as string;

            switch (action) {
                case 'add': {
                    const { name, url, category } = body;
                    if (!name || !url) {
                        return NextResponse.json(
                            { error: 'name and url are required' },
                            { status: 400 },
                        );
                    }
                    const [feed] = await sql`
                        INSERT INTO ops_rss_feeds (name, url, category)
                        VALUES (${name}, ${url}, ${category ?? 'general'})
                        ON CONFLICT (url) DO NOTHING
                        RETURNING id, name, url, category
                    `;
                    if (!feed) {
                        return NextResponse.json(
                            { error: 'Feed URL already exists' },
                            { status: 409 },
                        );
                    }
                    log.info('RSS feed added', { name, url });
                    return NextResponse.json({ feed }, { status: 201 });
                }

                case 'remove': {
                    const { id } = body;
                    if (!id) {
                        return NextResponse.json(
                            { error: 'id is required' },
                            { status: 400 },
                        );
                    }
                    await sql`DELETE FROM ops_rss_feeds WHERE id = ${id}`;
                    log.info('RSS feed removed', { id });
                    return NextResponse.json({ ok: true });
                }

                case 'toggle': {
                    const { id, enabled } = body;
                    if (!id || typeof enabled !== 'boolean') {
                        return NextResponse.json(
                            { error: 'id and enabled (boolean) are required' },
                            { status: 400 },
                        );
                    }
                    await sql`
                        UPDATE ops_rss_feeds SET enabled = ${enabled} WHERE id = ${id}
                    `;
                    log.info('RSS feed toggled', { id, enabled });
                    return NextResponse.json({ ok: true });
                }

                default:
                    return NextResponse.json(
                        { error: 'Unknown action. Use: add, remove, toggle' },
                        { status: 400 },
                    );
            }
        } catch (err) {
            log.error('RSS API error', { error: err });
            return NextResponse.json(
                { error: (err as Error).message },
                { status: 500 },
            );
        }
    });
}
