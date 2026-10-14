#!/usr/bin/env bash
# این فایل روی «سرور» اجرا می‌شه (deploy.sh خودش صداش می‌زنه).
set -euo pipefail
cd "$(dirname "$0")/.."

export NODE_OPTIONS="--max-old-space-size=2048"

# فقط اگه package-lock.json عوض شده باشه npm ci بزن (سریع‌تر)
NEW_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"
OLD_HASH="$(cat .deploy-lock-hash 2>/dev/null || true)"
if [ "$NEW_HASH" != "$OLD_HASH" ] || [ ! -d node_modules ]; then
  echo "▶ نصب پکیج‌ها (npm ci) ..."
  npm ci
  echo "$NEW_HASH" > .deploy-lock-hash
else
  echo "▶ پکیج‌ها تغییری نکردن؛ npm ci رد شد."
fi

echo "▶ ساخت پروژه (migration دیتابیس + prisma generate + next build) ..."
npm run build

echo "▶ ری‌استارت برنامه ..."
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save

echo "▶ بررسی سلامت ..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
    echo "✔ سایت بالاست."
    exit 0
  fi
  sleep 2
done
echo "✖ سایت جواب نداد. لاگ رو ببین:  pm2 logs shop --lines 80" >&2
exit 1
