-- Väntelista för landningssidan (skrud.app). E-post samlas in publikt via
-- api/waitlist.ts, som skriver med service role (bypassar RLS). Inga RLS-
-- policies läggs till → endast service role kan läsa/skriva, aldrig anon.

create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  source     text,
  lang       text,
  stage      text,  -- livsskede: single | couple | family (valfritt)
  created_at timestamptz not null default now()
);

-- Om tabellen redan fanns (skapad innan stage-kolumnen lades till):
alter table waitlist add column if not exists stage text;

alter table waitlist enable row level security;
-- Medvetet inga policies: bara service role (edge-funktionen) når tabellen.
