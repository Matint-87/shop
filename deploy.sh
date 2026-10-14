#!/usr/bin/env bash
# اجرا روی «کامپیوتر خودت» (داخل پوشه‌ی پروژه):  ./deploy.sh
# کارش: فایل‌های تغییرکرده رو به سرور می‌فرسته، روی سرور build می‌کنه و برنامه رو ری‌استارت می‌کنه.
set -euo pipefail

SERVER="${SERVER:-deploy@YOUR_SERVER_IP}"   # ← IP سرورت رو اینجا بذار (یا: SERVER=deploy@1.2.3.4 ./deploy.sh)
APP_DIR="${APP_DIR:-/var/www/shop}"

cd "$(dirname "$0")"

if [[ "$SERVER" == *YOUR_SERVER_IP* ]]; then
  echo "اول داخل deploy.sh مقدار SERVER رو با IP سرورت عوض کن." >&2
  exit 1
fi

echo "▶ ارسال فایل‌ها به $SERVER:$APP_DIR ..."
rsync -az --delete --info=stats1,progress2 \
  --exclude node_modules --exclude .next --exclude generated \
  --exclude .git --exclude '.env' --exclude '.env.local' --exclude '.env.production' \
  --exclude public/uploads --exclude .deploy-lock-hash --exclude '*.log' \
  ./ "$SERVER:$APP_DIR/"

echo "▶ ساخت و ری‌استارت روی سرور ..."
ssh "$SERVER" "cd $APP_DIR && bash deploy/remote-build.sh"

echo "✅ تموم شد."
