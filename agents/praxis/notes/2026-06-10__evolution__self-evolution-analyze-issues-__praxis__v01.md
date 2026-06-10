---
artifact_id: 2026-06-10__evolution__self-evolution-analyze-issues-__praxis__v01
created_at: 2026-06-10T00:00:00Z
agent_id: praxis
step_kind: self_evolution
status: complete
---

# Self-evolution change: sealed execution contracts and evidence

Implemented the top concrete improvement from the roundtable/review thread: broad auto-approval needed an auditable execution boundary, not a one-time status flip, and every execution outcome needed durable proof.

This branch also includes the remote evolution fix that disambiguates pending proposals by UUID in situational briefings.

## Change

- Split proposal intake from approval evaluation in `src/lib/ops/proposal-service.ts`.
- Added durable `ops_proposal_approval_evaluations` records with policy fingerprints, protected/allowed step kinds, blocked kinds, and per-step decisions.
- Added sealed `execution_contract` snapshots on proposal-derived missions, with contract hash, expiry, approver metadata, beneficiary, risk owner, approved step hashes, and acceptance criteria.
- Added `src/lib/ops/proposal-runner.ts` so proposal-derived steps can be revalidated immediately before side effects.
- Added append-only `ops_mission_step_execution_evidence` rows and `src/lib/ops/execution-evidence.ts` to record dispatch, success, blocked, failed, and recovery outcomes against the sealed contract.
- Wired `scripts/unified-worker/index.ts` to dispatch only from the sealed contract snapshot, reject uncovered/expired steps, and append execution evidence for direct handlers, agent dispatch, terminal session outcomes, veto blocks, and dispatch failures.
- Wired recovery to append evidence when stale steps are resolved.
- Added regression coverage in `tests/tenant-auth-replay-regression.test.ts` for evaluation-before-mutation, per-step approval revalidation, and required schema-validated execution contracts.

## Why this was first

The roundtable/review thread rejected broad auto-approval as a standing privilege. The highest-leverage fix is to make approval a recorded, replayable decision, freeze the execution boundary before any side effects, and leave an append-only proof trail for each outcome.

## Verification

- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npx --yes bun test tests/tenant-auth-replay-regression.test.ts`: 10 pass, 0 fail.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run lint -- scripts/unified-worker/index.ts src/lib/ops/proposal-service.ts src/lib/ops/recovery.ts src/lib/ops/execution-evidence.ts tests/tenant-auth-replay-regression.test.ts`: pass.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run build:worker`: pass.
