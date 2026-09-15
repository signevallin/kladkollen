#!/bin/zsh
# Daglig backup av Skruds Supabase-databas + bildlagring.
#
# Varför: gratisplanen i Supabase har inga automatiska backuper. Databasen
# innehåller riktiga användares data, inklusive barns namn och födelsedatum,
# och GDPR art. 32 kräver att tillgången kan återställas efter en incident.
#
# Vad som sparas:
#   1. pg_dump (custom format) av auth, public, storage och supabase_migrations
#      – en fil per dygn, de senaste KEEP_DAYS behålls.
#   2. En spegel av garments-bucketen (inkrementell, raderar aldrig lokalt).
#      pg_dump tar bara med storage-METADATA, inte själva bilderna.
#
# Hemligheterna läses ur macOS Nyckelring och finns aldrig i en fil:
#   security add-generic-password -a postgres -s skrud-db-backup -w
#   security add-generic-password -a service-role -s skrud-service-role -w
# (kommandona frågar efter värdet – skriv det där, inte på kommandoraden, så
# hamnar det inte i skalhistoriken)
#
# Inte .env: den enda .env med service role-nyckeln ligger i ~/Documents, som
# synkas till iCloud Drive.
#
# Backuperna ligger utanför iCloud. FileVault krypterar disken.

set -euo pipefail

PROJECT_REF="kplapbfyetzeyplmllto"
DB_HOST="${SKRUD_DB_HOST:?Sätt SKRUD_DB_HOST (session-poolerns host, se README)}"
DB_PORT="${SKRUD_DB_PORT:-5432}"        # session mode – pg_dump fungerar inte i transaction mode (6543)
DB_USER="postgres.${PROJECT_REF}"
BACKUP_ROOT="${SKRUD_BACKUP_DIR:-$HOME/Backups/skrud}"
KEEP_DAYS="${SKRUD_KEEP_DAYS:-14}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"

export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export LANG=en_US.UTF-8

mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/storage" "$BACKUP_ROOT/logs"
LOG="$BACKUP_ROOT/logs/$(date +%F).log"
exec >>"$LOG" 2>&1
echo "=== $(date '+%F %T') start ==="

PGPASSWORD="$(security find-generic-password -a postgres -s skrud-db-backup -w 2>/dev/null)" || {
  echo "FEL: lösenordet saknas i Nyckelringen (tjänst skrud-db-backup)"; exit 1; }
export PGPASSWORD

STAMP="$(date +%F_%H%M)"
DUMP="$BACKUP_ROOT/db/skrud-$STAMP.dump"
TMP="$DUMP.partial"

# Skriv till .partial och byt namn först när pg_dump lyckats – annars kan en
# avbruten körning se ut som en giltig backup.
pg_dump --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname=postgres \
  --format=custom --compress=9 --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage --schema=supabase_migrations \
  --file="$TMP"
mv "$TMP" "$DUMP"

# En backup som inte går att läsa är ingen backup: kontrollera arkivet direkt.
ENTRIES=$(pg_restore --list "$DUMP" | grep -c "TABLE DATA" || true)
if [ "$ENTRIES" -lt 10 ]; then
  echo "FEL: arkivet innehåller bara $ENTRIES tabelldata-poster – behandlas som trasigt"
  mv "$DUMP" "$DUMP.suspect"
  exit 1
fi
echo "db: $(du -h "$DUMP" | cut -f1), $ENTRIES tabeller med data"

# Bilderna. Inkrementellt: bara nya/ändrade filer hämtas.
SUPABASE_SERVICE_ROLE_KEY="$(security find-generic-password -a service-role -s skrud-service-role -w 2>/dev/null)" || {
  echo "FEL: service role-nyckeln saknas i Nyckelringen (tjänst skrud-service-role)"; exit 1; }
SUPABASE_URL="https://${PROJECT_REF}.supabase.co" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  /opt/homebrew/bin/node "$REPO/scripts/backup/mirror-storage.mjs" "$BACKUP_ROOT/storage"

# Rensa gamla dumpar – men aldrig så att färre än 3 finns kvar.
COUNT=$(ls -1 "$BACKUP_ROOT"/db/skrud-*.dump 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt 3 ]; then
  find "$BACKUP_ROOT/db" -name 'skrud-*.dump' -mtime +"$KEEP_DAYS" -print -delete
fi
find "$BACKUP_ROOT/logs" -name '*.log' -mtime +60 -delete

echo "=== $(date '+%F %T') klar ==="
