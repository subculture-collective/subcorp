import { getCurrentTenantContext, type TenantContext } from './context';

function sanitizePart(value: string): string {
    return value.replace(/:/g, '_');
}

export function tenantCacheKey(
    namespace: string,
    id: string,
    ctx: TenantContext = getCurrentTenantContext(),
): string {
    return [ctx.tenantId, ctx.workspaceId, namespace, id]
        .map(sanitizePart)
        .join(':');
}
