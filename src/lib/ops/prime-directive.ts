// Prime Directive loader — reads the current directive from the workspace
import { execInToolbox } from '@/lib/tools/executor';
import { tenantCacheKey } from '@/lib/tenant/cache-key';

const DIRECTIVE_PATH = '/workspace/shared/prime-directive.md';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const directiveCache = new Map<string, { directive: string; ts: number }>();

/**
 * Load the prime directive from /workspace/shared/prime-directive.md.
 * Cached for 5 minutes to avoid hitting Docker exec on every session/turn.
 * Returns empty string if the file doesn't exist or can't be read.
 */
export async function loadPrimeDirective(): Promise<string> {
    const cacheKey = tenantCacheKey('prime-directive', DIRECTIVE_PATH);
    const cached = directiveCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.directive;
    }

    const result = await execInToolbox(`cat '${DIRECTIVE_PATH}' 2>/dev/null || echo ''`, 5_000);

    let directive: string;
    if (result.exitCode === 0 && result.stdout.trim()) {
        directive = result.stdout.trim();
    } else {
        directive = '';
    }
    directiveCache.set(cacheKey, { directive, ts: Date.now() });

    return directive;
}
