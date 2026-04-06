# ─── SUBCORP — Makefile ───

.PHONY: dev build start lint typecheck clean \
        seed seed-agents seed-policy seed-triggers seed-relationships seed-rss seed-discord \
        purge-discord \
        verify up down restart status logs logs-app logs-worker logs-db \
        heartbeat db-migrate db-shell nuke fresh init-workspace \
        rebuild-toolbox prune \
        engage disengage help

# ──────────────────────────────────────────
# Service name variables (match docker-compose.yml)
# ──────────────────────────────────────────

SVC_APP     := subcult-corp-app
SVC_WORKER  := subcult-corp-worker
SVC_SANCTUM := subcult-sanctum
SVC_TOOLBOX := subcult-toolbox

# External postgres container (NOT managed by this compose file)
PG_CONTAINER := pg16-pgvector
PG_USER      := subcult
PG_SUPERUSER := onnwee
PG_DB        := subcult_ops

# Project root on host — for mounting seed scripts into containers
PROJECT_ROOT := $(shell pwd)

# ──────────────────────────────────────────
# Development
# ──────────────────────────────────────────

dev: ## Start Next.js dev server
	npm run dev

build: ## Production build (local)
	npm run build

start: ## Start production server (local)
	npm run start

lint: ## Run ESLint
	npm run lint

typecheck: ## Run TypeScript type-checking (no emit)
	npx tsc --noEmit

clean: ## Remove .next build cache
	rm -rf .next

# ──────────────────────────────────────────
# Docker — Full Stack
# ──────────────────────────────────────────

up: ## Build and start all containers
	docker compose up -d --build --remove-orphans

down: ## Stop all containers
	docker compose down --remove-orphans

restart: ## Restart all containers
	docker compose restart

rebuild: ## Rebuild app images (no cache) and recreate containers (preserves toolbox)
	docker compose build --no-cache $(SVC_APP) $(SVC_WORKER) $(SVC_SANCTUM)
	docker compose up -d --force-recreate --remove-orphans
	docker image prune -f

rebuild-toolbox: ## Rebuild only the toolbox image (slow — Go/Python/security tools)
	docker compose build --no-cache $(SVC_TOOLBOX)
	docker compose up -d --force-recreate $(SVC_TOOLBOX)
	@echo "Toolbox rebuilt."

status: ## Show status of all containers
	docker compose ps

# ──────────────────────────────────────────
# Docker — Logs
# ──────────────────────────────────────────

logs: ## Tail logs from all containers
	docker compose logs -f --tail=50

logs-app: ## Tail app container logs
	docker compose logs -f --tail=50 $(SVC_APP)

logs-worker: ## Tail unified worker logs
	docker compose logs -f --tail=50 $(SVC_WORKER)

logs-toolbox: ## Tail toolbox container logs
	docker compose logs -f --tail=50 $(SVC_TOOLBOX)

logs-db: ## Tail Postgres logs (external container)
	docker logs -f --tail=50 $(PG_CONTAINER)

# ──────────────────────────────────────────
# Database
# ──────────────────────────────────────────

