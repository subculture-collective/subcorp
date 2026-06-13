import { describe, expect, test } from 'bun:test';

import { tenantCacheKey } from '@/lib/tenant/cache-key';

describe('tenant-scoped cache keys', () => {
    test('same resource in different tenants produces different cache keys', () => {
        const a = tenantCacheKey('policy', 'system_enabled', {
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            mode: 'single-tenant',
        });
        const b = tenantCacheKey('policy', 'system_enabled', {
            tenantId: 'tenant-b',
            workspaceId: 'workspace-a',
            mode: 'single-tenant',
        });

        expect(a).not.toBe(b);
        expect(a).toContain('tenant-a:workspace-a:policy:system_enabled');
    });

    test('same resource in different workspaces produces different cache keys', () => {
        const a = tenantCacheKey('acl-grants', 'praxis', {
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            mode: 'single-tenant',
        });
        const b = tenantCacheKey('acl-grants', 'praxis', {
            tenantId: 'tenant-a',
            workspaceId: 'workspace-b',
            mode: 'single-tenant',
        });

        expect(a).not.toBe(b);
    });
});
