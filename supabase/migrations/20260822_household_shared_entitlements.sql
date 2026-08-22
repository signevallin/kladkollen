-- Nivåer delas inom hushållet. Utan det betalade ett par 2×Partner (mer än
-- Familj) och en familj 2×Familj – nivåerna är prissatta som hushållsprodukter
-- men såldes som individuella.
--
-- Partner täcker köparen plus EN annan vuxen (max 2). Finns fler vuxna avgör vem
-- som gick med först – deterministiskt, till skillnad från "någon av dem".
-- Familj täcker alla vuxna i hushållet. Singel delas inte.
--
-- SECURITY DEFINER krävs: RLS på entitlements släpper bara igenom egen rad, och
-- hela poängen är att kunna se partnerns.
create or replace function effective_entitlement()
returns table(product_id text, pro_until timestamptz)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  tier_of as (
    select e.user_id, e.product_id, e.pro_until,
           case
             when lower(coalesce(e.product_id,'')) like '%family%'
               or lower(coalesce(e.product_id,'')) like '%familj%' then 3
             when lower(coalesce(e.product_id,'')) like '%partner%' then 2
             when e.product_id is not null then 1
             else 0
           end as rank
    from entitlements e
    where e.pro_until > now()
  ),
  own as (select t.product_id, t.pro_until, t.rank from tier_of t, me where t.user_id = me.uid),
  my_households as (select hm.household_id from household_members hm, me where hm.user_id = me.uid),
  sharers as (
    select hm.user_id, hm.household_id, t.product_id, t.pro_until, t.rank
    from household_members hm
    join my_households mh on mh.household_id = hm.household_id
    join tier_of t on t.user_id = hm.user_id, me
    where hm.user_id <> me.uid and t.rank >= 2
  ),
  shared as (
    select s.product_id, s.pro_until, s.rank
    from sharers s, me
    where s.rank = 3
       or (s.rank = 2 and me.uid = (
             select hm2.user_id from household_members hm2
             where hm2.household_id = s.household_id and hm2.user_id <> s.user_id
             order by hm2.created_at, hm2.user_id
             limit 1))
  )
  select product_id, pro_until
  from (select * from own union all select * from shared) x
  order by rank desc, pro_until desc
  limit 1
$$;

grant execute on function effective_entitlement() to authenticated;

-- Kvoterna måste använda SAMMA sanning. Annars ser den täckta partnern "Premium"
-- men nekas ändå AI-outfits och packningar – värre än att inte dela alls.
create or replace function use_ai_credit(max_free int, window_seconds int, quota_kind text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now(); pu timestamptz;
begin
  select pro_until into pu from effective_entitlement();
  if pu is not null and pu > now_ts then return true; end if;
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
  if cnt >= max_free then return false; end if;
  update ai_quota set count = count + 1 where user_id = auth.uid() and kind = quota_kind;
  return true;
end $$;

create or replace function ai_credits_left(max_free int, window_seconds int, quota_kind text)
returns int
language plpgsql security definer set search_path = public as $$
declare ws timestamptz; cnt int; now_ts timestamptz := now(); pu timestamptz;
begin
  select pro_until into pu from effective_entitlement();
  if pu is not null and pu > now_ts then return -1; end if;
  select window_start, count into ws, cnt from ai_quota
    where user_id = auth.uid() and kind = quota_kind;
  if ws is null or now_ts - ws > make_interval(secs => window_seconds) then return max_free; end if;
  return greatest(0, max_free - cnt);
end $$;
