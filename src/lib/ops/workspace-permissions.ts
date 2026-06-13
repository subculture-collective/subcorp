import { logger } from '@/lib/logger';
import { workspaceWorldWritableFilesTotal } from '@/lib/metrics';
import { execInToolbox } from '@/lib/tools/executor';

const log = logger.child({ module: 'workspace-permissions' });

export interface WorkspacePermissionCheckResult {
    ok: boolean;
    worldWritableCount: number;
    files: string[];
}

export async function normalizeWorkspacePermissions(): Promise<void> {
    await execInToolbox(
        `find /workspace -type f -perm -0002 -exec chmod 0644 {} +; find /workspace -type d -perm -0002 -exec chmod o-w {} +`,
        30_000,
    );
}

export async function checkWorkspaceWorldWritableFiles(): Promise<WorkspacePermissionCheckResult> {
    const result = await execInToolbox(
        `find /workspace -type f -perm -0002 -printf '%p %m\\n' 2>/dev/null || true`,
        10_000,
    );

    const files = result.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    if (files.length > 0) {
        workspaceWorldWritableFilesTotal.inc({ scope: 'workspace' }, files.length);
        log.warn('World-writable workspace files found', {
            count: files.length,
            sample: files.slice(0, 20),
        });
        await normalizeWorkspacePermissions();
    }

    const after = await execInToolbox(
        `find /workspace -type f -perm -0002 -printf '%p %m\\n' 2>/dev/null || true`,
        10_000,
    );

    const remaining = after.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    return {
        ok: remaining.length === 0,
        worldWritableCount: remaining.length,
        files: remaining.slice(0, 100),
    };
}
