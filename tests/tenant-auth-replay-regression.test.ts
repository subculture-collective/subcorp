import { afterEach, describe, expect, mock, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

import type { AuthUser, UserRole } from '@/lib/auth/types';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function migrationSql(name: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, 'db/migrations', name), 'utf8');
}

function authUser(role: UserRole): AuthUser {
    return {
        user: {
            id: `user-${role}`,
            email: `${role}@example.test`,
            username: role,
            display_name: null,
            avatar_url: null,
            role,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
        },
        session: {
            id: `session-${role}`,
            user_id: `user-${role}`,
            token_hash: 'hash',
            expires_at: '2026-02-01T00:00:00.000Z',
            ip_address: null,
            user_agent: null,
            created_at: '2026-01-01T00:00:00.000Z',
        },
    };
}

describe('tenant isolation and authorization boundary regressions', () => {
    afterEach(() => {
        delete process.env.CRON_SECRET;
        mock.restore();
    });

    test('cron fallback fails closed when session is missing and CRON_SECRET is unset', async () => {
        mock.module('@/lib/auth/session', () => ({
            validateSession: mock(async () => null),
        }));

        const { requireAuthOrCron } = await import('@/lib/auth/middleware');
        const result = await requireAuthOrCron(
            new Request('https://subcorp.test/api/ops/heartbeat', {
                headers: { authorization: 'Bearer anything' },
            }),
        );

        expect(result).toBeInstanceOf(NextResponse);
        expect((result as NextResponse).status).toBe(401);
    });

    test('cron bearer replay is rejected when the token does not exactly match the configured secret', async () => {
        process.env.CRON_SECRET = 'tenant-a-secret';
        mock.module('@/lib/auth/session', () => ({
            validateSession: mock(async () => null),
        }));

        const { requireAuthOrCron } = await import('@/lib/auth/middleware');

        const rejected = await requireAuthOrCron(
            new Request('https://subcorp.test/api/ops/heartbeat', {
                headers: { authorization: 'Bearer tenant-b-secret' },
            }),
        );
        const accepted = await requireAuthOrCron(
            new Request('https://subcorp.test/api/ops/heartbeat', {
                headers: { authorization: 'Bearer tenant-a-secret' },
            }),
        );

        expect(rejected).toBeInstanceOf(NextResponse);
        expect((rejected as NextResponse).status).toBe(401);
        expect(accepted).toBe('cron');
    });

    test('role authorization does not leak admin access to a lower-privilege session', async () => {
        mock.module('@/lib/auth/session', () => ({
            validateSession: mock(async () => authUser('member')),
        }));

        const { requireRole } = await import('@/lib/auth/middleware');
        const result = await requireRole('admin');

        expect(result).toBeInstanceOf(NextResponse);
        expect((result as NextResponse).status).toBe(403);
    });

    test('workspace browse GET authenticates before path resolution or toolbox access', () => {
        const route = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/app/api/ops/workspace/route.ts'),
            'utf8',
        );

        expect(route).toContain("import { requireRole } from '@/lib/auth/middleware';");
        expect(route).toContain("await requireRole('member', 'admin')");

        const authIndex = route.indexOf("await requireRole('member', 'admin')");
        const urlIndex = route.indexOf('new URL(request.url)');
        const pathIndex = route.indexOf('sanitizePath(rawPath)');
        const toolboxIndex = route.indexOf('execInToolbox(');

        expect(authIndex).toBeGreaterThanOrEqual(0);
        expect(authIndex).toBeLessThan(urlIndex);
        expect(authIndex).toBeLessThan(pathIndex);
        expect(authIndex).toBeLessThan(toolboxIndex);
    });
});

describe('proposal replay concurrency guards', () => {
    test('migration enforces one proposal per replay key under concurrent workers', () => {
        const sql = migrationSql('024_proposal_replay_concurrency_guards.sql');

        expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_mission_proposals_replay_key');
        expect(sql).toContain('ON ops_mission_proposals (source, source_trace_id, title)');
        expect(sql).toContain('WHERE source_trace_id IS NOT NULL');
    });

    test('migration prevents mission fan-out when auto-approval races replay handling', () => {
        const sql = migrationSql('024_proposal_replay_concurrency_guards.sql');

        expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_missions_proposal_id');
        expect(sql).toContain('ON ops_missions (proposal_id)');
        expect(sql).toContain('WHERE proposal_id IS NOT NULL');
    });

    test('proposal service catches unique replay conflicts and returns replayed result', () => {
        const service = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/proposal-service.ts'),
            'utf8',
        );

        expect(service).toContain("code === '23505'");
        expect(service).toContain('return replayResult(existing, input);');
        expect(service).toContain(
            'ON CONFLICT (proposal_id) WHERE proposal_id IS NOT NULL DO UPDATE',
        );
        expect(service).toContain('if (!mission.created)');
    });
});
