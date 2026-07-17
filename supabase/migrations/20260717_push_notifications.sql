-- Push-notiser: token, plats (för väderbaserade notiser) och inställningar.
-- Kör i Supabase SQL Editor.
alter table profiles add column if not exists push_token text;
alter table profiles add column if not exists push_platform text;
alter table profiles add column if not exists push_lat double precision;
alter table profiles add column if not exists push_lon double precision;
alter table profiles add column if not exists notif_enabled boolean not null default true;
alter table profiles add column if not exists notif_prefs jsonb not null
  default '{"weather":true,"rediscovery":true,"ootd":true,"logreminder":true,"seasonal":true}'::jsonb;
-- Dedup: håller "YYYY-MM-DD:slot" så samma slot inte skickas två gånger.
alter table profiles add column if not exists last_notif_date text;
alter table profiles add column if not exists last_notif_kind text;

-- Servern (cron) hittar mottagare snabbt.
create index if not exists profiles_push_idx on profiles (push_token) where push_token is not null;
