# Autonomous Ops Alignment Remediation
Swarm: default
Phase: 1 [COMPLETE] | Updated: 2026-04-10T06:43:11.268Z

---
## Phase 1: Restore runtime publication and scheduling foundations [COMPLETE]
- [x] 1.1: Seed 12 recurring cron schedules into ops_cron_schedules via guarded SQL inserts using INSERT INTO ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name=...) for each row, since the table has no unique constraint on name. Definitions sourced from scripts/migrate-cron-jobs.ts. [SMALL]
- [x] 1.2: Fix blog reader path in src/data/blog.ts: change BLOG_DIR from path.join(process.cwd(), 'workspace/output/blog') to use /workspace/output/blog/ so it reads from the same shared-volume directory that the publication writer in content-publication.ts writes to via WORKSPACE_ROOT [SMALL] (depends: 1.1)
- [x] 1.3: Copy the 7 existing hand-written blog posts from the image-baked path /app/workspace/output/blog/ into the shared-volume path /workspace/output/blog/ so they remain visible after the blog.ts path change from task 1.2 [SMALL] (depends: 1.2)
- [x] 1.4: Add structured error logging to publication functions in src/lib/ops/content-publication.ts: wrap publishLocally and mirrorPublishedDraft call sites inside publishApprovedDrafts with try/catch that logs errors via createLogger and records failure reason in the draft metadata JSON column [SMALL] (depends: 1.2)
- [x] 1.5: Repair corrupted model routing row in ops_model_routing: snapshot current row for context=agent_proposal_vote via SELECT, then UPDATE models array to remove the env-var fragment contamination (the literal MODEL_ROUTING_AGENT_DESIGN= string concatenated into a model identifier) [SMALL]

---
## Phase 2: Rebalance autonomous behavior toward outward-facing output [PENDING]
- [ ] 2.1: Expire stale governance proposals in ops_governance_proposals: snapshot current status distribution, then UPDATE rows with status='proposed' older than 7 days to status='rejected' with resolved_at=now() (schema CHECK allows proposed/voting/accepted/rejected) [SMALL] (depends: 1.5)
- [ ] 2.2: Rewrite the prime directive file at workspace/shared/prime-directive.md (verified to exist on host and in worker container at /workspace/shared/prime-directive.md, loaded by src/lib/ops/prime-directive.ts) to explicitly prioritize outward-facing content production over internal governance and deprioritize audit/proposal generation unless operator-triggered [MEDIUM] (depends: 2.1)
- [ ] 2.3: Update ops_trigger_rules via SQL to rebalance governance vs content triggers. Specifically: disable or raise cooldown_minutes for governance-oriented rows (name='Governance debate (All agents)' cooldown 30->720, name='Agent proposal voting trigger' cooldown 5->120, name='Proposal backlog monitor (Mux)' enabled=false) and lower cooldowns for content-producing rows (name='Proactive content planning' cooldown 60->15, name='Proactive tweet drafting' cooldown 30->15, name='Proactive deep research' cooldown 45->15) [MEDIUM] (depends: 2.2)
- [ ] 2.4: Add a content-vs-governance activity ratio query to the heartbeat response in src/app/api/ops/heartbeat/route.ts that reports recent mission step type distribution so operators can observe alignment drift [SMALL] (depends: 2.3)

---
## Phase 3: Deploy and clear backlog [PENDING]
- [ ] 3.1: Deploy all code changes by running docker compose up -d --build subcult-corp-app subcult-corp-worker subcult-sanctum to rebuild images AND recreate running containers with new code (blog.ts path fix, publication error logging, heartbeat metrics, refreshed sanctum image) [MEDIUM] (depends: 2.4)
- [ ] 3.2: Clear the approved-but-unpublished content backlog: publishApprovedDrafts runs at worker startup (line 1552) and every poll cycle (line 1599) in scripts/unified-worker/index.ts, processing MAX_BACKFILL_BATCH=20 drafts per invocation. With 85 drafts, the worker will need approximately 5 poll cycles to clear the full backlog. Monitor progress by querying SELECT count(*) FROM ops_content_drafts WHERE status='approved' AND published_at IS NULL after each cycle until count reaches 0 or stalls. Record any remaining blockers with explicit reasons in draft metadata. [MEDIUM] (depends: 1.2, 1.4, 3.1)
