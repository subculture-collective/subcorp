# Security Audit: tenant-scoped cache, session, job keys, and fail-closed auth under concurrency

Agent: Subrosa  
Date: 2026-06-10  
Mission step: `audit_system`  
Scope: `/home/onnwee/projects/subcorp`, local service exposure checks, cache/session/job/auth code paths. Payload was empty, so audit targeted the mission title.

## Verdict

VETO: do not market or operate this codebase as multi-tenant-isolated yet. The schema, session model, caches, workspace browse APIs, and worker queues are shared/global or user/agent-scoped only.  
FIX: keep current deployment single-tenant until tenant identifiers are added to persistence, cache keys, session context, job uniqueness, and API authorization checks. Then ship.

## System checks run

- `ss -ltnup`: found `subcorp-app` exposed on `10.0.0.56:3010`, plus many local LAN services. SSH listens on `0.0.0.0:22`. Databases used by this stack are mostly localhost/container-only; the app is LAN-exposed.
- `docker ps`: `subcorp-app`, `subcorp-worker`, `subcorp-sanctum`, and `subcorp-toolbox` are running. `subcorp-app` is mapped `10.0.0.56:3010->3000/tcp`; `subcorp-sanctum` is mapped `10.0.0.56:3018->3011/tcp`.
- `systemctl --type=service --state=running`: Docker, cron, ssh, fail2ban, tailscaled are running. No immediate auth-service crash signal from systemd view.
- Path permissions: `/home/onnwee/projects/subcorp` is `drwxrwxr-x onnwee:onnwee`; `output/reviews` was absent and was created for this report.

## Findings

### 1. Critical — no tenant boundary exists in schema or application keys

Evidence:
- `db/migrations/007_platform.sql:66-78`: `user_sessions` contains `user_id`, `token_hash`, `expires_at`, IP, user agent. No `tenant_id`, `workspace_id`, or membership binding.
- Broad search under `src` found no `tenant_id`, `workspace_id`, or `org_id` references.
- Explorer review found core tables in migrations `001`, `003`, `005`, `006`, `007`, and `008` lack tenant/workspace partition keys for missions, memory, content, sessions, and queues.

Risk: if more than one tenant/workspace is introduced, reads, writes, sessions, cache entries, and jobs will share a namespace. Cross-tenant data disclosure and confused-deputy execution become likely under normal concurrency.

Recommendation:
1. Add a first-class `tenant_id` or `workspace_id` to users, sessions, agent sessions, missions, steps, memory, content, artifacts, proposals, vetoes, ACL grants, and queue tables.
2. Add composite uniqueness on tenant-scoped resources, e.g. `(tenant_id, token_hash)`, `(tenant_id, source, source_id, schedule_slot)`, `(tenant_id, agent_id, path_prefix)`.
3. Require tenant context in `validateSession()` and propagate it through `AuthUser`.
4. Treat missing tenant context as a 401/403, never as default tenant.

Ship path: explicitly label the current release single-tenant; gate multi-tenant deployment behind the migration and authorization changes.

### 2. High — unauthenticated workspace/data GET routes expose shared state

Evidence:
- `src/app/api/ops/workspace/route.ts:24-134`: `GET` lists or reads `/workspace` content and does not call `requireAuth`, `requireRole`, or `requireAuthOrCron`.
- `src/app/api/ops/workspace/route.ts:41-72`: `raw=true` reads file content up to 1 MB.
- Grep under `src/app/api/ops` found auth checks only in `content/route.ts` and `agent-proposals/route.ts`; explorer also identified unauthenticated shared-data reads in missions, memory, artifacts, and roundtable routes.

Risk: any caller reaching the app can read shared operational data. If deployed beyond a trusted LAN, this becomes direct data exposure. In a multi-tenant future, this is cross-tenant read access.

Recommendation:
1. Add `requireRole('member', 'admin')` or stricter to every `/api/ops/*` route that returns workspace, mission, memory, artifact, or roundtable data.
2. For `/api/ops/workspace`, authorize per tenant/workspace path prefix before list/read.
3. Return 401/403 before path resolution or toolbox execution.
4. Add regression tests proving unauthenticated GETs fail closed.

Ship path: before public exposure, add auth middleware to the ops route group. For LAN-only internal use, document the network trust boundary and keep it behind VPN/reverse-proxy auth.

### 3. High — cache keys are global or per-agent only, not tenant-scoped

Evidence:
- `src/lib/tools/tools/file-write.ts:43-61`: dynamic ACL grant cache is `Map<agentId, { prefixes, ts }>` with 30s TTL.
- `src/lib/ops/step-prompts.ts:39-58`: template cache is keyed by `kind` only.
- `src/lib/ops/prime-directive.ts:7-29`: directive cache is global singleton.
- `src/lib/ops/policy.ts:5-23`: policy cache key is policy key only.
- `src/lib/ops/situational-briefing.ts:8-19,189`: briefing cache is per-agent.
- `src/lib/ops/memory.ts:185-192`: memory cache is per-agent in caller-provided `MemoryCache`.

Risk: tenant A can receive tenant B policy, memory, directive, template, or path grant if those concepts become tenant-specific. ACL revocation also lags up to 30 seconds.

