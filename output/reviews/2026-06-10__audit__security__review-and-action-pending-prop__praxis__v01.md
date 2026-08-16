# Security audit: review and action pending proposals

Date: 2026-06-10  
Agent: praxis  
Mission: Review and action pending proposals  
Step: audit_system  
Scope: `pending_proposals`

## Executive verdict

No critical finding directly proves the current pending proposals must be rejected on security grounds. I did not approve, apply, or mutate any pending governance/prime-directive proposal during this audit.

Action: keep governance proposals held for explicit operator decision. Continue P1/P2 shipping work. Require a separate targeted security/ops review before accepting any proposal that expands execution authority, Docker access, network exposure, auth boundaries, secrets handling, or worker dispatch policy.

## Checks performed

- Repository state: `git -C /home/onnwee/projects/subcorp status --short` and recent commit log.
- Listening sockets: `ss -ltnup`.
- Running processes: `ps -eo user,pid,ppid,stat,comm,args --sort=user,pid`.
- Container exposure and health: `docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'`.
- Filesystem permissions: `ls -ld` and `ls -l` on the subcorp repo, output/review paths, proposal code, worker code, and proposal migrations.
- Code/config review:
  - `docker-compose.yml`
  - `src/lib/ops/proposal-service.ts`
  - `src/lib/ops/proposal-runner.ts`
  - `src/lib/ops/agent-proposal-voting.ts`
  - `db/migrations/024_proposal_replay_concurrency_guards.sql`
  - `db/migrations/025_proposal_approval_evaluations.sql`

## Findings

### HIGH — Subcorp app, worker, and sanctum mount the host Docker socket

- Evidence: `docker-compose.yml` mounts `${DOCKER_SOCK:-/var/run/docker.sock}:/var/run/docker.sock` into `subcorp-app`, `subcorp-worker`, and `subcorp-sanctum`, with `group_add` for `${DOCKER_SOCK_GID:-967}`.
- Risk: Any compromise or over-broad autonomous tool path inside these containers can escalate to host/container control through the Docker API. This is especially relevant to pending proposals because proposal execution is performed by autonomous worker/session code.
- Scope impact: Directly relevant to proposal actioning. A pending proposal that expands agent authority, tool permissions, execution dispatch, or runtime code paths would run in an environment with Docker-level privilege adjacency.
- Action: Do not auto-approve proposals that alter execution authority or tool access. Prefer a docker-socket proxy with least-privilege endpoints, or remove Docker socket access from services that do not strictly require it.

### MEDIUM — OpenCode service listens on all interfaces

- Evidence: `ss -ltnup` shows `opencode` listening on `0.0.0.0:4096`.
- Risk: If not constrained by firewall/VPN/auth, an externally reachable OpenCode control surface can expose agent/session capabilities beyond the local operator.
- Scope impact: Not specific to a single pending proposal, but relevant because proposal review/action is performed by autonomous sessions.
- Action: Restrict to loopback or a trusted VPN interface unless intentional and authenticated. Verify firewall rules before approving proposals that expand automation privileges.

### MEDIUM — Sensitive admin and observability services are LAN-exposed

- Evidence: `ss`/`docker ps` show multiple services published on `10.0.0.56`, including `pgadmin` (`5050`), `vaultwarden` (`8084`), `couchdb` (`5984`), registry (`5000`), Prometheus (`9090`), Alertmanager (`9093`), Grafana (`3000`), Loki (`3100`), Dozzle (`8088`), plus many app/API ports.
- Risk: LAN exposure is acceptable only if the LAN/VPN boundary is trusted and each service has strong auth. Compromise of these services could affect operational state, secrets, logs, evidence, or deployment paths.
- Scope impact: No pending proposal observed directly changes these bindings. Treat as environmental risk before granting broader automation.
- Action: Keep proposal actions bounded. Require dedicated infra/security review for any proposal that changes port bindings, service exposure, auth, or observability access.

### MEDIUM — `subcorp-sanctum` is restarting

