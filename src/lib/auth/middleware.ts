import { NextResponse } from 'next/server';
import { validateSession } from './session';
import type { AuthUser, UserRole } from './types';

/** Require authenticated user. Returns AuthUser or 401 response. */
export async function requireAuth(): Promise<
    AuthUser | NextResponse
> {
    const auth = await validateSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return auth;
}

/** Require authenticated user with a specific role. */
export async function requireRole(
    ...roles: UserRole[]
): Promise<AuthUser | NextResponse> {
    const result = await requireAuth();
    if (result instanceof NextResponse) return result;

    if (!roles.includes(result.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return result;
}

/** Optional auth — returns AuthUser if logged in, null otherwise. */
export async function optionalAuth(): Promise<AuthUser | null> {
    return validateSession();
}

/**
 * Require user auth OR CRON_SECRET bearer token.
 * Used for endpoints that both dashboard users and workers/cron call.
 */
export async function requireAuthOrCron(
    request: Request,
): Promise<AuthUser | 'cron' | NextResponse> {
    // Check user session first
    const auth = await validateSession();
    if (auth) return auth;

    // Fall back to CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        return 'cron';
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
