-- ── Grunden för lägesväxlaren (singel → sambo → gravid → familj) ──
-- Sambo är första läget som kräver ett DELAT hushåll. Modellen är byggd så att
-- gravid/familj kan stapla ovanpå senare (people/barn m.m. tillkommer då).

-- Livssituation på profilen ('single' | 'couple' | ... senare)
alter table profiles add column if not exists life_mode text default 'single';

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz default now()
);

create table if not exists household_members (
  household_id uuid references households on delete cascade,
  user_id      uuid references auth.users on delete cascade,
  role         text default 'member',      -- 'owner' | 'member'
  created_at   timestamptz default now(),
  primary key (household_id, user_id)
);

create table if not exists household_invites (
  code         text primary key,
  household_id uuid references households on delete cascade,
  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz default now(),
  expires_at   timestamptz default (now() + interval '7 days')
);

alter table households        enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;

-- Hjälpfunktion: hushålls-id:n för inloggad användare. SECURITY DEFINER gör att
-- den läser household_members UTAN RLS, vilket undviker rekursiva policies.
create or replace function my_household_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select household_id from household_members where user_id = auth.uid()
$$;

-- Medlemmar får läsa sitt hushåll, medlemslistan och partnerns profil.
drop policy if exists "members read household" on households;
create policy "members read household" on households for select
  using (id in (select my_household_ids()));

drop policy if exists "members read members" on household_members;
create policy "members read members" on household_members for select
  using (household_id in (select my_household_ids()));

drop policy if exists "creator reads invite" on household_invites;
create policy "creator reads invite" on household_invites for select
  using (created_by = auth.uid());

drop policy if exists "read household member profiles" on profiles;
create policy "read household member profiles" on profiles for select
  using (id in (select user_id from household_members where household_id in (select my_household_ids())));

-- ── RPC:er (SECURITY DEFINER) för de känsliga operationerna ──

-- Skapar hushåll (om man saknar) och returnerar en delbar inbjudningskod.
create or replace function create_partner_invite()
returns text
language plpgsql security definer set search_path = public as $$
declare hid uuid; c text;
begin
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
  if hid is null then
    insert into households (name, created_by) values ('Vårt hem', auth.uid()) returning id into hid;
    insert into household_members (household_id, user_id, role) values (hid, auth.uid(), 'owner');
  end if;
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into household_invites (code, household_id, created_by) values (c, hid, auth.uid());
  return c;
end $$;

-- Kopplar inloggad användare till hushållet bakom koden. Lämnar ev. tidigare.
create or replace function join_by_invite(invite_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid; cur uuid;
begin
  select household_id into hid from household_invites
    where code = upper(invite_code) and (expires_at is null or expires_at > now());
  if hid is null then raise exception 'Ogiltig eller utgången kod'; end if;
  select household_id into cur from household_members where user_id = auth.uid() limit 1;
  if cur is not null and cur <> hid then
    delete from household_members where user_id = auth.uid();
  end if;
  insert into household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'member') on conflict do nothing;
  return hid;
end $$;

-- Kopplar isär: tar bort medlemskapet och städar bort tomma hushåll.
create or replace function leave_household()
returns void
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
  if hid is null then return; end if;
  delete from household_members where user_id = auth.uid();
  if not exists (select 1 from household_members where household_id = hid) then
    delete from households where id = hid;
  end if;
end $$;

grant execute on function my_household_ids()          to authenticated;
grant execute on function create_partner_invite()      to authenticated;
grant execute on function join_by_invite(text)         to authenticated;
grant execute on function leave_household()            to authenticated;
