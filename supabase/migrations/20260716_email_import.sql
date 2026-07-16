-- Mejl-import: unik import-adress per användare + väntande importer.
-- Kör i Supabase SQL Editor (eller via CLI) innan funktionen tas i bruk.

-- 1) Unik import-token per användare (bygger adressen {token}@import.kladkollen.se)
alter table profiles add column if not exists import_token text;
update profiles
  set import_token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
  where import_token is null;
alter table profiles alter column import_token set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
create unique index if not exists profiles_import_token_key on profiles (import_token);

-- 2) Senaste Gmail-vidarebefordringskod (visas i appen vid verifiering av adressen)
alter table profiles add column if not exists forward_code text;

-- 3) Väntande importer – plagg som AI:n plockat ur inkommande mejl, väntar på granskning
create table if not exists pending_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  price text,
  order_date text,
  category text,
  color text,
  season text,
  image_url text,
  source text,
  created_at timestamptz default now()
);

alter table pending_imports enable row level security;

drop policy if exists "own pending imports" on pending_imports;
create policy "own pending imports" on pending_imports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists pending_imports_user_idx on pending_imports (user_id, created_at desc);
