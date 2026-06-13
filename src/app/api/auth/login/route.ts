import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword, DUMMY_HASH } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { ensureCsrfToken } from '@/lib/auth/csrf';
import type { User } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

// ─── Rate limiting (5 login attempts per IP per 15 min) ───
const loginRateMap = new Map<string, number[]>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 5;
const MAX_ENTRIES = 10_000;

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    );
}

function checkLoginRate(ip: string): boolean {
    const now = Date.now();
    const timestamps = loginRateMap.get(ip) ?? [];
    const recent = timestamps.filter(t => now - t < LOGIN_WINDOW_MS);
    if (recent.length >= LOGIN_MAX) return false;
    recent.push(now);
    if (loginRateMap.size > MAX_ENTRIES) loginRateMap.clear();
    loginRateMap.set(ip, recent);
    return true;
}

export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    if (!checkLoginRate(ip)) {
        return NextResponse.json(
            { error: 'Too many login attempts. Try again later.' },
            { status: 429 },
        );
    }

    let body: { email?: string; password?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json(
            { error: 'Email and password are required' },
            { status: 400 },
        );
    }

    try {
        // Look up user + credentials
        const rows = await sql<(User & { password_hash: string })[]>`
            SELECT u.*, c.password_hash
            FROM users u
            JOIN user_credentials c ON c.user_id = u.id
            WHERE u.email = ${email.toLowerCase()}
        `;

        const user = rows[0];

        // Timing-safe: always run argon2 even if user not found
        const hash = user?.password_hash ?? DUMMY_HASH;
        const valid = await verifyPassword(hash, password);

        if (!user || !valid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 },
            );
        }

        // Create session
        const userAgent = req.headers.get('user-agent');
        await createSession(user.id, ip, userAgent);
        await ensureCsrfToken();

        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                role: user.role,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}
