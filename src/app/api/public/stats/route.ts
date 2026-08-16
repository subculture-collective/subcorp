// /api/public/stats — Public-facing aggregate stats for the live audience page
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/public-events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Expose-Headers': 'Retry-After',
    };

    const ip = getClientIp(req);
    if (ip !== 'unknown' && !checkRateLimit(ip)) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Max 30 requests per minute.' },
            {
                status: 429,
                headers: {
                    ...corsHeaders,
                    'Retry-After': '60',
                },
            },
        );
    }

    try {
        const [events, missions, sessions, memories, epoch] = await Promise.all([
            sql<[{ count: number }]>`
                SELECT COUNT(*)::int as count FROM ops_agent_events
            `,
            sql<[{ count: number }]>`
                SELECT COUNT(*)::int as count
                FROM ops_missions
                WHERE status IN ('approved', 'running')
            `,
            sql<[{ count: number }]>`
                SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
            `,
            sql<{ agent_id: string; count: number }[]>`
                SELECT agent_id, COUNT(*)::int as count
                FROM ops_agent_memory
                WHERE superseded_by IS NULL
                  AND agent_id NOT LIKE 'oc-%'
                GROUP BY agent_id
            `,
            sql<[{ value: { started_at?: string } }?]>`
                SELECT value FROM ops_policy WHERE key = 'simulation_epoch'
            `,
        ]);

        return NextResponse.json(
            {
                totalEvents: events[0].count,
                activeMissions: missions[0].count,
                totalSessions: sessions[0].count,
                memoriesByAgent: Object.fromEntries(
                    memories.map(r => [r.agent_id, r.count]),
                ),
                simulationStartedAt: epoch?.[0]?.value?.started_at ?? null,
            },
            { headers: corsHeaders },
        );
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500, headers: corsHeaders },
        );
    }
}