Recommendation:
1. Standardize cache keys as `{tenantId}:{resource}:{id}`.
2. Refuse to cache tenant-sensitive values when tenant context is missing.
3. Invalidate ACL grant cache on grant creation/revocation; reduce TTL for write permissions or cache only negative lookups.
4. Add tests for two concurrent tenants with same `agentId` and different grants/policies.

Ship path: safe for single-tenant. Block multi-tenant mode until every cache constructor requires tenant context.

### 4. Medium — cron/session enqueue is raceable and not tenant-aware

Evidence:
- `src/lib/ops/cron-scheduler.ts:160-219`: `evaluateCronSchedules()` selects all enabled schedules, checks `last_fired_at`, inserts into `ops_agent_sessions`, then updates `last_fired_at`.
- `src/lib/ops/cron-scheduler.ts:177-190`: enqueue has no idempotency key.
- Explorer found only schedule-name uniqueness in `db/migrations/021_enforce_unique_cron_schedule_names.sql`; no unique key on `ops_agent_sessions(source, source_id, schedule slot)`.

Risk: two scheduler instances can fire the same schedule concurrently and enqueue duplicate jobs. In multi-tenant mode, a global `source/source_id` namespace risks collisions or wrong ownership.

Recommendation:
1. Add `tenant_id` to schedules and agent sessions.
2. Add `scheduled_for` or `schedule_slot` and a unique index on `(tenant_id, source, source_id, schedule_slot)`.
3. Use an atomic claim/update pattern: `UPDATE ... WHERE enabled=true AND should_fire AND (last_fired_at...) RETURNING *`, or `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction.
4. Make insert idempotent with `ON CONFLICT DO NOTHING`.

Ship path: keep a single scheduler instance until DB-level idempotency lands.

### 5. Medium — select-then-insert/update governance and session flows can duplicate or overwrite terminal state

Evidence:
- Explorer identified select-then-insert/update patterns in `src/lib/ops/veto.ts:84-104`, `src/lib/ops/governance.ts:132-161`, and `src/lib/tools/agent-session.ts:511-659`.
- Explorer noted proposal replay has a DB guard in `db/migrations/024_proposal_replay_concurrency_guards.sql:1-14`, but the key includes mutable `title` and is not tenant-aware.

Risk: concurrent approvals, vetoes, or session completions can produce duplicate active records or stale terminal-state overwrites.

Recommendation:
1. Put terminal state changes behind `UPDATE ... WHERE status IN (...) RETURNING` guards.
2. Add partial unique indexes for active veto/proposal states per `(tenant_id, target_type, target_id)`.
3. Use immutable IDs, not title text, in replay and idempotency keys.
4. Add concurrency regression tests using parallel promises against the DB.

Ship path: acceptable for low-concurrency single-tenant use; add guards before autonomous scaling.

### 6. Low — auth middleware fails closed where it is used

Evidence:
- `src/lib/auth/middleware.ts:6-13`: `requireAuth()` returns 401 when `validateSession()` returns null.
- `src/lib/auth/middleware.ts:17-27`: `requireRole()` returns 403 when role is not allowed.
- `src/lib/auth/middleware.ts:38-53`: `requireAuthOrCron()` only accepts user session or exact bearer `CRON_SECRET`; otherwise 401.
- Existing regression test path reported by explorer: `tests/tenant-auth-replay-regression.test.ts:44-94` covers missing session, bad cron bearer, and wrong role.

Risk: low in protected routes. The risk is incomplete route adoption, not fail-open logic in this middleware.

Recommendation:
1. Make protected-by-default route helpers or group middleware for `/api/ops`.
2. Lint or test for unauthenticated route exports under `src/app/api/ops`.

Ship path: reuse this middleware everywhere sensitive.

### 7. Info — local service exposure is broad but not specifically tenant-key related

Evidence:
- `subcorp-app` is bound to `10.0.0.56:3010`; `subcorp-sanctum` to `10.0.0.56:3018`.
- Many observability and app services are LAN-bound on `10.0.0.56`; SSH listens on all interfaces; fail2ban and tailscaled are active.

Risk: if LAN is not trusted or reverse proxy exposes these ports, unauthenticated ops routes become externally reachable.

Recommendation:
1. Keep app ports firewalled to trusted network/VPN until route auth is complete.
2. Prefer reverse proxy auth for ops/admin surfaces.
3. Inventory which `10.0.0.56:*` ports are intentionally LAN-public.

Ship path: acceptable for controlled homelab/LAN; not acceptable as internet-facing without proxy auth and route auth.

## Required fixes before multi-tenant launch

1. Add tenant/workspace identity to schema and `AuthUser` context.
2. Make all tenant-sensitive cache keys tenant-qualified.
3. Protect every `/api/ops/*` route by default; prove unauthenticated calls fail closed.
4. Add DB-level idempotency and row locks for cron/job enqueue and governance transitions.
5. Add concurrency regression tests for two tenants sharing usernames, agent IDs, schedule IDs, policy keys, and cache keys.

## Safe-to-ship recommendation

Safe to ship only as a single-tenant, trusted-network internal tool with ops routes behind VPN or reverse-proxy auth. Not safe to ship as multi-tenant or internet-facing admin software yet.
