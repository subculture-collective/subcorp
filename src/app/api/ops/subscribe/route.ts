// POST /api/ops/subscribe — public email subscription endpoint
import { NextRequest, NextResponse } from 'next/server';
import { subscribe } from '@/lib/ops/subscribers';
import { withRequestContext } from '@/lib/with-request-context';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PLANS = new Set(['daily', 'weekly', 'both']);

export async function POST(req: NextRequest) {
    return withRequestContext(req, async () => {
        try {
            const body = await req.json();
            const { email, plan = 'both', source = 'website' } = body ?? {};

            if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
                return NextResponse.json(
                    { error: 'Invalid email address' },
                    { status: 400 },
                );
            }

            if (!VALID_PLANS.has(plan)) {
                return NextResponse.json(
                    { error: 'Plan must be daily, weekly, or both' },
                    { status: 400 },
                );
            }

            const result = await subscribe({
                email: email.toLowerCase().trim(),
                plan,
                source: String(source).slice(0, 50),
            });

            return NextResponse.json({ ok: true, isNew: result.isNew });
        } catch (err) {
            console.error('[subscribe] error:', err);
            return NextResponse.json(
                { error: 'Something went wrong' },
                { status: 500 },
            );
        }
    });
}
