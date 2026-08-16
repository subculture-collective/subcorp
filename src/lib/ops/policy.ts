// Policy store with 30-second TTL cache
import { createHash } from 'crypto';
import { sql, jsonb } from '@/lib/db';
import { tenantCacheKey } from '@/lib/tenant/cache-key';

const CACHE_TTL_MS = 30_000;
const policyCache = new Map<
    string,
    { value: Record<string, unknown>; ts: number }
>();

export interface PolicyRecord {
    key: string;
    value: Record<string, unknown>;
    updated_at: string | null;
}

function stableJson(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;

    const entries = Object.entries(value as Record<string, unknown>).sort(
        ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
        .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableJson(entryValue)}`)
        .join(',')}}`;
}

export function policyHash(policy: PolicyRecord): string {
    return createHash('sha256')
        .update(
            stableJson({
                key: policy.key,
                value: policy.value,
                updated_at: policy.updated_at,
            }),
        )
        .digest('hex');
}

export function policyVersion(policy: PolicyRecord): string {
    const explicitVersion =
        policy.value.version ??
        policy.value.policy_version ??
        policy.value.policyVersion;

    return typeof explicitVersion === 'string' || typeof explicitVersion === 'number'
        ? String(explicitVersion)
        : (policy.updated_at ?? 'unversioned');
}

export async function getPolicyRecord(key: string): Promise<PolicyRecord> {
    const [row] = await sql<[{ value: Record<string, unknown>; updated_at: string | null }?]>`
        SELECT value, updated_at::text AS updated_at FROM ops_policy WHERE key = ${key}
    `;

    return {
        key,
        value: row?.value ?? { enabled: false },
        updated_at: row?.updated_at ?? null,
    };
}

export async function getPolicy(key: string): Promise<Record<string, unknown>> {
    const cacheKey = tenantCacheKey('policy', key);
    const cached = policyCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.value;
    }

    const [row] = await sql<[{ value: Record<string, unknown> }?]>`
        SELECT value FROM ops_policy WHERE key = ${key}
    `;

    const value = row?.value ?? { enabled: false };
    policyCache.set(cacheKey, { value, ts: Date.now() });
    return value;
}

export async function setPolicy(
    key: string,
    value: Record<string, unknown>,
    description?: string,
): Promise<void> {
    await sql`
        INSERT INTO ops_policy (key, value, description, updated_at)
        VALUES (${key}, ${jsonb(value)}, ${description ?? null}, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            description = COALESCE(EXCLUDED.description, ops_policy.description),
            updated_at = NOW()
    `;

    policyCache.delete(tenantCacheKey('policy', key));
}

export function clearPolicyCache(): void {
    policyCache.clear();
}
