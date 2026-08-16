// /api/ops/rebellion — Query rebellion state for all agents or a specific agent
import { NextRequest, NextResponse } from 'next/server';
import { getRebellingAgents } from '@/lib/ops/rebellion';
import { withRequestContext } from '@/lib/with-request-context';
import { requireOpsRead } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withRequestContext(req, async () => {
        const authResult = await requireOpsRead();
        if (authResult instanceof NextResponse) return authResult;

        const rebels = await getRebellingAgents();
        return NextResponse.json({
            rebels,
            count: rebels.length,
        });
    });
}
