-- ── Skrud Premium: entitlements + gratis-AI-kvot ────────────────────────────
-- Freemium: gratis grund + begränsad AI. Premium låser upp obegränsad AI,
-- familj/par och avancerad statistik.

-- Entitlements sätts ENDAST av RevenueCat-webhooken (service role). Klienten får
-- bara läsa sin egen rad (för UI). pro_until i framtiden = Premium aktiv.
-- Att klienten inte kan skriva hit är det som gör pro-statusen pålitlig serverside.
create table if not exists entitlements (
  user_id    uuid primary key references auth.users on delete cascade,
  pro_until  timestamptz,
  product_id text,
  updated_at timestamptz not null default now()
);
alter table entitlements enable row level security;
drop policy if exists "read own entitlement" on entitlements;
create policy "read own entitlement" on entitlements for select using (auth.uid() = user_id);
-- Medvetet ingen insert/update/delete-policy → bara service role (webhook) skriver.

-- Veckokvot för gratis AI-genereringar.
create table if not exists ai_quota (
  user_id      uuid primary key references auth.users on delete cascade,
  window_start timestamptz not null default now(),
  count        int not null default 0
);
alter table ai_quota enable row level security;
-- Ingen policy → bara RPC:erna (security definer) rör tabellen.

-- Drar en gratis-AI-kredit. Pro-användare (giltig entitlement) räknas inte och
-- får alltid true. Returnerar false när gratis-taket för fönstret nåtts.
create or replace function use_ai_credit(max_free int, window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now(); pu timestamptz;
begin
  select pro_until into pu from entitlements where user_id = auth.uid();
  if pu is not null and pu > now_ts then
    return true; -- Premium: obegränsat
  end if;
  select window_start, count into ws, cnt from ai_quota where user_id = auth.uid();
  if ws is null then
    insert into ai_quota(user_id, window_start, count) values (auth.uid(), now_ts, 1)
      on conflict (user_id) do update set window_start = now_ts, count = 1;
    return true;
  end if;
  if now_ts - ws > make_interval(secs => window_seconds) then
    update ai_quota set window_start = now_ts, count = 1 where user_id = auth.uid();
    return true;
  end if;
  if cnt >= max_free then
    return false;
  end if;
  update ai_quota set count = count + 1 where user_id = auth.uid();
  return true;
end $$;
grant execute on function use_ai_credit(int, int) to authenticated;

-- Läser återstående gratis-genereringar för UI. -1 = obegränsat (Premium).
create or replace function ai_credits_left(max_free int, window_seconds int)
returns int
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now(); pu timestamptz;
begin
  select pro_until into pu from entitlements where user_id = auth.uid();
  if pu is not null and pu > now_ts then return -1; end if;
  select window_start, count into ws, cnt from ai_quota where user_id = auth.uid();
  if ws is null or now_ts - ws > make_interval(secs => window_seconds) then return max_free; end if;
  return greatest(0, max_free - cnt);
end $$;
grant execute on function ai_credits_left(int, int) to authenticated;
