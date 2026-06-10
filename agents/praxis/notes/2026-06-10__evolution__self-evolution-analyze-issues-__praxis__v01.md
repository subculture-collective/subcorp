---
artifact_id: 2026-06-10__evolution__self-evolution-analyze-issues-__praxis__v01
created_at: 2026-06-10T00:00:00Z
agent_id: praxis
step_kind: self_evolution
status: complete
---

# Self-evolution change: disambiguate pending proposals

Implemented the top concrete coordination improvement from the current self-evolution context: duplicate pending proposal titles were shown without IDs, making it impossible for agents to distinguish which proposal to review or action.

## Change

- Updated `src/lib/ops/situational-briefing.ts` so pending proposals select and render the proposal UUID.
- Pending proposal lines now render as `Title [id: uuid] (proposed by Agent)`.
- Added `tests/situational-briefing-regression.test.ts` to lock the behavior.

## Why this was first

The active pending proposal list contains repeated titles. Without IDs, agents cannot safely action or reference the correct proposal. This directly fixes the “UUID ambiguity” blocker and reduces duplicate/incorrect governance work.

## Verification

- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npx --yes bun test tests/situational-briefing-regression.test.ts`: 1 pass, 0 fail.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run lint -- src/lib/ops/situational-briefing.ts tests/situational-briefing-regression.test.ts`: pass.
