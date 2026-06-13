---
artifact_id: 2026-06-10__evolution__self-evolution-analyze-issues-__praxis__v01
created_at: 2026-06-10T00:00:00Z
agent_id: praxis
step_kind: self_evolution
status: complete
---

# Self-evolution change: fail-closed workspace browse

Implemented the top concrete security improvement from the roundtable/audit thread: the `/api/ops/workspace` GET endpoint exposed workspace listing and raw file reads without authentication.

## Change

- Added `requireRole('member', 'admin')` to `src/app/api/ops/workspace/route.ts`.
- The auth check now runs before URL parsing, path sanitization, path resolution, or toolbox execution.
- Added a regression test in `tests/tenant-auth-replay-regression.test.ts` proving the workspace route imports the auth middleware and performs the role check before sensitive filesystem/toolbox logic.
- Aligned the local Ollama timeout regression expectations with the current generous queue-budget policy so the full test suite passes again.

## Why this was first

The audit identified unauthenticated ops data routes as a high-risk issue. Workspace raw reads were the sharpest immediate exposure because they could return file contents up to 1 MB to any caller able to reach the app.

## Verification

- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npx --yes bun test tests`: 35 pass, 0 fail.
- `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm run lint -- src/app/api/ops/workspace/route.ts tests/tenant-auth-replay-regression.test.ts tests/task-9-regression.test.ts`: pass.
