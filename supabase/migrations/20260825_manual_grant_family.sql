-- Manuellt beviljad access ska ge FULL nivå, inte den lägsta.
--
-- Bakgrund: entitlements-rader som sätts för hand (testare, supportärenden,
-- interna konton) döps 'manual_grant'. Strängen innehåller varken 'family'
-- eller 'partner', så den föll igenom till "känd betald produkt utan
-- nivå-nyckel" och rankades som 1 – lägsta betalda nivån. Kontot fick alltså
-- obegränsad AI men tappade BÅDE par- och familjeläget, tvärtemot avsikten
-- med en manuell grant. Det drabbade samtliga manuellt beviljade konton.
--
-- Rankningen måste hållas i synk med tierFromProductId() i utils/purchases.ts –
-- annars visar gränssnittet en nivå medan den bindande kvoten räknar med en
-- annan. Ordningen är medveten: 'family' och 'partner' prövas FÖRE 'manual', så
-- en manuell grant på lägre nivå fortfarande kan ges genom att döpa den
-- 'manual_grant_partner'. Enbart 'manual_grant' betyder full nivå.
--
-- ⚠️  OBS – DRIFT: funktionen i produktion hade hunnit få en tredje returkolumn
--     (shared_from), en join mot profiles för delarens namn, och en extra
--     sorteringsnyckel som låter EGEN nivå vinna över delad vid lika rank.
--     Inget av det fanns i 20260822_household_shared_entitlements.sql – det var
--     applicerat direkt mot databasen utan migrationsfil. Definitionen nedan är
--     hämtad ur produktion (pg_get_functiondef) och lägger BARA till manual-
--     raden. Skriv aldrig om den här funktionen utifrån den äldre filen; då
--     försvinner shared_from och "täcks av"-texten i appen slutar fungera.

create or replace function effective_entitlement()
returns table(product_id text, pro_until timestamptz, shared_from text)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  tier_of as (
    select e.user_id, e.product_id, e.pro_until,
           case
             when lower(coalesce(e.product_id,'')) like '%family%'
               or lower(coalesce(e.product_id,'')) like '%familj%' then 3
             when lower(coalesce(e.product_id,'')) like '%partner%' then 2
             -- Manuell grant utan uttrycklig nivå = full nivå.
             when lower(coalesce(e.product_id,'')) like '%manual%' then 3
             when e.product_id is not null then 1
             else 0
           end as rank
    from entitlements e
    where e.pro_until > now()
  ),
  own as (
    select t.product_id, t.pro_until, t.rank, null::text as shared_from
    from tier_of t, me where t.user_id = me.uid
  ),
  my_households as (select hm.household_id from household_members hm, me where hm.user_id = me.uid),
  sharers as (
    select hm.user_id, hm.household_id, t.product_id, t.pro_until, t.rank
    from household_members hm
    join my_households mh on mh.household_id = hm.household_id
    join tier_of t on t.user_id = hm.user_id, me
    where hm.user_id <> me.uid and t.rank >= 2
  ),
  shared as (
    select s.product_id, s.pro_until, s.rank,
           coalesce(nullif(trim(p.name), ''), '') as shared_from
    from sharers s
    left join profiles p on p.id = s.user_id, me
    where s.rank = 3
       or (s.rank = 2 and me.uid = (
             select hm2.user_id from household_members hm2
             where hm2.household_id = s.household_id and hm2.user_id <> s.user_id
             order by hm2.created_at, hm2.user_id
             limit 1))
  )
  select product_id, pro_until, shared_from
  from (select * from own union all select * from shared) x
  order by rank desc, (shared_from is null) desc, pro_until desc
  limit 1
$$;

-- Ingen dataändring behövs: befintliga 'manual_grant'-rader får rätt nivå av
-- den nya rankningen. Klienten (tierFromProductId) måste med i samma release.
