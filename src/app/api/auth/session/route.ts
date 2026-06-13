import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await validateSession();

    if (!auth) {
        return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
        authenticated: true,
        user: {
            id: auth.user.id,
            username: auth.user.username,
            display_name: auth.user.display_name,
            avatar_url: auth.user.avatar_url,
            role: auth.user.role,
        },
    });
}
