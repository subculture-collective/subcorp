import { randomBytes, createHash } from 'crypto';
import type postgres from 'postgres';
import { sql } from '@/lib/db';
import { createSession } from './session';
import type { User } from './types';

type Sql = ReturnType<typeof postgres>;

// ─── PKCE helpers ───

export function generatePkceVerifier(): string {
    return randomBytes(32).toString('base64url');
}

export function generatePkceChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
}

// ─── Provider definitions ───

export type OAuthProvider = 'github' | 'discord' | 'openai';

interface ProviderConfig {
    authorizeUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scopes: string;
    clientId: string;
    clientSecret: string;
    usePkce?: boolean;
    /** Extract email, name, avatar, provider_account_id from userinfo response */
    extractUser: (data: Record<string, unknown>) => {
        email: string;
        name: string | null;
        avatar: string | null;
        providerId: string;
    };
}

function getProviderConfig(provider: OAuthProvider): ProviderConfig | null {
    switch (provider) {
        case 'github':
            return {
                authorizeUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                userInfoUrl: 'https://api.github.com/user',
                scopes: 'user:email',
                clientId: process.env.GITHUB_CLIENT_ID ?? '',
                clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
                extractUser: (data) => ({
                    email: (data.email as string) ?? '',
                    name: (data.name as string) ?? (data.login as string) ?? null,
                    avatar: (data.avatar_url as string) ?? null,
                    providerId: String(data.id),
                }),
            };

        case 'discord':
            return {
                authorizeUrl: 'https://discord.com/api/oauth2/authorize',
                tokenUrl: 'https://discord.com/api/oauth2/token',
                userInfoUrl: 'https://discord.com/api/users/@me',
                scopes: 'identify email',
                clientId: process.env.DISCORD_CLIENT_ID ?? '',
                clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
                extractUser: (data) => ({
                    email: (data.email as string) ?? '',
                    name: (data.global_name as string) ?? (data.username as string) ?? null,
                    avatar: data.avatar
                        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
                        : null,
                    providerId: String(data.id),
                }),
            };

        case 'openai':
            return {
                authorizeUrl: 'https://auth.openai.com/authorize',
                tokenUrl: 'https://auth0.openai.com/oauth/token',
                userInfoUrl: 'https://auth0.openai.com/userinfo',
                scopes: 'openid profile email offline_access',
                clientId: process.env.OPENAI_CLIENT_ID ?? '',
                clientSecret: '', // public client — uses PKCE instead
                usePkce: true,
                extractUser: (data) => ({
                    email: (data.email as string) ?? '',
                    name: (data.name as string) ?? (data.nickname as string) ?? null,
                    avatar: (data.picture as string) ?? null,
                    providerId: String(data.sub),
                }),
            };

        default:
            return null;
    }
}

// ─── OAuth helpers ───

export function generateState(): string {
    return randomBytes(32).toString('hex');
}

export function getOAuthRedirectUrl(
    provider: OAuthProvider,
    state: string,
    codeChallenge?: string,
): string | null {
    const config = getProviderConfig(provider);
    if (!config || !config.clientId) return null;

    const callbackUrl = `${process.env.AUTH_REDIRECT_BASE_URL}/api/auth/oauth/${provider}/callback`;

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: callbackUrl,
        state,
        scope: config.scopes,
        response_type: 'code',
    });

    if (codeChallenge) {
        params.set('code_challenge', codeChallenge);
        params.set('code_challenge_method', 'S256');
    }

    return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCode(
    provider: OAuthProvider,
    code: string,
    codeVerifier?: string,
): Promise<{
    email: string;
    name: string | null;
    avatar: string | null;
    providerId: string;
} | null> {
    const config = getProviderConfig(provider);
    if (!config) return null;

    const callbackUrl = `${process.env.AUTH_REDIRECT_BASE_URL}/api/auth/oauth/${provider}/callback`;

    // Build token request body — PKCE uses code_verifier, confidential clients use client_secret
    const tokenBody: Record<string, string> = {
        client_id: config.clientId,
        code,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
    };

    if (config.usePkce && codeVerifier) {
        tokenBody.code_verifier = codeVerifier;
    } else {
        tokenBody.client_secret = config.clientSecret;
    }

    // Exchange code for token
    const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body: new URLSearchParams(tokenBody),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return null;

    // Fetch user info
    const userRes = await fetch(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = (await userRes.json()) as Record<string, unknown>;

    const extracted = config.extractUser(userData);

    // GitHub: email might be private, fetch from emails endpoint
    if (provider === 'github' && !extracted.email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails = (await emailsRes.json()) as {
            email: string;
            primary: boolean;
            verified: boolean;
        }[];
        const primary = emails.find(e => e.primary && e.verified);
        if (primary) extracted.email = primary.email;
    }

    return extracted.email ? extracted : null;
}

/**
 * Link an OAuth account to an existing user, or create a new user.
 * Returns the user and creates a session.
 */
export async function linkOrCreateUser(
    provider: OAuthProvider,
    providerData: {
        email: string;
        name: string | null;
        avatar: string | null;
        providerId: string;
    },
    ip?: string | null,
    userAgent?: string | null,
): Promise<User> {
    // Check if this OAuth account is already linked
    const [existingLink] = await sql<[{ user_id: string }?]>`
        SELECT user_id FROM user_oauth_accounts
        WHERE provider = ${provider} AND provider_account_id = ${providerData.providerId}
    `;

    if (existingLink) {
        // Existing linked account — just return the user
        const [user] = await sql<[User]>`
            SELECT * FROM users WHERE id = ${existingLink.user_id}
        `;
        await createSession(user.id, ip, userAgent);
        return user;
    }

    // Check if a user with this email exists
    const [existingUser] = await sql<[User?]>`
        SELECT * FROM users WHERE email = ${providerData.email.toLowerCase()}
    `;

    if (existingUser) {
        // Link OAuth account to existing user
        await sql`
            INSERT INTO user_oauth_accounts (user_id, provider, provider_account_id)
            VALUES (${existingUser.id}, ${provider}, ${providerData.providerId})
        `;

        // Update avatar if they don't have one
        if (!existingUser.avatar_url && providerData.avatar) {
            await sql`
                UPDATE users SET avatar_url = ${providerData.avatar}, updated_at = NOW()
                WHERE id = ${existingUser.id}
            `;
        }

        await createSession(existingUser.id, ip, userAgent);
        return existingUser;
    }

    // Create new user
    const username = providerData.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30).toLowerCase();

    // Ensure unique username
    let finalUsername = username;
    let suffix = 1;
    while (true) {
        const [taken] = await sql<[{ exists: boolean }]>`
            SELECT EXISTS(SELECT 1 FROM users WHERE username = ${finalUsername}) AS exists
        `;
        if (!taken.exists) break;
        finalUsername = `${username.slice(0, 26)}_${suffix++}`;
    }

    const user = await sql.begin(async (txRaw) => {
        const tx = txRaw as unknown as Sql;
        const rows = await tx<[User]>`
            INSERT INTO users (email, username, display_name, avatar_url, role)
            VALUES (
                ${providerData.email.toLowerCase()},
                ${finalUsername},
                ${providerData.name},
                ${providerData.avatar},
                'visitor'
            )
            RETURNING *
        `;
        const u = rows[0];

        await tx`
            INSERT INTO user_oauth_accounts (user_id, provider, provider_account_id)
            VALUES (${u.id}, ${provider}, ${providerData.providerId})
        `;

        return u;
    }) as unknown as User;

    await createSession(user.id, ip, userAgent);
    return user;
}
