import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    exchangeCode,
    linkOrCreateUser,
    type OAuthProvider,
} from '@/lib/auth/oauth';
import { ensureCsrfToken } from '@/lib/auth/csrf';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS = new Set<OAuthProvider>(['github', 'discord', 'openai']);
const STATE_COOKIE = 'oauth_state';
const PKCE_COOKIE = 'oauth_pkce';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider } = await params;

    if (!VALID_PROVIDERS.has(provider as OAuthProvider)) {
        return NextResponse.redirect(new URL('/stage?auth_error=unknown_provider', req.url));
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Provider error (user denied, etc.)
    if (error) {
        return NextResponse.redirect(new URL('/stage?auth_error=provider_denied', req.url));
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL('/stage?auth_error=missing_params', req.url));
    }

    // Verify state
    const jar = await cookies();
    const savedState = jar.get(STATE_COOKIE)?.value;
    jar.delete(STATE_COOKIE);

    // Read + clear PKCE verifier cookie (if present)
    const codeVerifier = jar.get(PKCE_COOKIE)?.value;
    if (codeVerifier) jar.delete(PKCE_COOKIE);

    if (!savedState || savedState !== state) {
        return NextResponse.redirect(new URL('/stage?auth_error=invalid_state', req.url));
    }

    try {
        // Exchange code for user info
        const providerData = await exchangeCode(provider as OAuthProvider, code, codeVerifier);

        if (!providerData) {
            return NextResponse.redirect(new URL('/stage?auth_error=exchange_failed', req.url));
        }

        // Link or create user + create session
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
            req.headers.get('x-real-ip') ??
            null;
        const userAgent = req.headers.get('user-agent');

        await linkOrCreateUser(
            provider as OAuthProvider,
            providerData,
            ip,
            userAgent,
        );

        await ensureCsrfToken();

        return NextResponse.redirect(new URL('/stage', req.url));
    } catch {
        return NextResponse.redirect(new URL('/stage?auth_error=server_error', req.url));
    }
}
