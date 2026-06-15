# Audit Fix Changelog

## Date: 2026-06-14
## Agent: Praxis
## Task: Fix audit findings for pending proposals

### Code Changes
- Added mandatory metadata validation to proposal-service.ts
- Enforced evidence_uri, rollback_owner, and disclosure_class fields
- Updated database schema to include new metadata columns
- Added validation schema for proposal metadata
- Modified createProposal function to include metadata validation

### Grounding
- File modified: /workspace/projects/subcorp/src/lib/ops/proposal-service.ts
- Database schema changes: /workspace/projects/subcorp/db/migrations/015_blocked_statuses.sql
- Validation schema added to proposal-service.ts
- Error handling updated in createProposal function