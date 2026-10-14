#!/usr/bin/env bash
# بکاپ روزانه از دیتابیس (عکس‌ها هم داخل دیتابیسن، پس همین یه بکاپ کافیه).
# استفاده با cron:  0 3 * * * /var/www/shop/deploy/backup-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-/var/backups/shop}"
KEEP_DAYS="${KEEP_DAYS:-14}"

DB_URL="$(grep -E '^DATABASE_URL=' .env | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
[ -n "$DB_URL" ] || { echo "DATABASE_URL توی .env پیدا نشد" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/shop-$(date +%Y-%m-%d_%H%M).dump"
pg_dump -Fc "$DB_URL" -f "$FILE"
find "$BACKUP_DIR" -name 'shop-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "بکاپ ساخته شد: $FILE"
