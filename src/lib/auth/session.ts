import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import type { User, Session, AuthUser } from './types';

const SESSION_COOKIE = 'auth_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const SLIDING_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
    return randomBytes(32).toString('hex');
}

/** Create a new session for a user and set the cookie. */
export async function createSession(
    userId: string,
    ip?: string | null,
    userAgent?: string | null,
): Promise<{ session: Session; token: string }> {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    const [session] = await sql<[Session]>`
        INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
        VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${ip ?? null}, ${userAgent ?? null})
        RETURNING *
    `;

    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
    });

    return { session, token };
}

/** Validate the session cookie and return user + session if valid. */
export async function validateSession(): Promise<AuthUser | null> {
    const jar = await cookies();
    const cookie = jar.get(SESSION_COOKIE);
    if (!cookie?.value) return null;

    const tokenHash = hashToken(cookie.value);

    interface SessionUserRow {
        session_id: string;
        user_id: string;
        token_hash: string;
        expires_at: string;
        ip_address: string | null;
        user_agent: string | null;
        session_created_at: string;
        id: string;
        email: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
        created_at: string;
        updated_at: string;
    }

    const rows = await sql<SessionUserRow[]>`
        SELECT
            s.id as session_id, s.user_id, s.token_hash, s.expires_at,
            s.ip_address, s.user_agent, s.created_at as session_created_at,
            u.id, u.email, u.username, u.display_name, u.avatar_url,
            u.role, u.created_at, u.updated_at
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${tokenHash}
          AND s.expires_at > NOW()
    `;

    if (rows.length === 0) return null;

    const row = rows[0];

    // Sliding window: extend session if within 7 days of expiry
    const expiresAt = new Date(row.expires_at);
    const timeLeft = expiresAt.getTime() - Date.now();
    if (timeLeft < SLIDING_WINDOW) {
        const newExpiry = new Date(Date.now() + SESSION_MAX_AGE * 1000);
        await sql`
            UPDATE user_sessions
            SET expires_at = ${newExpiry.toISOString()}
            WHERE token_hash = ${tokenHash}
        `;
        // Refresh cookie maxAge too
        jar.set(SESSION_COOKIE, cookie.value, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE,
            secure: process.env.NODE_ENV === 'production',
        });
    }

    return {
        user: {
            id: row.id,
            email: row.email,
            username: row.username,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
            role: row.role as User['role'],
            created_at: row.created_at,
            updated_at: row.updated_at,
        },
        session: {
            id: row.session_id,
            user_id: row.user_id,
            token_hash: row.token_hash,
            expires_at: row.expires_at,
            ip_address: row.ip_address,
            user_agent: row.user_agent,
            created_at: row.session_created_at,
        },
    };
}

/** Revoke the current session and clear the cookie. */
export async function revokeSession(): Promise<void> {
    const jar = await cookies();
    const cookie = jar.get(SESSION_COOKIE);

    if (cookie?.value) {
        const tokenHash = hashToken(cookie.value);
        await sql`DELETE FROM user_sessions WHERE token_hash = ${tokenHash}`;
    }

    jar.delete(SESSION_COOKIE);
}

/** Revoke all sessions for a user. */
export async function revokeAllSessions(userId: string): Promise<void> {
    await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
}

/** Clean up expired sessions (call periodically). */
export async function cleanExpiredSessions(): Promise<number> {
    const result = await sql`
        DELETE FROM user_sessions WHERE expires_at < NOW()
    `;
    return result.count;
}