- Evidence: `docker ps` reports `subcorp-sanctum` as `Restarting (1)`.
- Risk: Availability/consistency risk for any sanctum-dependent governance, review, or policy pathway. A failing guard service can cause proposal state to be evaluated without the expected supporting service, depending on caller behavior.
- Scope impact: Relevant to pending proposal actioning if sanctum participates in approval, review, or policy enforcement.
- Action: Do not rely on sanctum-backed checks until the restart loop is diagnosed. Treat any proposal requiring sanctum guarantees as held.

### LOW — Project and review directories are group-writable

- Evidence: `/home/onnwee/projects/subcorp`, `output`, `output/reviews`, `src/lib/ops`, and `scripts/unified-worker` are `drwxrwxr-x onnwee:onnwee`; reviewed source/migration files are `-rw-rw-r-- onnwee:onnwee`.
- Risk: Members of group `onnwee` can modify worker/proposal code and audit artifacts. This is normal for a single-user workstation but weak for multi-user trust boundaries.
- Scope impact: Audit artifacts and proposal execution code can be altered by same-group accounts.
- Action: If this host becomes multi-user, tighten code and audit output paths to owner-writable only.

### LOW — Repository has substantial uncommitted changes during proposal review

- Evidence: `git status --short` shows modified worker/proposal/security-adjacent files and untracked migrations/schema/test artifacts, including `scripts/unified-worker/index.ts`, `src/lib/ops/execution-evidence.ts`, `src/lib/ops/proposal-runner.ts`, `src/lib/ops/proposal-service.ts`, `src/lib/tools/tools/file-write.ts`, `db/migrations/028_acl_grant_authority_events.sql`, `db/migrations/029_execution_integrity_constraints.sql`, receipt schemas, and test fixtures.
- Risk: Pending proposal behavior may be affected by local, uncommitted code that has not passed normal review/release discipline.
- Scope impact: Directly relevant to actioning pending proposals because the worker/proposal pipeline is actively modified.
- Action: Do not treat proposal actions as production-stable until these changes are reviewed, tested, and either committed or intentionally kept as work-in-progress.

### INFO — Proposal pipeline has visible guardrails

- Evidence:
  - `proposal-service.ts` has replay/idempotency lookup by `source`, `source_trace_id`, and `title`.
  - Per-session proposal limit of 2 when `source_trace_id` is present.
  - Daily proposal limit via `DAILY_PROPOSAL_LIMIT`.
  - Cap-gate checks before proposal insert.
  - Approval evaluation records and mission execution contracts with proposal revision/hash, expiry, approver, beneficiary, risk owner, approved steps, and contract hash.
  - `proposal-runner.ts` denies execution when proposal status is not `accepted`, approval is expired/invalid, actor is not assigned, or step is not covered by approval.
  - Migration `024` adds replay-key and mission/proposal unique indexes.
  - Migration `025` creates explicit approval evaluation records.
- Risk: Positive control. These reduce replay, duplicate mission, and unaudited execution risk.
- Action: Preserve these gates. Pending governance proposals should not bypass this path.

### INFO — Current pending proposals are governance/process-scoped

- Evidence: Mission context lists pending proposals titled `Update prime directive based on product spec`, `Resolve UUID ambiguity for active proposals`, and another `Update prime directive based on product spec`.
- Risk: Process-level drift rather than direct runtime exploit. They could weaken or alter output prioritization if accepted blindly.
- Action: Hold for explicit operator approval under the current prime directive. Do not auto-approve governance changes from this autonomous audit flow.

## Severity summary

| Severity | Count | Summary |
|---|---:|---|
| Critical | 0 | None found |
| High | 1 | Docker socket mounted into subcorp execution services |
| Medium | 3 | OpenCode wildcard listener; LAN-exposed sensitive services; sanctum restart loop |
| Low | 2 | Group-writable project paths; dirty repo during proposal review |
| Info | 2 | Proposal guardrails present; pending proposals are governance/process-scoped |

## Final action

Do not auto-action the pending governance proposals from this audit. Keep them pending/held unless the operator explicitly approves them. Before accepting any proposal that changes automation authority, network exposure, secrets, auth, Docker access, or worker dispatch, run a dedicated targeted review and resolve the `subcorp-sanctum` restart loop.
