#!/usr/bin/env bash
# Heartbeat cron script — calls /api/ops/heartbeat on the subcult-corp-app container
# Install: crontab -e → */5 * * * * /mnt/spektr/server/projects/subcult-corp/scripts/heartbeat-cron.sh >> /tmp/subcult-heartbeat.log 2>&1

set -euo pipefail

CONTAINER="subcult-corp-app"
PORT=3000
CRON_SECRET="3354b9f3d32874ad10a615589c69c2d0eebfe60952148c22ea469a9d527d7550"

# Resolve container IP on the projects network
IP=$(docker inspect "$CONTAINER" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' 2>/dev/null | awk '{print $1}')

if [ -z "$IP" ]; then
    echo "$(date -Iseconds) ERROR: Container $CONTAINER not running"
    exit 1
fi

echo "$(date -Iseconds) Calling heartbeat at $IP:$PORT..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
    --max-time 300 \
    -H "Authorization: Bearer $CRON_SECRET" \
    "http://$IP:$PORT/api/ops/heartbeat")

echo "$(date -Iseconds) Heartbeat response: HTTP $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
    exit 1
fi
