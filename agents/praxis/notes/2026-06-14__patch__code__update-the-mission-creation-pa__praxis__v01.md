## Code Update: Enforce Approval Decision ID in Mission Creation

### Summary
Updated `/src/app/api/ops/missions/route.ts` to require a persisted `approval_decision_id` in mission creation requests. Added validation logic to reject requests missing this field or referencing invalid/unapproved decisions.

### Grounding
- Modified file: `/workspace/projects/subcorp/src/app/api/ops/missions/route.ts` (added POST handler with approval decision validation)
- Used function: `buildApprovalEvaluation` from `@/lib/ops/proposal-service` for decision verification
- Error conditions implemented: 400 (missing ID), 403 (invalid decision), 500 (server errors)
- No changes made to `/src/lib/tools/tools/propose-mission.ts` as the validation is now server-side in the API route