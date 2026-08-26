-- Aktiveringsmåttet fick ett mognadsfönster och en intern-flagga.
--
-- Utan dem mätte siffran fel åt båda hållen: konton som var timmar gamla
-- räknades som "inte aktiverade", och egna testkonton räknades som riktiga
-- användare. Resultatet blev att andelen RASADE varje gång appen fick nya
-- användare – alltså precis när man tittar på dashboarden.
--
-- Två ändringar:
--   • Kohorten omfattar bara konton äldre än 48 timmar. Färska konton redovisas
--     separat under "fresh", utan omdöme – de visar fart, inte kvalitet.
--   • profiles.internal utesluter test- och utvecklarkonton.

alter table profiles add column if not exists internal boolean not null default false;

comment on column profiles.internal is
  'Test- och utvecklarkonton. Utesluts ur aktiveringsmåttet på översiktssidan så egna konton inte räknas som riktiga användare.';

create or replace function public.dashboard_stats()
returns jsonb
language sql stable security definer set search_path = public, storage, auth as $$
  with
  u as (
    select count(*)                                                            as total,
           count(*) filter (where created_at > now() - interval '7 days')      as new_7d,
           count(*) filter (where last_sign_in_at > now() - interval '7 days')  as active_7d
    from auth.users
  ),
  real_users as (
    select au.id, au.created_at
    from auth.users au
    left join profiles p on p.id = au.id
    where coalesce(p.internal, false) = false
  ),
  cohort as (
    select id from real_users
    where created_at between now() - interval '30 days' and now() - interval '48 hours'
  ),
  act as (
    select
      (select count(*) from cohort)                                              as cohort,
      (select count(*) from cohort c where exists
        (select 1 from garments g where g.user_id = c.id))                       as with_garment,
      (select count(*) from cohort c where exists
        (select 1 from outfits o where o.user_id = c.id))                        as with_outfit,
      (select count(*) from cohort c where exists
        (select 1 from garments g where g.user_id = c.id)
        and exists (select 1 from outfits o where o.user_id = c.id))             as activated
  ),
  fresh as (
    select
      count(*)                                                                   as last_24h,
      count(*) filter (where exists (select 1 from garments g where g.user_id = r.id)) as with_garment
    from real_users r
    where r.created_at > now() - interval '24 hours'
  ),
  st as (
    select count(*) as objects, coalesce(sum((metadata->>'size')::bigint), 0) as bytes
    from storage.objects where bucket_id = 'garments'
  ),
  quota as (
    select count(*) filter (where kind = 'outfit' and count >= 3
      and window_start > now() - interval '7 days') as at_cap_outfit
    from ai_quota
  ),
  ent as (
    select
      count(*) filter (where pro_until > now())                                  as active_total,
      count(*) filter (where pro_until > now() and lower(coalesce(product_id,'')) like '%manual%')  as manual,
      count(*) filter (where pro_until > now() and lower(coalesce(product_id,'')) like '%family%')  as family,
      count(*) filter (where pro_until > now() and lower(coalesce(product_id,'')) like '%partner%') as partner
    from entitlements
  ),
  cron as (select max(last_notif_date) as last_notif from profiles)
  select jsonb_build_object(
    'generated_at', now(),
    'users', (select to_jsonb(u) from u),
    'activation', (select to_jsonb(act) from act),
    'fresh', (select to_jsonb(fresh) from fresh),
    'content', jsonb_build_object(
      'garments',   (select count(*) from garments),
      'outfits',    (select count(*) from outfits),
      'wishlist',   (select count(*) from wishlist),
      'households', (select count(*) from households),
      'people',     (select count(*) from people)
    ),
    'storage', (select to_jsonb(st) from st),
    'ai', jsonb_build_object(
      'at_cap_this_week', (select at_cap_outfit from quota),
      'entitlements',     (select to_jsonb(ent) from ent)
    ),
    'cron', jsonb_build_object('last_notification', (select last_notif from cron)),
    'db_size_bytes', pg_database_size(current_database())
  )
$$;

revoke all on function public.dashboard_stats() from public, anon, authenticated;
