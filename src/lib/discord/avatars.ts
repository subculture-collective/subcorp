// Agent avatar URLs for Discord webhook messages
// Images live in public/avatars/{agentId}.png and are served by the Next.js app.
// Discord caches these aggressively — changes may take time to propagate.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://subcorp.subcult.tv';

/**
 * Get the public avatar URL for an agent.
 * Returns undefined for non-agent IDs (e.g. "system") so the webhook uses its default.
 */
export function getAgentAvatarUrl(agentId: string): string | undefined {
    if (agentId === 'system' || !agentId) return undefined;
    return `${BASE_URL}/avatars/${agentId}.png`;
}
