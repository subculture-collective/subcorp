import { afterEach, describe, expect, mock, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const OPS_ROOT = path.join(process.cwd(), 'src/app/api/ops');

const AUTH_HELPER_RE = /requireOpsRead\(|requireOpsAdminOrCron\(|requireRoleOrCron\(|requireAuthOrCron\(|requireCron\(|requireRole\(/;

const PUBLIC_ROUTES = new Set([
    'subscribe/route.ts',
    'newsletter/route.ts',
    'newsletter/[week]/pdf/route.ts',
    'newspaper/route.ts',
    'newspaper/[date]/pdf/route.ts',
    'droids/route.ts',
    'roundtable/ask/route.ts',
]);

function listRouteFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return listRouteFiles(full);
        return entry.isFile() && entry.name === 'route.ts' ? [full] : [];
    });
}

describe('ops auth defaults', () => {
    afterEach(() => {
        delete process.env.CRON_SECRET;
        mock.restore();
    });

    test('cron-only helpers fail closed when CRON_SECRET is unset', async () => {
        mock.module('@/lib/auth/session', () => ({
            validateSession: mock(async () => null),
        }));

        const { requireCron, requireOpsAdminOrCron } = await import(
            '@/lib/auth/middleware'
        );

        const request = new Request('https://subcorp.test/api/ops/heartbeat', {
            headers: { authorization: 'Bearer anything' },
        });

        const cronOnly = await requireCron(request);
        const adminOrCron = await requireOpsAdminOrCron(request);

        expect(cronOnly).toBeInstanceOf(NextResponse);
        expect((cronOnly as NextResponse).status).toBe(401);
        expect(adminOrCron).toBeInstanceOf(NextResponse);
        expect((adminOrCron as NextResponse).status).toBe(401);
    });

    test('non-allowlisted ops routes import an auth helper', () => {
        const missing = listRouteFiles(OPS_ROOT)
            .map(file => path.relative(OPS_ROOT, file).replace(/\\/g, '/'))
            .filter(rel => !PUBLIC_ROUTES.has(rel))
            .filter(rel => {
                const source = fs.readFileSync(path.join(OPS_ROOT, rel), 'utf8');
                return !AUTH_HELPER_RE.test(source);
            });

        expect(missing).toEqual([]);
    });
});
