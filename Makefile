# ─── SUBCORP — Makefile ───

.PHONY: \
	dev-up dev-down dev-restart dev-rebuild dev-rebuild-toolbox dev-status \
	dev-logs dev-logs-app dev-logs-worker dev-logs-db \
	dev-migrate dev-seed dev-fresh dev-nuke dev-init-workspace \
	dev-heartbeat dev-engage dev-disengage dev-verify \
	prod-up prod-down prod-restart prod-rebuild prod-rebuild-toolbox prod-status \
	prod-logs prod-logs-app prod-logs-worker prod-logs-db \
	prod-migrate prod-seed prod-fresh prod-nuke prod-init-workspace \
	prod-heartbeat prod-engage prod-disengage prod-verify \
	seed-agents seed-policy seed-triggers seed-relationships seed-rss seed-discord \
	purge-discord reset-discord-channels lint typecheck build clean prune help

# ──────────────────────────────────────────
# Variables
# ──────────────────────────────────────────

SVC_APP     := subcorp-app
SVC_WORKER  := subcorp-worker
SVC_SANCTUM := subcorp-sanctum
SVC_TOOLBOX := subcorp-toolbox

PG_CONTAINER := pg16-pgvector
PG_USER      := subcorp
PG_SUPERUSER := onnwee
PG_DB        := subcorp_ops

PROJECT_ROOT := $(shell pwd)
HEARTBEAT_TIMEOUT ?= 180

DEV_COMPOSE  := docker compose -f docker-compose.yml -f docker-compose.dev.yml
PROD_COMPOSE := docker compose -f docker-compose.yml -f docker-compose.override.yml

# ──────────────────────────────────────────
# Dev — Lifecycle
# ──────────────────────────────────────────

dev-up: ## [dev] Build and start all containers
	$(DEV_COMPOSE) up -d --build --remove-orphans

dev-down: ## [dev] Stop all containers
	$(DEV_COMPOSE) down --remove-orphans

dev-restart: ## [dev] Restart all containers
	$(DEV_COMPOSE) restart

dev-rebuild: ## [dev] Rebuild app images (no cache) and recreate containers
	$(DEV_COMPOSE) build --no-cache $(SVC_APP) $(SVC_WORKER) $(SVC_SANCTUM)
	$(DEV_COMPOSE) up -d --force-recreate --remove-orphans
	docker image prune -f

dev-rebuild-toolbox: ## [dev] Rebuild only the toolbox image
	$(DEV_COMPOSE) build --no-cache $(SVC_TOOLBOX)
	$(DEV_COMPOSE) up -d --force-recreate $(SVC_TOOLBOX)

dev-status: ## [dev] Show container status
	$(DEV_COMPOSE) ps

# ──────────────────────────────────────────
# Dev — Logs
# ──────────────────────────────────────────

dev-logs: ## [dev] Tail all container logs
	$(DEV_COMPOSE) logs -f --tail=50

dev-logs-app: ## [dev] Tail app container logs
	$(DEV_COMPOSE) logs -f --tail=50 $(SVC_APP)

dev-logs-worker: ## [dev] Tail worker container logs
	$(DEV_COMPOSE) logs -f --tail=50 $(SVC_WORKER)

dev-logs-db: ## [dev] Tail Postgres logs
	docker logs -f --tail=50 $(PG_CONTAINER)

# ──────────────────────────────────────────
# Dev — Database
# ──────────────────────────────────────────

