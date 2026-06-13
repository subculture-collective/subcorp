# Observe/Tune Log

## 2026-06-12 01:10 UTC

- Ran post-fresh health check after recent DB/tooling/Gitea changes.
- Fixed stale Makefile database assumptions so fresh/migrate/nuke/engage targets use `.env` `DATABASE_URL` instead of hardcoded `subcorp_ops/subcorp`.
- Added reusable startup helpers: `scripts/go-live/reset-db-from-env.mjs`, `scripts/go-live/migrate.mjs`, and `scripts/go-live/set-system-enabled.mjs`.
- Made `docker/toolbox/init-workspace.sh` safer to rerun and hot-patched the live toolbox with updated Gitea-safe scripts.
- Re-ran migrations, seed, and workspace init against the actual app DB (`subcult_ops`); seed counts are healthy and `system_enabled` is true.
- Verified heartbeat manually and via worker logs. Heartbeat is active and returning `status: ok`.
- Tests: `bun test` passed, `tests/agent-tooling-gitea-regression.test.ts` passed, `npx tsc --noEmit` passed.
- Observed real tool use and artifact writes via `qwen3:14b`; recent artifacts are concrete. Some steps are blocked by required-tool-evidence gates, which is expected after the tooling fix but should be monitored for excessive false blocking.
- Next loop: watch blocked step rate, confirm code-writing missions get `file_write` evidence, and consider lowering noisy audit trigger volume if it keeps producing false-positive container findings.


## 2026-06-12 01:44 UTC — observe/tune cycle

- Startup/fresh: did not run destructive fresh; not needed. Re-ran `prod-migrate`, `prod-seed`, `prod-init-workspace`, and `prod-engage` idempotently. Seed state: agents=6, policies=36, triggers=31, enabled_triggers=30, rss_feeds=15, discord_channels=16, cron schedules=12/12 enabled, `system_enabled={"enabled": true}`.
- Containers: `subcorp-app`, `subcorp-worker`, `subcorp-sanctum`, `subcorp-toolbox` running with restart count 0 after rebuilds. Toolbox remote remains tokenless Gitea `https://git.subcult.tv/subculture-collective/subcorp.git`.
- Heartbeat: worker-managed heartbeat is active and returning `status: ok`; recent cycles evaluated 30 triggers and 12 cron schedules.
- Findings: high blocked-step rate was correlated with local qwen3 tool sessions exceeding the previous 90s total LLM tool budget before final text/artifact completion. Increased `LLM_TOOL_TOTAL_BUDGET_MS` to 240s and rebuilt app/worker.
- Findings: workspace files were being created world-writable (`0666`) by direct workspace writers. Patched `file_write`, `send_to_agent`, droid task setup, project registry initialization, newspaper/newsletter writes, and local blog publication writes to normalize files to `0644`; normalized existing `/workspace` files.
- Validation: `bun test tests/agent-tooling-gitea-regression.test.ts` passed (9 tests), `bun test` passed (51 tests), `npx tsc --noEmit` passed, `rtk lint` had 0 errors and the same 7 pre-existing unused-var warnings in `step-prompts.ts`/`triggers.ts`. Next.js production build and worker bundle rebuilt successfully.
- Post-fix observation: tool sessions now continue longer through multi-round `web_search`, `web_fetch`, and `file_read` work instead of immediately exhausting budget. Some Brave Search rate limiting persists and falls back to DuckDuckGo. One remaining `0666` inbox artifact was older than the final rebuild window and was normalized; next loop should verify no new `0666` files appear.
- Next loop watch items: blocked-session rate after 240s budget, any new world-writable files, rate-limit impact on research quality, and whether running tool sessions convert to succeeded artifacts rather than blocked steps.
