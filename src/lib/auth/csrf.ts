import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE = 'auth_csrf';
const CSRF_HEADER = 'x-csrf-token';

/** Ensure a CSRF token cookie exists. Returns the token value. */
export async function ensureCsrfToken(): Promise<string> {
    const jar = await cookies();
    const existing = jar.get(CSRF_COOKIE);
    if (existing?.value) return existing.value;

    const token = randomBytes(32).toString('hex');
    jar.set(CSRF_COOKIE, token, {
        httpOnly: false, // JS-readable for double-submit
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
    });
    return token;
}

/** Validate double-submit CSRF token: cookie value must match header value. */
export async function validateCsrf(request: Request): Promise<boolean> {
    const jar = await cookies();
    const cookieToken = jar.get(CSRF_COOKIE)?.value;
    const headerToken = request.headers.get(CSRF_HEADER);

    if (!cookieToken || !headerToken) return false;
    return cookieToken === headerToken;
}
