-- Beständig rate limit (skyddar AI-kostnaderna). Den minnesbaserade räknaren i
-- api/_utils.ts nollställs vid varje edge-instansbyte och stoppar därför inte en
-- ihållande spammare. Den här tabellen + RPC:n lever i databasen och gör det.

create table if not exists api_rate_limits (
  user_id      uuid primary key references auth.users on delete cascade,
  window_start timestamptz not null default now(),
  count        int not null default 0
);
alter table api_rate_limits enable row level security;
-- Ingen policy → ingen direkt klientåtkomst. Bara RPC:n (SECURITY DEFINER) rör tabellen.

-- Ökar räknaren för inloggad användare i ett glidande fönster. Returnerar
-- false när taket nåtts, annars true.
create or replace function bump_rate_limit(max_calls int, window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now();
begin
  select window_start, count into ws, cnt from api_rate_limits where user_id = auth.uid();
  if ws is null then
    insert into api_rate_limits(user_id, window_start, count) values (auth.uid(), now_ts, 1)
      on conflict (user_id) do update set window_start = now_ts, count = 1;
    return true;
  end if;
  if now_ts - ws > make_interval(secs => window_seconds) then
    update api_rate_limits set window_start = now_ts, count = 1 where user_id = auth.uid();
    return true;
  end if;
  if cnt >= max_calls then
    return false;
  end if;
  update api_rate_limits set count = count + 1 where user_id = auth.uid();
  return true;
end $$;

grant execute on function bump_rate_limit(int, int) to authenticated;
