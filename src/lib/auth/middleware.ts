import { NextResponse } from 'next/server';
import { validateSession } from './session';
import type { AuthUser, UserRole } from './types';

function unauthorized(): NextResponse {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

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

/** Require authenticated user with member/admin access for ops reads. */
export async function requireOpsRead(): Promise<AuthUser | NextResponse> {
    return requireRole('member', 'admin');
}

/** Require CRON_SECRET bearer token. Fails closed if CRON_SECRET is unset. */
export async function requireCron(
    request: Request,
): Promise<'cron' | NextResponse> {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return unauthorized();

    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) return 'cron';

    return unauthorized();
}

/** Require authenticated user with any of the given roles, or CRON_SECRET. */
export async function requireRoleOrCron(
    request: Request,
    ...roles: UserRole[]
): Promise<AuthUser | 'cron' | NextResponse> {
    const auth = await validateSession();
    if (auth && roles.includes(auth.user.role)) return auth;

    return requireCron(request);
}

/** Require admin user or CRON_SECRET. */
export async function requireOpsAdminOrCron(
    request: Request,
): Promise<AuthUser | 'cron' | NextResponse> {
    return requireRoleOrCron(request, 'admin');
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

    return requireCron(request);
}
