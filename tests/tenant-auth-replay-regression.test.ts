import { afterEach, describe, expect, mock, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

import type { AuthUser, UserRole } from '@/lib/auth/types';
import { runApprovedProposal } from '@/lib/ops/proposal-runner';
import type { Proposal, ProposedStep } from '@/lib/types';

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

    test('proposal creation is separated from approval evaluation records', () => {
        const service = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/proposal-service.ts'),
            'utf8',
        );
        const migration = migrationSql('025_proposal_approval_evaluations.sql');

        expect(service).toContain('export async function createProposal(');
        expect(service).toContain(
            'export async function evaluateProposalApproval(',
        );
        expect(service).toContain(
            'recordApprovalEvaluation(proposalId, evaluation);',
        );
        expect(service).toContain('INSERT INTO ops_proposal_approval_evaluations');

        const recordIndex = service.indexOf(
            'recordApprovalEvaluation(proposalId, evaluation);',
        );
        const mutationIndex = service.indexOf(
            "SET status = 'accepted', auto_approved = true",
        );
        expect(recordIndex).toBeGreaterThanOrEqual(0);
        expect(recordIndex).toBeLessThan(mutationIndex);

        expect(migration).toContain(
            'CREATE TABLE IF NOT EXISTS ops_proposal_approval_evaluations',
        );
        expect(migration).toContain(
            "CHECK (outcome IN ('approved', 'held_for_review', 'pending_review'))",
        );
        expect(migration).toContain('idx_proposal_approval_evaluations_proposal');
    });

    test('proposal-derived missions require a schema-validated execution contract', () => {
        const service = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/proposal-service.ts'),
            'utf8',
        );
        const migration = migrationSql('026_mission_execution_contracts.sql');

        expect(service).toContain('missionExecutionContractSchema.parse(contract)');
        expect(service).toContain(
            'return validateExecutionContract(contract, proposal);',
        );
        expect(service).toContain(
            'validateExecutionContract(mission.execution_contract, proposal);',
        );
        expect(service).toContain(
            'INSERT INTO ops_missions (proposal_id, title, description, status, created_by, execution_contract)',
        );

        const buildIndex = service.indexOf(
            'const executionContract = buildExecutionContract(',
        );
        const insertIndex = service.indexOf(
            'INSERT INTO ops_missions (proposal_id, title, description, status, created_by, execution_contract)',
        );
        expect(buildIndex).toBeGreaterThanOrEqual(0);
        expect(buildIndex).toBeLessThan(insertIndex);

        expect(migration).toContain('ops_missions_proposal_execution_contract_required');
        expect(migration).toContain('proposal_id IS NULL');
        expect(migration).toContain('execution_contract IS NOT NULL');
    });
});

describe('proposal execution approval gates', () => {
    function acceptedProposal(steps: ProposedStep[]): Proposal {
        return {
            id: 'proposal-gate-test',
            agent_id: 'thaum',
            title: 'Gate every step',
            description: 'Regression fixture',
            status: 'accepted',
            proposed_steps: steps,
            source: 'agent',
            auto_approved: true,
            created_at: '2026-06-10T00:00:00.000Z',
            updated_at: '2026-06-10T00:00:00.000Z',
        };
    }

    test('runApprovedProposal revalidates approval immediately before each step execution', async () => {
        const steps: ProposedStep[] = [
            { kind: 'document_lesson', payload: { n: 1 } },
            { kind: 'patch_code', payload: { n: 2 } },
        ];
        const proposal = acceptedProposal(steps);
        const executed: string[] = [];

        await expect(
            runApprovedProposal(
                proposal,
                steps,
                'thaum',
                { missionId: 'mission-gate-test' },
                async step => {
                    executed.push(step.kind);
                    proposal.status = 'rejected';
                },
            ),
        ).rejects.toThrow(
            'Proposal proposal-gate-test is not currently accepted',
        );

        expect(executed).toEqual(['document_lesson']);
    });
});
