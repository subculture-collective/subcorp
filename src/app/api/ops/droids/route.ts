// /api/ops/droids — List active droid sessions (public, no auth)
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const rows = await sql`
            SELECT
                source_id AS droid_id,
                agent_id  AS spawned_by,
                prompt    AS task,
                status,
                created_at
            FROM ops_agent_sessions
            WHERE source = 'droid'
              AND status IN ('pending', 'running')
            ORDER BY created_at DESC
            LIMIT 10
        `;

        return NextResponse.json({ droids: rows });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}
