-- Egen veckokvot för resepackningar, skild från AI-outfitkvoten. En packning är
-- ett tyngre anrop än en outfit och ska inte äta ur samma pott.
--
-- ai_quota får en kind-dimension i stället för en ny tabell: samma fönsterlogik,
-- samma RPC:er, bara fler hinkar. Befintliga rader blir 'outfit'.
alter table ai_quota add column if not exists kind text not null default 'outfit';
alter table ai_quota drop constraint if exists ai_quota_pkey;
alter table ai_quota add primary key (user_id, kind);

create or replace function use_ai_credit(max_free int, window_seconds int, quota_kind text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now(); pu timestamptz;
begin
  select pro_until into pu from entitlements where user_id = auth.uid();
  if pu is not null and pu > now_ts then
    return true; -- Premium: obegränsat
  end if;
  select window_start, count into ws, cnt from ai_quota
    where user_id = auth.uid() and kind = quota_kind;
  if ws is null then
    insert into ai_quota(user_id, kind, window_start, count)
      values (auth.uid(), quota_kind, now_ts, 1)
      on conflict (user_id, kind) do update set window_start = now_ts, count = 1;
    return true;
  end if;
  if now_ts - ws > make_interval(secs => window_seconds) then
    update ai_quota set window_start = now_ts, count = 1
      where user_id = auth.uid() and kind = quota_kind;
    return true;
  end if;
  if cnt >= max_free then
    return false;
  end if;
  update ai_quota set count = count + 1 where user_id = auth.uid() and kind = quota_kind;
  return true;
end $$;

create or replace function ai_credits_left(max_free int, window_seconds int, quota_kind text)
returns int
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now(); pu timestamptz;
begin
  select pro_until into pu from entitlements where user_id = auth.uid();
  if pu is not null and pu > now_ts then return -1; end if;
  select window_start, count into ws, cnt from ai_quota
    where user_id = auth.uid() and kind = quota_kind;
  if ws is null or now_ts - ws > make_interval(secs => window_seconds) then return max_free; end if;
  return greatest(0, max_free - cnt);
end $$;

-- Tvåargumentsversionerna slutade fungera när PK blev composite: deras
-- "on conflict (user_id)" pekade på en unik constraint som inte finns längre.
-- De delegerar nu till hinken 'outfit' så gamla anrop beter sig som förut.
create or replace function use_ai_credit(max_free int, window_seconds int)
returns boolean
language sql security definer set search_path = public as $$
  select use_ai_credit(max_free, window_seconds, 'outfit');
$$;

create or replace function ai_credits_left(max_free int, window_seconds int)
returns int
language sql security definer set search_path = public as $$
  select ai_credits_left(max_free, window_seconds, 'outfit');
$$;

grant execute on function use_ai_credit(int, int, text) to authenticated;
grant execute on function ai_credits_left(int, int, text) to authenticated;
grant execute on function use_ai_credit(int, int) to authenticated;
grant execute on function ai_credits_left(int, int) to authenticated;
