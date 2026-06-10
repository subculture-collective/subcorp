import { afterEach, describe, expect, mock, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

import type { AuthUser, UserRole } from '@/lib/auth/types';
import {
    createGrantAuthorityEvent,
    replayGrantAuthorityEvents,
    verifyGrantAuthorityEvent,
    type GrantAuthorityEvent,
} from '@/lib/ops/grant-authority-events';
import {
    resolveExecutableAuthority,
    runApprovedProposal,
} from '@/lib/ops/proposal-runner';
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

    test('database constrains execution integrity boundaries', () => {
        const sql = migrationSql('029_execution_integrity_constraints.sql');
        const service = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/proposal-service.ts'),
            'utf8',
        );
        const evidence = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/execution-evidence.ts'),
            'utf8',
        );
        const worker = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'scripts/unified-worker/index.ts'),
            'utf8',
        );

        expect(sql).toContain('ops_proposal_approval_evaluations_version_bound');
        expect(sql).toContain('proposal_revision TEXT');
        expect(sql).toContain('proposal_hash TEXT');
        expect(sql).toContain('policy_versions TEXT[]');
        expect(service).toContain('proposalRevision(proposal)');
        expect(service).toContain('sha256(proposalSnapshot(proposal))');

        expect(sql).toContain('authority_snapshot JSONB');
        expect(sql).toContain('ops_step_execution_evidence_authority_snapshot_check');
        expect(evidence).toContain('authoritySnapshot');
        expect(evidence).toContain('approvalEvaluationId: input.contract.approvalEvaluationId');

        expect(sql).toContain('retention_class TEXT NOT NULL DEFAULT');
        expect(sql).toContain('ops_step_execution_evidence_retention_class_check');
        expect(sql).toContain('ops_acl_grant_events_retention_class_check');

        expect(sql).toContain('uq_ops_mission_steps_active_assigned_agent');
        expect(sql).toContain("WHERE assigned_agent IS NOT NULL AND status = 'running'");
        expect(worker).toContain('MISSION_STEP_CANDIDATE_LIMIT');
        expect(worker).toContain('SELECT DISTINCT ON (COALESCE(candidate.assigned_agent, candidate.id::text))');

        expect(sql).toContain('enforce_ops_mission_status_transition');
        expect(sql).toContain("OLD.status = 'approved' AND NEW.status IN ('running', 'succeeded', 'blocked', 'failed', 'cancelled')");
        expect(sql).toContain('enforce_ops_mission_step_status_transition');
        expect(sql).toContain("OLD.status = 'queued' AND NEW.status IN ('running', 'blocked', 'failed', 'skipped')");
    });

    test('worker throttles internal sessions when output obligations are pending', () => {
        const worker = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'scripts/unified-worker/index.ts'),
            'utf8',
        );

        expect(worker).toContain('async function getOutputObligations()');
        expect(worker).toContain('function shouldThrottleInternalWork(obligations: OutputObligations)');
        expect(worker).toContain("WHERE status = 'approved'");
        expect(worker).toContain("d.status = 'review'");
        expect(worker).toContain("rs.status = 'completed'");
        expect(worker).toContain("s.kind = ANY(${PUBLICATION_STEP_KINDS}::text[])");
        expect(worker).toContain("COALESCE(s.started_at, s.created_at) < NOW() - interval '30 minutes'");
        expect(worker).toContain("const INTERNAL_AGENT_SESSION_SOURCES = ['cron', 'droid'] as const");
        expect(worker).toContain('OR source <> ALL(${INTERNAL_AGENT_SESSION_SOURCES}::text[])');
        expect(worker).toContain("await sweepOutputObligations('pre_agent_session_throttle')");
        expect(worker.indexOf('const outputObligations = await getOutputObligations()')).toBeLessThan(
            worker.indexOf('const hadSession = await pollAgentSessions({ throttleInternalWork })'),
        );
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

    test('resolveExecutableAuthority returns deterministic allow and deny decisions', () => {
        const coveredStep: ProposedStep = {
            kind: 'document_lesson',
            payload: { n: 1 },
        };
        const proposal = acceptedProposal([coveredStep]);

        expect(
            resolveExecutableAuthority(proposal, coveredStep, 'thaum', {
                missionId: 'mission-gate-test',
                checkedAt: '2026-06-10T00:00:00.000Z',
                approvalExpiresAt: '2026-06-11T00:00:00.000Z',
            }),
        ).toMatchObject({
            outcome: 'ALLOW',
            reason: 'proposal_step_covered_by_active_approval',
            proposalId: proposal.id,
        });

        expect(
            resolveExecutableAuthority(
                { ...proposal, status: 'rejected' },
                coveredStep,
                'thaum',
                { missionId: 'mission-gate-test' },
            ),
        ).toMatchObject({
            outcome: 'DENY',
            reason: 'proposal_not_accepted',
        });

        expect(
            resolveExecutableAuthority(proposal, coveredStep, 'thaum', {
                missionId: 'mission-gate-test',
                approvalExpiresAt: '2026-06-11T00:00:00.000Z',
            }),
        ).toMatchObject({
            outcome: 'DENY',
            reason: 'checked_at_required_for_expiring_approval',
        });

        expect(
            resolveExecutableAuthority(proposal, coveredStep, 'thaum', {
                missionId: 'mission-gate-test',
                checkedAt: '2026-06-12T00:00:00.000Z',
                approvalExpiresAt: '2026-06-11T00:00:00.000Z',
            }),
        ).toMatchObject({
            outcome: 'DENY',
            reason: 'approval_expired',
        });

        expect(
            resolveExecutableAuthority(
                proposal,
                { kind: 'patch_code', payload: { n: 2 } },
                'thaum',
                { missionId: 'mission-gate-test' },
            ),
        ).toMatchObject({
            outcome: 'DENY',
            reason: 'step_not_covered_by_approval',
        });

        const assignedStep: ProposedStep = {
            kind: 'document_lesson',
            payload: { n: 3 },
            assigned_agent: 'praxis',
        };
        expect(
            resolveExecutableAuthority(
                acceptedProposal([assignedStep]),
                assignedStep,
                'thaum',
                { missionId: 'mission-gate-test' },
            ),
        ).toMatchObject({
            outcome: 'DENY',
            reason: 'actor_not_assigned_agent',
        });
    });
});

