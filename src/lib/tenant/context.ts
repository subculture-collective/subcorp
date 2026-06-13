export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
export const DEFAULT_WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000001';

export interface TenantContext {
    tenantId: string;
    workspaceId: string;
    mode: 'single-tenant';
}

export function getCurrentTenantContext(): TenantContext {
    return {
        tenantId: DEFAULT_TENANT_ID,
        workspaceId: DEFAULT_WORKSPACE_ID,
        mode: 'single-tenant',
    };
}

export function assertSingleTenantBoundary(): TenantContext {
    if (process.env.MULTI_TENANT_ENABLED === 'true') {
        throw new Error(
            'MULTI_TENANT_ENABLED=true is not supported yet. Subcorp is currently single-tenant only.',
        );
    }
    return getCurrentTenantContext();
}