dev-migrate: ## [dev] Run all SQL migrations
	@for f in db/migrations/*.sql; do \
		echo "Running $$f..."; \
		docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) < "$$f" 2>&1 | tail -1; \
	done
	@echo "Migrations complete."

dev-seed: ## [dev] Seed all ops data
	$(DEV_COMPOSE) run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps $(SVC_APP) node scripts/go-live/seed.mjs

dev-fresh: ## [dev] Stop → rebuild → migrate → seed (no DB nuke)
	$(DEV_COMPOSE) down --remove-orphans
	$(DEV_COMPOSE) build --no-cache $(SVC_APP) $(SVC_WORKER) $(SVC_SANCTUM)
	@if ! docker image inspect subcorp-subcorp-toolbox:latest >/dev/null 2>&1; then \
		echo "Toolbox image not found, building..."; \
		$(DEV_COMPOSE) build $(SVC_TOOLBOX); \
	else \
		echo "Toolbox image cached, skipping rebuild."; \
	fi
	$(DEV_COMPOSE) up -d --remove-orphans
	docker image prune -f
	@echo "Waiting for Postgres to be ready..."
	@until docker exec $(PG_CONTAINER) pg_isready -U $(PG_USER) -d $(PG_DB) >/dev/null 2>&1; do sleep 1; done
	$(MAKE) dev-migrate
	$(MAKE) dev-seed
	$(DEV_COMPOSE) exec $(SVC_TOOLBOX) /usr/local/bin/init-workspace.sh

dev-nuke: ## [dev] Wipe containers, volumes, images, and DB — full reset
	$(DEV_COMPOSE) down -v --rmi local --remove-orphans
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c \
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(PG_DB)' AND pid <> pg_backend_pid();" \
		>/dev/null 2>&1 || true
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "DROP DATABASE IF EXISTS $(PG_DB);" 2>/dev/null || true
	@echo "Nuked."

dev-init-workspace: ## [dev] Re-initialize workspace
	$(DEV_COMPOSE) exec $(SVC_TOOLBOX) /usr/local/bin/init-workspace.sh

# ──────────────────────────────────────────
# Dev — Ops
# ──────────────────────────────────────────

dev-heartbeat: ## [dev] Trigger heartbeat
	@CRON_SECRET=$$(grep -E '^CRON_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'"); \
	$(DEV_COMPOSE) exec $(SVC_APP) wget -qO- --timeout=30 \
		--header="Authorization: Bearer $$CRON_SECRET" \
		http://127.0.0.1:3000/api/ops/heartbeat | python3 -m json.tool

dev-engage: ## [dev] Enable the system
	@docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) -c \
		"UPDATE ops_policy SET value = '{\"enabled\": true}' WHERE key = 'system_enabled';" \
		&& echo "System ENGAGED"

dev-disengage: ## [dev] Disable the system
	@docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) -c \
		"UPDATE ops_policy SET value = '{\"enabled\": false}' WHERE key = 'system_enabled';" \
		&& echo "System DISENGAGED"

dev-verify: ## [dev] Run launch verification checks
	$(DEV_COMPOSE) run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps $(SVC_APP) node scripts/go-live/verify-launch.mjs

# ──────────────────────────────────────────
# Prod — Lifecycle
# ──────────────────────────────────────────

prod-up: ## [prod] Build and start all containers
	$(PROD_COMPOSE) up -d --build --remove-orphans

prod-down: ## [prod] Stop all containers
	$(PROD_COMPOSE) down --remove-orphans

prod-restart: ## [prod] Restart all containers
	$(PROD_COMPOSE) restart

prod-rebuild: ## [prod] Rebuild app images (no cache) and recreate containers
	$(PROD_COMPOSE) build --no-cache $(SVC_APP) $(SVC_WORKER) $(SVC_SANCTUM)
	$(PROD_COMPOSE) up -d --force-recreate --remove-orphans
	docker image prune -f

prod-rebuild-toolbox: ## [prod] Rebuild only the toolbox image
	$(PROD_COMPOSE) build --no-cache $(SVC_TOOLBOX)
	$(PROD_COMPOSE) up -d --force-recreate $(SVC_TOOLBOX)

prod-status: ## [prod] Show container status
	$(PROD_COMPOSE) ps

# ──────────────────────────────────────────
# Prod — Logs
# ──────────────────────────────────────────

prod-logs: ## [prod] Tail all container logs
	$(PROD_COMPOSE) logs -f --tail=50

prod-logs-app: ## [prod] Tail app container logs
	$(PROD_COMPOSE) logs -f --tail=50 $(SVC_APP)

prod-logs-worker: ## [prod] Tail worker container logs
	$(PROD_COMPOSE) logs -f --tail=50 $(SVC_WORKER)

prod-logs-db: ## [prod] Tail Postgres logs
	docker logs -f --tail=50 $(PG_CONTAINER)

# ──────────────────────────────────────────
# Prod — Database
# ──────────────────────────────────────────

prod-migrate: ## [prod] Run all SQL migrations
	@for f in db/migrations/*.sql; do \
		echo "Running $$f..."; \
		docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) < "$$f" 2>&1 | tail -1; \
	done
	@echo "Migrations complete."

prod-seed: ## [prod] Seed all ops data
	$(PROD_COMPOSE) run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps $(SVC_APP) node scripts/go-live/seed.mjs

prod-fresh: ## [prod] Stop → nuke DB → rebuild → migrate → seed → init workspace
	$(PROD_COMPOSE) down -v --remove-orphans
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c \
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(PG_DB)' AND pid <> pg_backend_pid();" \
		>/dev/null 2>&1 || true
	docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "DROP DATABASE IF EXISTS $(PG_DB);"
	docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "CREATE DATABASE $(PG_DB) OWNER $(PG_USER);"
	docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d $(PG_DB) -c "CREATE EXTENSION IF NOT EXISTS vector;"
	@echo "Database $(PG_DB) recreated with pgvector."
	$(PROD_COMPOSE) build --no-cache $(SVC_APP) $(SVC_WORKER) $(SVC_SANCTUM)
	@if ! docker image inspect subcorp-subcorp-toolbox:latest >/dev/null 2>&1; then \
		echo "Toolbox image not found, building..."; \
		$(PROD_COMPOSE) build $(SVC_TOOLBOX); \
	else \
		echo "Toolbox image cached, skipping rebuild."; \
	fi
	$(PROD_COMPOSE) up -d --remove-orphans
	docker image prune -f
	@echo "Waiting for Postgres to be ready..."
	@until docker exec $(PG_CONTAINER) pg_isready -U $(PG_USER) -d $(PG_DB) >/dev/null 2>&1; do sleep 1; done
	$(MAKE) prod-migrate
	$(MAKE) prod-seed
	$(PROD_COMPOSE) exec $(SVC_TOOLBOX) /usr/local/bin/init-workspace.sh
	@echo "Fresh start complete."

prod-nuke: ## [prod] Wipe containers, volumes, images, and DB — full reset
	$(PROD_COMPOSE) down -v --rmi local --remove-orphans
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c \
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(PG_DB)' AND pid <> pg_backend_pid();" \
		>/dev/null 2>&1 || true
	@docker exec $(PG_CONTAINER) psql -U $(PG_SUPERUSER) -d postgres -c "DROP DATABASE IF EXISTS $(PG_DB);" 2>/dev/null || true
	@echo "Nuked."

prod-init-workspace: ## [prod] Re-initialize workspace
	$(PROD_COMPOSE) exec $(SVC_TOOLBOX) /usr/local/bin/init-workspace.sh

# ──────────────────────────────────────────
# Prod — Ops
# ──────────────────────────────────────────

prod-heartbeat: ## [prod] Trigger heartbeat
	@CRON_SECRET=$$(grep -E '^CRON_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'"); \
	$(PROD_COMPOSE) exec $(SVC_APP) wget -qO- --timeout=$(HEARTBEAT_TIMEOUT) \
		--header="Authorization: Bearer $$CRON_SECRET" \
		http://127.0.0.1:3000/api/ops/heartbeat | python3 -m json.tool

prod-heartbeat-ext: ## [prod] Trigger heartbeat via external URL
	@CRON_SECRET=$$(grep -E '^CRON_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'"); \
	curl -s -H "Authorization: Bearer $$CRON_SECRET" \
		https://subcorp.subcult.tv/api/ops/heartbeat | python3 -m json.tool

prod-engage: ## [prod] Enable the system
	@docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) -c \
		"UPDATE ops_policy SET value = '{\"enabled\": true}' WHERE key = 'system_enabled';" \
		&& echo "System ENGAGED"

prod-disengage: ## [prod] Disable the system
	@docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) -c \
		"UPDATE ops_policy SET value = '{\"enabled\": false}' WHERE key = 'system_enabled';" \
		&& echo "System DISENGAGED"

prod-verify: ## [prod] Run launch verification checks
	$(PROD_COMPOSE) run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps $(SVC_APP) node scripts/go-live/verify-launch.mjs

# ──────────────────────────────────────────
# Shared — Seeding
# ──────────────────────────────────────────

define RUN_SEED_DEV
	$(DEV_COMPOSE) run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps $(SVC_APP) node
endef

seed-agents: ## Seed agent registry only
	$(RUN_SEED_DEV) scripts/go-live/seed.mjs --only agents

seed-policy: ## Seed policies only
	$(RUN_SEED_DEV) scripts/go-live/seed.mjs --only policy

seed-triggers: ## Seed trigger rules only
	$(RUN_SEED_DEV) scripts/go-live/seed.mjs --only triggers

seed-relationships: ## Seed agent relationships only
	$(RUN_SEED_DEV) scripts/go-live/seed.mjs --only relationships

seed-rss: ## Seed RSS feeds only
	$(RUN_SEED_DEV) scripts/go-live/seed.mjs --only rss-feeds

seed-discord: ## Seed Discord channels only
	$(RUN_SEED_DEV) scripts/go-live/seed.mjs --only discord-channels

purge-discord: ## Purge all messages from Discord channels
	$(PROD_COMPOSE) run --rm \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		--no-deps $(SVC_APP) node scripts/go-live/purge-discord.mjs

reset-discord-channels: ## Fast wipe Discord channels by clone/delete; updates .env + DB, then restarts app/worker
	$(PROD_COMPOSE) run --rm \
		--user root \
		-v $(PROJECT_ROOT)/scripts/go-live:/app/scripts/go-live:ro \
		-v $(PROJECT_ROOT)/scripts/lib:/app/scripts/lib:ro \
		-v $(PROJECT_ROOT)/.env:/app/.env \
		--no-deps $(SVC_APP) node scripts/go-live/reset-discord-channels.mjs --yes --write-env
	$(PROD_COMPOSE) restart $(SVC_APP) $(SVC_WORKER)

# ──────────────────────────────────────────
# Shared — Local dev (no Docker)
# ──────────────────────────────────────────

build: ## Production build (local)
	npm run build

lint: ## Run ESLint
	npm run lint

typecheck: ## Run TypeScript type-checking
	npx tsc --noEmit

clean: ## Remove .next build cache
	rm -rf .next

# ──────────────────────────────────────────
# Shared — Maintenance
# ──────────────────────────────────────────

prune: ## Clean up orphaned containers, dangling images, and build cache
	docker container prune -f
	docker image prune -f
	docker builder prune -f --filter until=72h
	@echo "Cleanup complete."

# ──────────────────────────────────────────
# Help
# ──────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