describe('signed ACL grant authority event replay', () => {
    const signingSecret = 'test-grant-authority-secret';

    test('migration creates an immutable signed append-only grant event chain', () => {
        const sql = migrationSql('028_acl_grant_authority_events.sql');

        expect(sql).toContain('CREATE TABLE IF NOT EXISTS ops_acl_grant_events');
        expect(sql).toContain("CHECK (event_type IN ('grant_issued', 'grant_revoked'))");
        expect(sql).toContain('UNIQUE (agent_id, sequence)');
        expect(sql).toContain('signature       TEXT NOT NULL');
        expect(sql).toContain('ops_acl_grant_events_relative_directory_prefix');
        expect(sql).toContain('prevent_ops_acl_grant_events_mutation');
        expect(sql).toContain('BEFORE UPDATE ON ops_acl_grant_events');
        expect(sql).toContain('BEFORE DELETE ON ops_acl_grant_events');
    });

    test('grant replay derives active prefixes only from a valid signed chain', () => {
        const issued = createGrantAuthorityEvent(
            {
                agentId: 'praxis',
                pathPrefix: 'projects/subcorp/',
                source: 'mission',
                sourceId: null,
                expiresAt: '2026-06-10T04:00:00.000Z',
                actorId: 'worker-test',
                reason: 'temporary mission output grant',
            },
            {
                sequence: 1,
                signingSecret,
                createdAt: '2026-06-10T00:00:00.000Z',
                id: '11111111-1111-4111-8111-111111111111',
            },
        );
        const expired = createGrantAuthorityEvent(
            {
                agentId: 'praxis',
                pathPrefix: 'projects/expired/',
                source: 'mission',
                sourceId: null,
                expiresAt: '2026-06-09T00:00:00.000Z',
                actorId: 'worker-test',
            },
            {
                sequence: 2,
                previousHash: issued.eventHash,
                signingSecret,
                createdAt: '2026-06-10T00:01:00.000Z',
                id: '22222222-2222-4222-8222-222222222222',
            },
        );

        expect(
            replayGrantAuthorityEvents([expired, issued], {
                checkedAt: '2026-06-10T01:00:00.000Z',
                signingSecret,
            }),
        ).toEqual(['projects/subcorp/']);
    });

    test('replay rejects tampered signatures and broken previous hashes', () => {
        const issued = createGrantAuthorityEvent(
            {
                agentId: 'mux',
                pathPrefix: 'projects/subcorp/',
                source: 'manual',
                expiresAt: '2026-06-10T04:00:00.000Z',
                actorId: 'admin-test',
            },
            {
                sequence: 1,
                signingSecret,
                createdAt: '2026-06-10T00:00:00.000Z',
                id: '33333333-3333-4333-8333-333333333333',
            },
        );
        const tampered: GrantAuthorityEvent = {
            ...issued,
            pathPrefix: 'projects/other/',
        };
        const brokenLink: GrantAuthorityEvent = {
            ...issued,
            previousHash: 'not-the-previous-event-hash',
        };

        expect(() => verifyGrantAuthorityEvent(tampered, signingSecret)).toThrow(
            'payload hash mismatch',
        );
        expect(() =>
            replayGrantAuthorityEvents([brokenLink], {
                checkedAt: '2026-06-10T01:00:00.000Z',
                signingSecret,
            }),
        ).toThrow('chain broken');
    });

    test('grant events reject non-canonical path prefixes before signing', () => {
        expect(() =>
            createGrantAuthorityEvent(
                {
                    agentId: 'praxis',
                    pathPrefix: 'projects/subcorp',
                    source: 'manual',
                    expiresAt: '2026-06-10T04:00:00.000Z',
                    actorId: 'admin-test',
                },
                {
                    sequence: 1,
                    signingSecret,
                    createdAt: '2026-06-10T00:00:00.000Z',
                    id: '44444444-4444-4444-8444-444444444444',
                },
            ),
        ).toThrow('normalized relative directory prefix ending in /');
    });

    test('file-write authority reads signed grant events instead of mutable grants', () => {
        const fileWrite = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/tools/tools/file-write.ts'),
            'utf8',
        );
        const worker = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'scripts/unified-worker/index.ts'),
            'utf8',
        );

        expect(fileWrite).toContain('loadGrantAuthorityEventsForAgent(sql, agentId)');
        expect(fileWrite).toContain('replayGrantAuthorityEvents(events');
        expect(fileWrite).toContain('if (events.length === 0) return [];');
        expect(fileWrite.indexOf('loadGrantAuthorityEventsForAgent')).toBeLessThan(
            fileWrite.indexOf('SELECT path_prefix FROM ops_acl_grants'),
        );
        expect(worker).toContain('appendGrantAuthorityEvent(sql, {');
        expect(worker).not.toContain(
            'INSERT INTO ops_acl_grants (agent_id, path_prefix, source, source_id, expires_at)',
        );
    });
});
