#!/usr/bin/env bash
# 日次レポート自動実行スクリプト
# crontab に以下を追加して使用:
#   0 7 * * * /path/to/Retratle/scripts/daily-report.sh >> /var/log/retratle-daily.log 2>&1

set -euo pipefail

APP_URL="${RETRATLE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"
LOG_DATE=$(date '+%Y-%m-%d %H:%M:%S JST')

echo "[$LOG_DATE] 日次レポート生成開始..."

AUTH_HEADER=""
if [ -n "$CRON_SECRET" ]; then
  AUTH_HEADER="-H \"Authorization: Bearer $CRON_SECRET\""
fi

RESPONSE=$(curl -s -X POST \
  "${APP_URL}/api/daily-report" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER:+-H "Authorization: Bearer $CRON_SECRET"} \
  -d '{"postToX": false}' \
  --max-time 120)

SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null || echo "false")
MESSAGE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || echo "")

if [ "$SUCCESS" = "True" ] || [ "$SUCCESS" = "true" ]; then
  echo "[$LOG_DATE] ✓ 完了: $MESSAGE"
else
  echo "[$LOG_DATE] ✗ エラー: $RESPONSE"
  exit 1
fi
