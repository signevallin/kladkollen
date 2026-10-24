-- Pinterest-koppling för moodboarden.
--
-- Två tabeller, båda UTAN policies för authenticated: tokens får aldrig nå
-- klienten. Appen pratar med Pinterest via api/pinterest-*.ts, som använder
-- service role. RLS är ändå på, så en läcka av anon-nyckeln inte räcker.
--
-- Båda hänger på auth.users med "on delete cascade" och städas därför av
-- deleteUser i api/delete-account.ts utan att läggas till i dess tabell-lista.

create table if not exists public.pinterest_accounts (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  access_token       text not null,
  refresh_token      text,
  expires_at         timestamptz,
  scopes             text,
  pinterest_username text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- state binder OAuth-omdirigeringen till rätt användare. Utan den skulle
-- callbacken inte veta vems token den tar emot – och vem som helst kunna
-- koppla sitt Pinterest-konto till någon annans Skrud-konto (CSRF).
create table if not exists public.pinterest_oauth_states (
  state      text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index if not exists pinterest_oauth_states_expires_idx
  on public.pinterest_oauth_states (expires_at);

alter table public.pinterest_accounts     enable row level security;
alter table public.pinterest_oauth_states enable row level security;
-- Inga policies med flit: bara service_role kommer åt raderna.

-- Klienten behöver veta OM kontot är kopplat, aldrig själva token.
create or replace function public.pinterest_status()
returns table (connected boolean, username text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select true, a.pinterest_username, a.expires_at
  from public.pinterest_accounts a
  where a.user_id = auth.uid()
  union all
  select false, null::text, null::timestamptz
  where not exists (select 1 from public.pinterest_accounts where user_id = auth.uid())
$$;

revoke all on function public.pinterest_status() from public, anon;
grant execute on function public.pinterest_status() to authenticated;
