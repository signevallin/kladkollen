#!/bin/zsh
# Bevisar att en dump går att återställa: startar ett tillfälligt Postgres 17-
# kluster, återställer dumpen dit och skriver radantal per tabell i public.
# Jämför utskriften mot produktionens antal. Klustret raderas efteråt – det
# innehåller persondata.
#
#   scripts/backup/restore-test.sh ~/Backups/skrud/db/skrud-<datum>.dump
set -euo pipefail
# initdb faller tyst med maskinens svenska locale – sätt den explicit.
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
DUMP="${1:?Ange sökväg till en .dump}"
PG=/opt/homebrew/opt/postgresql@17/bin
DIR="$HOME/Backups/skrud/_restoretest"
PORT=55432

cleanup() { "$PG/pg_ctl" -D "$DIR" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
rm -rf "$DIR"
"$PG/initdb" -D "$DIR" -U postgres --auth=trust >/dev/null
"$PG/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
sleep 2
psqlx() { "$PG/psql" -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=0 -q "$@"; }

# Supabases roller och scheman som dumpen refererar till men som inte finns i
# en vanlig Postgres. Utan dem faller RLS-policyer och grants.
psqlx -d postgres <<'SQL'
do $$ begin
  perform 1;
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
  if not exists (select from pg_roles where rolname='supabase_storage_admin') then create role supabase_storage_admin nologin; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
SQL

"$PG/pg_restore" -h "$DIR" -p "$PORT" -U postgres -d postgres \
  --no-owner --no-privileges "$DUMP" 2> "$DIR/restore-errors.log" || true
FEL=$(grep -c "error:" "$DIR/restore-errors.log" || true)
echo "pg_restore-fel: $FEL (roller/funktioner som bara finns i Supabase är väntade)"
grep "error:" "$DIR/restore-errors.log" | sed 's/^/  /' | head -15

echo "--- radantal i public (återställt) ---"
psqlx -d postgres -At -c "
  select format('%s|%s', c.relname,
    (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' order by 1;"
echo "--- auth.users: $(psqlx -d postgres -At -c 'select count(*) from auth.users')"
echo "--- storage.objects: $(psqlx -d postgres -At -c 'select count(*) from storage.objects')"
