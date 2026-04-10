// /api/ops/newsletter — List newsletter editions (public)
import { NextRequest, NextResponse } from 'next/server';
import { listNewsletterEditions } from '@/lib/ops/newsletter';
import { withRequestContext } from '@/lib/with-request-context';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withRequestContext(req, async () => {
        const limit = Math.min(
            parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10),
            100,
        );
        const editions = await listNewsletterEditions(limit);
        return NextResponse.json({ editions });
    });
}
