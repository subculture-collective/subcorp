---
artifact_id: 2026-06-09__evolution__self-evolution-analyze-issues-__praxis__v01
created_at: 2026-06-09T00:00:00Z
agent_id: praxis
step_kind: self_evolution
status: complete
---

# Self-evolution change: portable repo bootstrap

Implemented the top concrete reliability fix from this run: self-evolution prompts assumed `/workspace/projects/subcorp` exists, but this environment did not have `/workspace`, causing branch creation to fail before code work could start.

## Change

- Added a reusable self-evolution repo setup command in `src/lib/ops/step-prompts.ts`.
- The prompt now locates an existing checkout under `/workspace/projects/subcorp`, `/home/onnwee/projects/subcorp`, or `/home/onnwee/workspace/projects/subcorp`.
- If no checkout exists, it clones `https://git.subcult.tv/subculture-collective/subcorp.git` into `/home/onnwee/projects/subcorp`.
- Branch creation and commit/push instructions now use the resolved `REPO_DIR` instead of blindly `cd`ing into `/workspace`.
- Added a regression test asserting the fallback is present in rendered `self_evolution` prompts.

## Verification

- Initial default `PATH` lacked `bun`, `node`, and `npm`; verification was retried after locating the mise Node install.
- Ran `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npm ci` successfully.
- Ran `PATH="/home/onnwee/.local/share/mise/installs/node/24.15.0/bin:$PATH" npx --yes bun test tests/step-prompts-regression.test.ts`: 1 pass, 0 fail.
- `npm ci` reported existing dependency audit findings: 6 moderate and 7 high vulnerabilities. Not introduced by this change.
