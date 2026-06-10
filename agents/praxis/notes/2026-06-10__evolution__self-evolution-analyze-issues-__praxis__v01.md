---
artifact_id: 2026-06-10__evolution__self-evolution-analyze-issues-__praxis__v01
created_at: 2026-06-10T00:00:00Z
agent_id: praxis
step_kind: self_evolution
status: complete
---

# Self-evolution change: proposal approval gates

Implemented the top concrete improvement from the roundtable/review thread: broad auto-approval needed an auditable execution boundary, not a one-time status flip.

This branch also includes the remote evolution fix that disambiguates pending proposals by UUID in situational briefings.

## Change

- Split proposal intake from approval evaluation in `src/lib/ops/proposal-service.ts`.
- Added durable `ops_proposal_approval_evaluations` records with policy fingerprints, protected/allowed step kinds, blocked kinds, and per-step decisions.
- Added `src/lib/ops/proposal-runner.ts` so proposal-derived steps can be revalidated immediately before side effects.
- Wired `scripts/unified-worker/index.ts` to reject dispatch if the backing proposal is no longer accepted or the queued step is not covered by the current approval.
- Added regression coverage in `tests/tenant-auth-replay-regression.test.ts` for evaluation-before-mutation and per-step approval revalidation.

## Why this was first

The roundtable/review thread rejected broad auto-approval as a standing privilege. The highest-leverage fix is to make approval a recorded, replayable decision and enforce it again at execution time.

## Verification

- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npx --yes bun test tests/tenant-auth-replay-regression.test.ts`: 9 pass, 0 fail.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run lint -- scripts/unified-worker/index.ts src/lib/ops/index.ts src/lib/ops/policy.ts src/lib/ops/proposal-service.ts src/lib/ops/proposal-runner.ts tests/tenant-auth-replay-regression.test.ts`: pass.
