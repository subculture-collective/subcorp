#!/usr/bin/env bash
# Heartbeat cron script — calls /api/ops/heartbeat via docker compose exec.
# Install: crontab -e → */2 * * * * /mnt/spektr/server/projects/subcult-corp/scripts/heartbeat-cron.sh >> /tmp/subcult-heartbeat.log 2>&1

set -euo pipefail

SERVICE="subcult-corp-app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "$(date -Iseconds) ERROR: Missing env file at $ENV_FILE"
    exit 1
fi

CRON_SECRET="$(grep '^CRON_SECRET=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
if [ -z "$CRON_SECRET" ]; then
    echo "$(date -Iseconds) ERROR: CRON_SECRET missing in $ENV_FILE"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "$(date -Iseconds) Calling heartbeat via docker compose service $SERVICE..."
if ! STATUS_CODE="$(docker compose exec -T "$SERVICE" sh -c '
    wget -S -q -O /dev/null \
        --header="Authorization: Bearer '"'"$1"'"'" \
        "http://127.0.0.1:3000/api/ops/heartbeat" 2>&1 |
    awk "/^  HTTP\\// { code = \$2 } END { if (code != \"\") print code; else exit 1 }"
' sh "$CRON_SECRET")"; then
    echo "$(date -Iseconds) ERROR: heartbeat request failed"
    exit 1
fi

echo "$(date -Iseconds) Heartbeat status: $STATUS_CODE"
