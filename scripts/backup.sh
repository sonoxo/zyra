#!/bin/bash
# Zyra Backup Script - Daily Snapshots
# Usage: ./backup.sh [--keep DAYS]
# Cron: 0 2 * * * /root/.openclaw/workspace/zyra-landing/scripts/backup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/zyra}"
KEEP_DAYS="${1:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "🛡️ Starting Zyra backup at $(date)"

# Backup SQLite database
DB_PATH="$PROJECT_DIR/prisma/dev.db"
if [ -f "$DB_PATH" ]; then
    DB_BACKUP="$BACKUP_DIR/zyra_db_$TIMESTAMP.sqlite"
    cp "$DB_PATH" "$DB_BACKUP"
    echo "✅ Database backed up: $DB_BACKUP"
else
    echo "⚠️ No database found at $DB_PATH"
fi

# Backup environment files (exclude secrets in production)
CONFIG_BACKUP="$BACKUP_DIR/zyra_config_$TIMESTAMP.tar.gz"
tar -czf "$CONFIG_BACKUP" \
    -C "$PROJECT_DIR" \
    .env.example \
    next.config.mjs \
    tsconfig.json \
    tailwind.config.ts \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='node_modules' \
    --exclude='.next' \
    2>/dev/null || true
echo "✅ Config backed up: $CONFIG_BACKUP"

# Backup Prisma schema
SCHEMA_BACKUP="$BACKUP_DIR/zyra_schema_$TIMESTAMP.prisma"
cp "$PROJECT_DIR/prisma/schema.prisma" "$SCHEMA_BACKUP" 2>/dev/null || true
[ -f "$SCHEMA_BACKUP" ] && echo "✅ Schema backed up: $SCHEMA_BACKUP"

# Backup scripts
SCRIPTS_BACKUP="$BACKUP_DIR/zyra_scripts_$TIMESTAMP.tar.gz"
tar -czf "$SCRIPTS_BACKUP" -C "$PROJECT_DIR" scripts/ 2>/dev/null || true
[ -f "$SCRIPTS_BACKUP" ] && echo "✅ Scripts backed up: $SCRIPTS_BACKUP"

# Cleanup old backups
find "$BACKUP_DIR" -name "zyra_db_*.sqlite" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "zyra_config_*.tar.gz" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "zyra_schema_*.prisma" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "zyra_scripts_*.tar.gz" -mtime +$KEEP_DAYS -delete

echo "✅ Old backups cleaned (kept last $KEEP_DAYS days)"
echo "🛡️ Backup complete at $(date)"

# List remaining backups
echo "📦 Current backups:"
ls -lh "$BACKUP_DIR"/zyra_* 2>/dev/null | tail -5# Zyra Daily Backups (run as root)
# Add to crontab: crontab -e
0 2 * * * /root/.openclaw/workspace/zyra-landing/scripts/backup.sh >> /var/log/zyra-backup.log 2>&1
