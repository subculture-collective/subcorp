import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    generateState,
    generatePkceVerifier,
    generatePkceChallenge,
    getOAuthRedirectUrl,
    type OAuthProvider,
} from '@/lib/auth/oauth';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS = new Set<OAuthProvider>(['github', 'discord', 'openai']);
const STATE_COOKIE = 'oauth_state';
const PKCE_COOKIE = 'oauth_pkce';

/** Providers that use PKCE (public clients, no client_secret) */
const PKCE_PROVIDERS = new Set<OAuthProvider>(['openai']);

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider } = await params;

    if (!VALID_PROVIDERS.has(provider as OAuthProvider)) {
        return NextResponse.json(
            { error: `Unknown provider: ${provider}` },
            { status: 400 },
        );
    }

    const state = generateState();
    const usePkce = PKCE_PROVIDERS.has(provider as OAuthProvider);
    const jar = await cookies();
    const cookieOpts = {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 600,
        secure: process.env.NODE_ENV === 'production',
    };

    let codeChallenge: string | undefined;
    if (usePkce) {
        const verifier = generatePkceVerifier();
        codeChallenge = generatePkceChallenge(verifier);
        jar.set(PKCE_COOKIE, verifier, cookieOpts);
    }

    const redirectUrl = getOAuthRedirectUrl(provider as OAuthProvider, state, codeChallenge);

    if (!redirectUrl) {
        return NextResponse.json(
            { error: `${provider} OAuth not configured` },
            { status: 500 },
        );
    }

    // Store state in cookie for verification in callback
    jar.set(STATE_COOKIE, state, cookieOpts);

    return NextResponse.redirect(redirectUrl);
}
