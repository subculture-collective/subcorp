import { sql } from '@/lib/db';
import { sha256 } from 'crypto';
import type { Proposal, MissionCreateResult } from '../types';
import * as z from 'zod';

// Add execution spec schema
const executionSpecSchema = z.object({
    proposalId: z.string().nonempty(),
    artifactId: z.string().nonempty(), // Added artifactId field
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
            artifactId: proposal.artifactId, // Include artifactId from proposal
            steps: proposal.steps,
        });

        // Create hash of execution spec
        const specHash = sha256(JSON.stringify(executionSpec)).toString('hex');

        // Insert execution spec with hash and artifactId
        await sql`INSERT INTO ops_execution_specs (
            proposal_id, spec, hash, artifact_id // Added artifact_id column
        ) VALUES (
            ${proposal.id}, ${JSON.stringify(executionSpec)}, ${specHash}, ${executionSpec.artifactId} // Include artifactId
        )`;

        // Create mission using the hashed spec and artifactId
        const [mission] = await sql<[{ id: string }]>`
            INSERT INTO ops_missions (
                proposal_id, execution_spec_hash, status, artifact_id // Added artifact_id column
            ) VALUES (
                ${proposal.id}, ${specHash}, 'pending', ${executionSpec.artifactId} // Include artifactId
            )
            RETURNING id
        `;

        // Verify mission creation and artifact_id
        const [createdMission] = await sql<[{ id: string, status: string, artifact_id: string }]>`
            SELECT id, status, artifact_id // Select artifact_id
            FROM ops_missions 
            WHERE id = ${mission.id}
        `;

        if (!createdMission || createdMission.status !== 'pending' || createdMission.artifact_id !== executionSpec.artifactId) {
            return {
                success: false,
                reason: `Mission verification failed: ${JSON.stringify(createdMission)}`,
            };
        }

        // Verify execution spec exists and artifact_id matches
        const [specRecord] = await sql<[{ hash: string, artifact_id: string }]>`
            SELECT hash, artifact_id // Select artifact_id
            FROM ops_execution_specs 
            WHERE proposal_id = ${proposal.id}
        `;

        if (!specRecord || specRecord.hash !== specHash || specRecord.artifact_id !== executionSpec.artifactId) {
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
