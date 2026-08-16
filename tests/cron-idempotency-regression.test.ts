import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function migrationSql(name: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, 'db/migrations', name), 'utf8');
}

describe('cron session idempotency', () => {
    test('migration adds tenant/workspace and cron slot fields', () => {
        const tenantSql = migrationSql('029_tenant_workspace_scaffold.sql');
        const cronSql = migrationSql('030_cron_session_idempotency.sql');

        expect(tenantSql).toContain('CREATE TABLE IF NOT EXISTS tenants');
        expect(tenantSql).toContain('ADD COLUMN IF NOT EXISTS tenant_id UUID');
        expect(tenantSql).toContain('ADD COLUMN IF NOT EXISTS workspace_id UUID');
        expect(cronSql).toContain('ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ');
        expect(cronSql).toContain('ADD COLUMN IF NOT EXISTS schedule_slot TEXT');
    });

    test('migration enforces one cron session per schedule slot', () => {
        const cronSql = migrationSql('030_cron_session_idempotency.sql');

        expect(cronSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_agent_sessions_cron_slot');
        expect(cronSql).toContain('ON ops_agent_sessions (tenant_id, source, source_id, schedule_slot)');
        expect(cronSql).toContain("WHERE source = 'cron' AND schedule_slot IS NOT NULL");
    });

    test('scheduler uses row locking and conflict-safe insert', () => {
        const scheduler = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/cron-scheduler.ts'),
            'utf8',
        );

        expect(scheduler).toContain('FOR UPDATE SKIP LOCKED');
        expect(scheduler).toContain('schedule_slot');
        expect(scheduler).toContain('DO NOTHING');
    });
});
