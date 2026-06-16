## Changelog: Patch `createMissionFromProposal` with Artifact ID Enforcement

### Grounding
- Modified file: `/workspace/projects/subcorp/src/lib/ops/proposal-service.ts`
- Added `artifactId` field to `executionSpecSchema`
- Updated SQL inserts to include `artifact_id` column
- Added artifact_id verification in mission and spec checks
- Updated return types to include artifact_id in query results
- Modified error handling to include artifact_id mismatches

### Changes
1. Added `artifactId` validation to execution spec schema
2. Persisted `artifact_id` in both `ops_execution_specs` and `ops_missions` tables
3. Added verification of `artifact_id` consistency across proposal, execution spec, and mission records
4. Updated SQL queries to include artifact_id in SELECT statements
5. Enhanced error messages to include artifact_id mismatch information