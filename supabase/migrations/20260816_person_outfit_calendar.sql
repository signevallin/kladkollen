-- Egen kalender för barn. Barn har inga konton, så de kan inte använda
-- outfit_calendar (unik på user_id+date, en outfit per konto och dag). Tidigare
-- planerades barnens outfits via outfits.worn_on – men det är EN datumkolumn, så
-- samma outfit på två datum skrev över det första. Den här tabellen ger barnen en
-- riktig kalender (många datum → samma outfit), isolerad från förälderns egen
-- outfit_calendar så inga befintliga flöden påverkas.
create table if not exists person_outfit_calendar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  outfit_id uuid not null references outfits(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  unique (person_id, date) -- en outfit per barn och dag (upsert-mål)
);

create index if not exists person_outfit_calendar_person_idx on person_outfit_calendar (person_id, date);

alter table person_outfit_calendar enable row level security;

-- Föräldern äger raderna (user_id). Barnet hör till förälderns hushåll.
drop policy if exists "own person_outfit_calendar" on person_outfit_calendar;
create policy "own person_outfit_calendar" on person_outfit_calendar
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on person_outfit_calendar to authenticated;
revoke all on person_outfit_calendar from anon;
