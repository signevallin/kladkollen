-- ── Familjeläget, steg 1–2: personer (barn & vuxna) i hushållet ──
-- Bygger på hushållsmodellen (20260724). En "person" är alla i familjen –
-- barn utan eget inlogg OCH vuxna – till skillnad från household_members som
-- bara är vuxna med app-konto. Storlek hålls i cm (EU-skalan) för barn.

create table if not exists people (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households on delete cascade,
  type             text not null default 'child' check (type in ('child', 'adult')),
  name             text not null,
  birthdate        date,                 -- driver ålder/tillväxt för barn
  gender           text,                 -- valfritt, för filtrering
  current_size_cm  int,                  -- barn: aktuell storlek (EU cm)
  size_updated_at  timestamptz,
  avatar_url       text,
  created_at       timestamptz default now()
);

alter table people enable row level security;

-- Alla hushållsmedlemmar får se och hantera personerna i sitt hushåll.
-- my_household_ids() (security definer) undviker rekursiv RLS.
drop policy if exists "household reads people" on people;
create policy "household reads people" on people for select
  using (household_id in (select my_household_ids()));

drop policy if exists "household inserts people" on people;
create policy "household inserts people" on people for insert
  with check (household_id in (select my_household_ids()));

drop policy if exists "household updates people" on people;
create policy "household updates people" on people for update
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

drop policy if exists "household deletes people" on people;
create policy "household deletes people" on people for delete
  using (household_id in (select my_household_ids()));

-- Ser till att inloggad användare har ett hushåll (skapar ett solo-hushåll om
-- inget finns) och returnerar dess id. Behövs för att en ensamstående förälder
-- ska kunna lägga till barn utan att först koppla ihop sig med en partner.
create or replace function ensure_household()
returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
  if hid is not null then return hid; end if;
  insert into households (name, created_by) values ('Mitt hushåll', auth.uid()) returning id into hid;
  insert into household_members (household_id, user_id, role) values (hid, auth.uid(), 'owner');
  return hid;
end $$;

grant execute on function ensure_household() to authenticated;
