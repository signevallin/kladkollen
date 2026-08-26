-- Samlad statistik för den interna översiktssidan (api/dashboard.ts).
--
-- En RPC i stället för ett dussin REST-frågor: siffrorna hämtas i ETT anrop och
-- SQL:en versionshanteras här i stället för att ligga utspridd i klientkod.
--
-- SECURITY DEFINER krävs för att läsa auth.users och storage.objects. Rättigheten
-- är återkallad för anon och authenticated – bara service role (servern) får
-- anropa den, och sidan bakom den visar enbart aggregat.
--
-- Aktiveringsmåttet är playbookens viktigaste siffra: andelen nya konton som
-- BÅDE lagt in ett plagg OCH genererat en outfit. Den finns inte i någon extern
-- tjänst och är därför hela skälet till att funktionen behövs.

create or replace function public.dashboard_stats()
returns jsonb
language sql stable security definer set search_path = public, storage, auth as $$
  with
  u as (
    select count(*)                                                           as total,
           count(*) filter (where created_at > now() - interval '7 days')     as new_7d,
           count(*) filter (where last_sign_in_at > now() - interval '7 days') as active_7d
    from auth.users
  ),
  cohort as (
    select id from auth.users where created_at > now() - interval '30 days'
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
  cron as (
    select max(last_notif_date) as last_notif from profiles
  )
  select jsonb_build_object(
    'generated_at', now(),
    'users', (select to_jsonb(u) from u),
    'activation', (select to_jsonb(act) from act),
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
