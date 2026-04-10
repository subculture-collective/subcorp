// /api/ops/newspaper/[date]/pdf — Serve newspaper PDF from DB
import { NextRequest, NextResponse } from 'next/server';
import { getEditionPdf } from '@/lib/ops/newspaper';
import { withRequestContext } from '@/lib/with-request-context';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ date: string }> },
) {
    return withRequestContext(req, async () => {
        const { date } = await params;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json(
                { error: 'Invalid date format. Use YYYY-MM-DD' },
                { status: 400 },
            );
        }

        const pdfBuffer = await getEditionPdf(date);
        if (!pdfBuffer) {
            return NextResponse.json(
                { error: 'PDF not available for this edition' },
                { status: 404 },
            );
        }

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="subcult-daily-${date}.pdf"`,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    });
}
