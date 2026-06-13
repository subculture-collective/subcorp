import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type postgres from 'postgres';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { ensureCsrfToken } from '@/lib/auth/csrf';
import type { User } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

// ─── Rate limiting (3 signups per IP per hour) ───
const signupRateMap = new Map<string, number[]>();
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX = 3;
const MAX_ENTRIES = 10_000;

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    );
}

function checkSignupRate(ip: string): boolean {
    const now = Date.now();
    const timestamps = signupRateMap.get(ip) ?? [];
    const recent = timestamps.filter(t => now - t < SIGNUP_WINDOW_MS);
    if (recent.length >= SIGNUP_MAX) return false;
    recent.push(now);
    if (signupRateMap.size > MAX_ENTRIES) signupRateMap.clear();
    signupRateMap.set(ip, recent);
    return true;
}

// Validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    if (!checkSignupRate(ip)) {
        return NextResponse.json(
            { error: 'Too many signups. Try again later.' },
            { status: 429 },
        );
    }

    let body: { email?: string; username?: string; password?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { email, username, password } = body;

    // Validate fields
    if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (!username || !USERNAME_RE.test(username)) {
        return NextResponse.json(
            { error: 'Username must be 3-30 characters (letters, numbers, underscores)' },
            { status: 400 },
        );
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
            { status: 400 },
        );
    }

    try {
        // Check for existing email/username
        const [existing] = await sql<[{ email_taken: boolean; username_taken: boolean }?]>`
            SELECT
                EXISTS(SELECT 1 FROM users WHERE email = ${email.toLowerCase()}) AS email_taken,
                EXISTS(SELECT 1 FROM users WHERE username = ${username.toLowerCase()}) AS username_taken
        `;

        if (existing?.email_taken) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }
        if (existing?.username_taken) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        // Create user + credentials in a transaction
        const passwordHash = await hashPassword(password);

        type Sql = ReturnType<typeof postgres>;
        const user = await sql.begin(async (txRaw) => {
            const tx = txRaw as unknown as Sql;
            const rows = await tx<[User]>`
                INSERT INTO users (email, username, role)
                VALUES (${email.toLowerCase()}, ${username.toLowerCase()}, 'visitor')
                RETURNING *
            `;
            const u = rows[0];

            await tx`
                INSERT INTO user_credentials (user_id, password_hash)
                VALUES (${u.id}, ${passwordHash})
            `;

            return u;
        }) as unknown as User;

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