db-migrate: ## Run all SQL migrations against the Postgres container
	@for f in db/migrations/*.sql; do \
		echo "Running $$f..."; \
		docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) < "$$f" 2>&1 | tail -1; \
	done
	@echo "Migrations complete."

db-shell: ## Open psql shell in the Postgres container
	docker exec -it $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB)

# ──────────────────────────────────────────
# Database Seeding
#
# Seeds run inside a one-off app container (same image, same network,
# same DATABASE_URL from .env) with the host scripts/ mounted in.
# This avoids needing Node on the host or baking seed scripts into
# the production image.
# ──────────────────────────────────────────

define RUN_SEED
	docker compose run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps \
		$(SVC_APP) \
		node
endef

seed: ## Seed everything (agents, policies, triggers, relationships)
	$(RUN_SEED) scripts/go-live/seed.mjs

seed-agents: ## Seed agent registry only
	$(RUN_SEED) scripts/go-live/seed.mjs --only agents

seed-policy: ## Seed policies only
	$(RUN_SEED) scripts/go-live/seed.mjs --only policy

seed-triggers: ## Seed trigger rules only
	$(RUN_SEED) scripts/go-live/seed.mjs --only triggers

seed-relationships: ## Seed agent relationships only
	$(RUN_SEED) scripts/go-live/seed.mjs --only relationships

seed-rss: ## Seed RSS feeds only
	$(RUN_SEED) scripts/go-live/seed.mjs --only rss-feeds

seed-discord: ## Seed Discord channels only
	$(RUN_SEED) scripts/go-live/seed.mjs --only discord-channels

purge-discord: ## Purge all messages from Discord channels
	docker compose run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps \
		$(SVC_APP) \
		node scripts/go-live/purge-discord.mjs

# ──────────────────────────────────────────
# Fresh Start
# ──────────────────────────────────────────

nuke: ## Wipe everything: containers, volumes, images, DB — full reset (including toolbox)
	docker compose down -v --rmi local --remove-orphans
	@echo "Nuking database $(PG_DB)..."
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c \
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(PG_DB)' AND pid <> pg_backend_pid();" \
		>/dev/null 2>&1 || true
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "DROP DATABASE IF EXISTS $(PG_DB);" 2>/dev/null || true
	@echo "Nuked. All containers, volumes, local images, and database removed."

fresh: ## Fresh start: stop → nuke DB → rebuild app → migrate → seed (preserves toolbox image)
	docker compose down -v --remove-orphans
	@echo "Nuking database $(PG_DB)..."
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c \
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(PG_DB)' AND pid <> pg_backend_pid();" \
		>/dev/null 2>&1 || true
	docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "DROP DATABASE IF EXISTS $(PG_DB);"
	docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "CREATE DATABASE $(PG_DB) OWNER $(PG_USER);"
	docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d $(PG_DB) -c "CREATE EXTENSION IF NOT EXISTS vector;"
	@echo "Database $(PG_DB) recreated with pgvector."
	docker compose build --no-cache $(SVC_APP) $(SVC_WORKER) $(SVC_SANCTUM)
	@if ! docker image inspect subcult-corp-subcult-toolbox:latest >/dev/null 2>&1; then \
		echo "Toolbox image not found, building..."; \
		docker compose build $(SVC_TOOLBOX); \
	else \
		echo "Toolbox image cached, skipping rebuild."; \
	fi
	docker compose up -d --remove-orphans
	docker image prune -f
	@echo "Waiting for Postgres to be ready..."
	@until docker exec $(PG_CONTAINER) pg_isready -U $(PG_USER) -d $(PG_DB) >/dev/null 2>&1; do sleep 1; done
	$(MAKE) db-migrate
	$(MAKE) seed
	$(MAKE) purge-discord
	docker compose exec $(SVC_TOOLBOX) /usr/local/bin/init-workspace.sh
	@echo "Fresh start complete. Run 'make heartbeat' to kick things off."

prune: ## Clean up orphaned containers, dangling images, and build cache
	docker container prune -f
	docker image prune -f
	docker builder prune -f --filter until=72h
	@echo "Cleanup complete."

init-workspace: ## Re-initialize workspace (dirs, prime directive, permissions)
	docker compose exec $(SVC_TOOLBOX) /usr/local/bin/init-workspace.sh

# ──────────────────────────────────────────
# Verification & Monitoring
# ──────────────────────────────────────────

verify: ## Run launch verification checks
	docker compose run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps \
		$(SVC_APP) \
		node scripts/go-live/verify-launch.mjs

heartbeat: ## Trigger heartbeat (via Docker internal network)
	@CRON_SECRET=$$(grep CRON_SECRET .env 2>/dev/null | cut -d= -f2); \
	docker compose exec $(SVC_APP) wget -qO- \
		--header="Authorization: Bearer $$CRON_SECRET" \
		http://127.0.0.1:3000/api/ops/heartbeat | \
		python3 -m json.tool

engage: ## Enable the system (heartbeat will process work)
	@docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) -c \
		"UPDATE ops_policy SET value = '{\"enabled\": true}' WHERE key = 'system_enabled';" \
		&& echo "System ENGAGED"

disengage: ## Disable the system (heartbeat returns early, no work processed)
	@docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) -c \
		"UPDATE ops_policy SET value = '{\"enabled\": false}' WHERE key = 'system_enabled';" \
		&& echo "System DISENGAGED"

heartbeat-ext: ## Trigger heartbeat (via external URL)
	@CRON_SECRET=$$(grep CRON_SECRET .env 2>/dev/null | cut -d= -f2); \
	curl -s -H "Authorization: Bearer $$CRON_SECRET" \
		https://subcorp.subcult.tv/api/ops/heartbeat | \
		python3 -m json.tool

# ──────────────────────────────────────────
# Help
# ──────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
