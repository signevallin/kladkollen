-- Låter en sambo läsa (read-only) partnerns garderob, köplista, outfits,
-- kalender och resa. Vanlig RLS lämnas orörd (strikt user_id = auth.uid()) –
-- partnerdata nås ENBART via dessa SECURITY DEFINER-funktioner, som var för sig
-- kontrollerar att målanvändaren är i samma hushåll.

-- Resa lagras nu även i databasen (utöver lokalt) så partnern kan se den.
create table if not exists trips (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb,
  updated_at timestamptz default now()
);
alter table trips enable row level security;
drop policy if exists "own trip" on trips;
create policy "own trip" on trips for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Gemensam vakt: är target en medlem i mitt hushåll?
create or replace function is_household_member(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from household_members
    where user_id = target
      and household_id in (select my_household_ids())
  )
$$;

create or replace function partner_garments(target uuid)
returns setof garments
language sql stable security definer set search_path = public as $$
  select * from garments where user_id = target and is_household_member(target)
$$;

create or replace function partner_wishlist(target uuid)
returns setof wishlist
language sql stable security definer set search_path = public as $$
  select * from wishlist where user_id = target and is_household_member(target)
$$;

create or replace function partner_outfits(target uuid)
returns setof outfits
language sql stable security definer set search_path = public as $$
  select * from outfits where user_id = target and is_household_member(target)
$$;

create or replace function partner_calendar(target uuid)
returns setof outfit_calendar
language sql stable security definer set search_path = public as $$
  select * from outfit_calendar where user_id = target and is_household_member(target)
$$;

create or replace function partner_trip(target uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select data from trips where user_id = target and is_household_member(target)
$$;

grant execute on function is_household_member(uuid) to authenticated;
grant execute on function partner_garments(uuid)    to authenticated;
grant execute on function partner_wishlist(uuid)     to authenticated;
grant execute on function partner_outfits(uuid)      to authenticated;
grant execute on function partner_calendar(uuid)     to authenticated;
grant execute on function partner_trip(uuid)         to authenticated;
