import { NextResponse } from 'next/server';
import { revokeSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
    await revokeSession();
    return NextResponse.json({ ok: true });
}
