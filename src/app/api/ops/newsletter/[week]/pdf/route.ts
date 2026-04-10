// /api/ops/newsletter/[week]/pdf — Serve newsletter PDF from DB
import { NextRequest, NextResponse } from 'next/server';
import { getNewsletterPdf } from '@/lib/ops/newsletter';
import { withRequestContext } from '@/lib/with-request-context';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ week: string }> },
) {
    return withRequestContext(req, async () => {
        const { week } = await params;

        // Validate YYYY-Wnn format
        if (!/^\d{4}-W\d{2}$/.test(week)) {
            return NextResponse.json(
                { error: 'Invalid week format. Use YYYY-Wnn (e.g. 2026-W08)' },
                { status: 400 },
            );
        }

        const pdfBuffer = await getNewsletterPdf(week);
        if (!pdfBuffer) {
            return NextResponse.json(
                { error: 'PDF not available for this edition' },
                { status: 404 },
            );
        }

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="subcult-weekly-${week}.pdf"`,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    });
}
