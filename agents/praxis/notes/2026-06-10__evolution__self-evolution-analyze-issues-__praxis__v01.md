---
artifact_id: 2026-06-10__evolution__self-evolution-analyze-issues-__praxis__v01
created_at: 2026-06-10T00:00:00Z
agent_id: praxis
step_kind: self_evolution
status: complete
---

# Self-evolution change: output-lane throttle and execution integrity

Implemented the top concrete improvement from the roundtable/review thread: internal autonomous sessions were able to consume worker cycles while approved drafts, completed content reviews, and aging publication work waited behind them.

This branch keeps the existing execution-integrity hardening and adds an output-lane pre-dispatch gate in the unified worker.

## Change

- Split proposal intake from approval evaluation in `src/lib/ops/proposal-service.ts`.
- Added durable `ops_proposal_approval_evaluations` records with policy fingerprints, protected/allowed step kinds, blocked kinds, and per-step decisions.
- Added sealed `execution_contract` snapshots on proposal-derived missions, with contract hash, expiry, approver metadata, beneficiary, risk owner, approved step hashes, and acceptance criteria.
- Added `src/lib/ops/proposal-runner.ts` so proposal-derived steps can be revalidated immediately before side effects.
- Added append-only `ops_mission_step_execution_evidence` rows and `src/lib/ops/execution-evidence.ts` to record dispatch, success, blocked, failed, and recovery outcomes against the sealed contract.
- Wired `scripts/unified-worker/index.ts` to dispatch only from the sealed contract snapshot, reject uncovered/expired steps, and append execution evidence for direct handlers, agent dispatch, terminal session outcomes, veto blocks, and dispatch failures.
- Wired recovery to append evidence when stale steps are resolved.
- Added regression coverage in `tests/tenant-auth-replay-regression.test.ts` for evaluation-before-mutation, per-step approval revalidation, and required schema-validated execution contracts.
- Added `getOutputObligations()` in `scripts/unified-worker/index.ts` to detect approved drafts, completed review drafts, stale review drafts, and aging publication-linked mission steps.
- Added `shouldThrottleInternalWork()` and wired `pollLoop()` to run a pre-agent-session output sweep before dispatching internal sessions.
- Updated `pollAgentSessions()` so `cron` and `droid` sessions are held while output obligations exist, while mission and conversation sessions can still move.
- Added regression coverage proving the worker checks output obligations before agent-session dispatch and throttles internal sources.

## Why this was first

The directive says internal coordination exists to ship work, not replace it. The highest-leverage fix is to make the worker protect P1/P2 publication lanes before it spends cycles on internal cron/droid work.

## Verification

- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npx --yes bun test tests/tenant-auth-replay-regression.test.ts`: 18 pass, 0 fail.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run lint -- scripts/unified-worker/index.ts tests/tenant-auth-replay-regression.test.ts`: pass.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run build:worker`: pass.
