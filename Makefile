# ─── SUBCORP — Makefile ───

.PHONY: dev build start lint typecheck clean \
        seed seed-agents seed-policy seed-triggers seed-relationships seed-rss seed-discord \
        purge-discord \
        verify up down restart status logs logs-app logs-worker logs-db \
        heartbeat db-migrate db-shell nuke fresh init-workspace \
        rebuild-toolbox prune \
        engage disengage help

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
	docker compose build --no-cache app worker sanctum
	docker compose up -d --force-recreate --remove-orphans
	docker image prune -f

rebuild-toolbox: ## Rebuild only the toolbox image (slow — Go/Python/security tools)
	docker compose build --no-cache toolbox
	docker compose up -d --force-recreate toolbox
	@echo "Toolbox rebuilt."

status: ## Show status of all containers
	docker compose ps

# ──────────────────────────────────────────
# Docker — Logs
# ──────────────────────────────────────────

logs: ## Tail logs from all containers
	docker compose logs -f --tail=50

logs-app: ## Tail app container logs
	docker compose logs -f --tail=50 app

logs-worker: ## Tail unified worker logs
	docker compose logs -f --tail=50 worker

logs-toolbox: ## Tail toolbox container logs
	docker compose logs -f --tail=50 toolbox

logs-db: ## Tail Postgres logs
	docker compose logs -f --tail=50 postgres

# ──────────────────────────────────────────
# Database
# ──────────────────────────────────────────

db-migrate: ## Run all SQL migrations against the container DB
	@for f in db/migrations/*.sql; do \
		echo "Running $$f..."; \
		docker compose exec -T postgres psql -U subcult -d subcult_ops -f - < "$$f" 2>&1 | tail -1; \
	done
	@echo "Migrations complete."

db-shell: ## Open psql shell in the Postgres container
	docker compose exec postgres psql -U subcult -d subcult_ops

# ──────────────────────────────────────────
# Database Seeding
# ──────────────────────────────────────────

DB_URL := postgresql://subcult:$(shell grep POSTGRES_PASSWORD .env.local | cut -d= -f2)@127.0.0.1:5433/subcult_ops

seed: ## Seed everything (agents, policies, triggers, relationships)
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs

seed-agents: ## Seed agent registry only
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs --only agents

seed-policy: ## Seed policies only
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs --only policy

seed-triggers: ## Seed trigger rules only
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs --only triggers

seed-relationships: ## Seed agent relationships only
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs --only relationships

seed-rss: ## Seed RSS feeds only
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs --only rss-feeds

seed-discord: ## Seed Discord channels only
	DATABASE_URL="$(DB_URL)" node scripts/go-live/seed.mjs --only discord-channels

purge-discord: ## Purge all messages from Discord channels
	DATABASE_URL="$(DB_URL)" node scripts/go-live/purge-discord.mjs

# ──────────────────────────────────────────
# Fresh Start
# ──────────────────────────────────────────

nuke: ## Wipe everything: containers, volumes, images — full reset (including toolbox)
	docker compose down -v --rmi local --remove-orphans
	@echo "Nuked. All containers, volumes, and local images removed."

fresh: ## Fresh start: stop → rebuild app → migrate → seed (preserves toolbox image)
	docker compose down -v --remove-orphans
	docker compose build --no-cache app worker sanctum
	@if ! docker image inspect subcult-toolbox:latest >/dev/null 2>&1; then \
		echo "Toolbox image not found, building..."; \
		docker compose build toolbox; \
	else \
		echo "Toolbox image cached, skipping rebuild."; \
	fi
	docker compose up -d --remove-orphans
	docker image prune -f
	@echo "Waiting for Postgres to be healthy..."
	@until docker compose exec -T postgres pg_isready -U subcult -d subcult_ops >/dev/null 2>&1; do sleep 1; done
	$(MAKE) db-migrate
	$(MAKE) seed
	$(MAKE) purge-discord
	docker compose exec toolbox /usr/local/bin/init-workspace.sh
	@echo "Fresh start complete. Run 'make heartbeat' to kick things off."

prune: ## Clean up orphaned containers, dangling images, and build cache
	docker container prune -f
	docker image prune -f
	docker builder prune -f --filter until=72h
	@echo "Cleanup complete."

init-workspace: ## Re-initialize workspace (dirs, prime directive, permissions)
	docker compose exec toolbox /usr/local/bin/init-workspace.sh

# ──────────────────────────────────────────
# Verification & Monitoring
# ──────────────────────────────────────────

verify: ## Run launch verification checks
	DATABASE_URL="$(DB_URL)" node scripts/go-live/verify-launch.mjs

heartbeat: ## Trigger heartbeat (via Docker internal network)
	@CRON_SECRET=$$(grep CRON_SECRET .env.local 2>/dev/null | cut -d= -f2); \
	docker compose exec app wget -qO- \
		--header="Authorization: Bearer $$CRON_SECRET" \
		http://127.0.0.1:3000/api/ops/heartbeat | \
		python3 -m json.tool

engage: ## Enable the system (heartbeat will process work)
	@docker compose exec -T postgres psql -U subcult -d subcult_ops -c \
		"UPDATE ops_policy SET value = '{\"enabled\": true}' WHERE key = 'system_enabled';" \
		&& echo "System ENGAGED"

disengage: ## Disable the system (heartbeat returns early, no work processed)
	@docker compose exec -T postgres psql -U subcult -d subcult_ops -c \
		"UPDATE ops_policy SET value = '{\"enabled\": false}' WHERE key = 'system_enabled';" \
		&& echo "System DISENGAGED"

heartbeat-ext: ## Trigger heartbeat (via external URL)
	@CRON_SECRET=$$(grep CRON_SECRET .env.local 2>/dev/null | cut -d= -f2); \
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
