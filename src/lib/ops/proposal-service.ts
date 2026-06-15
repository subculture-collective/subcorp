import { sql } from '@/lib/db';
import { sha256 } from 'crypto';
import type { Proposal, MissionCreateResult } from '../types';
import * as z from 'zod';

// Add execution spec schema
const executionSpecSchema = z.object({
    proposalId: z.string().nonempty(),
    steps: z.array(z.object({
        kind: z.string().nonempty(),
        payload: z.record(z.unknown()),
    })),
    createdAt: z.date().default(() => new Date()),
});

// Add validation to createMissionFromProposal function
export async function createMissionFromProposal(proposal: Proposal): Promise<MissionCreateResult> {
    try {
        // Generate execution spec from proposal
        const executionSpec = executionSpecSchema.parse({
            proposalId: proposal.id,
            steps: proposal.steps,
        });

        // Create hash of execution spec
        const specHash = sha256(JSON.stringify(executionSpec)).toString('hex');

        // Insert execution spec with hash
        await sql`INSERT INTO ops_execution_specs (
            proposal_id, spec, hash
        ) VALUES (
            ${proposal.id}, ${JSON.stringify(executionSpec)}, ${specHash}
        )`;

        // Create mission using the hashed spec
        const [mission] = await sql<[{ id: string }]>`
            INSERT INTO ops_missions (
                proposal_id, execution_spec_hash, status
            ) VALUES (
                ${proposal.id}, ${specHash}, 'pending'
            )
            RETURNING id
        `;

        // Verify mission creation
        const [createdMission] = await sql<[{ id: string, status: string }]>`
            SELECT id, status 
            FROM ops_missions 
            WHERE id = ${mission.id}
        `;

        if (!createdMission || createdMission.status !== 'pending') {
            return {
                success: false,
                reason: `Mission verification failed: ${JSON.stringify(createdMission)}`,
            };
        }

        // Verify execution spec exists
        const [specRecord] = await sql<[{ hash: string }]>`
            SELECT hash 
            FROM ops_execution_specs 
            WHERE proposal_id = ${proposal.id}
        `;

        if (!specRecord || specRecord.hash !== specHash) {
            return {
                success: false,
                reason: `Execution spec verification failed: ${JSON.stringify(specRecord)}`,
            };
        }

        // Verify proposal steps match execution spec
        if (executionSpec.steps.length !== proposal.steps.length) {
            return {
                success: false,
                reason: `Step count mismatch: ${executionSpec.steps.length} vs ${proposal.steps.length}`,
            };
        }

        // Verify readiness/outbox record
        const [readinessRecord] = await sql<[{ status: string }]>`
            SELECT status 
            FROM ops_readiness 
            WHERE proposal_id = ${proposal.id}
        `;

        if (!readinessRecord || readinessRecord.status !== 'ready') {
            return {
                success: false,
                reason: `Readiness verification failed: ${JSON.stringify(readinessRecord)}`,
            };
        }

        return {
            success: true,
            missionId: mission.id,
        };
    } catch (error) {
        return {
            success: false,
            reason: error instanceof Error ? error.message : 'Failed to create mission',
        };
    }
}