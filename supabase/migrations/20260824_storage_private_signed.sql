-- ÅTGÄRD 2 (av 2) – gör garments-bucketen PRIVAT igen.
--
-- ⚠️  KÖR DEN HÄR MIGRATIONEN SAMTIDIGT SOM DEN NYA APPBUILDEN SLÄPPS.
--     Äldre builds bygger publika URL:er (getPublicUrl) och slutar visa bilder
--     mot en privat bucket (400). Nya builds använder signerade URL:er via
--     utils/signedUrls.ts. Samma varning som i 20260718_public_garments_bucket.sql,
--     fast åt andra hållet.
--
-- Bakgrund: bucketen gjordes publik för att signerade URL:er gav en ny token
-- vid varje appstart → cache-miss → hela bildmängden laddades ner på nytt (hög
-- egress). Lösningen här behåller kostnadsvinsten UTAN publik åtkomst:
-- klienten signerar med LÅNG livslängd (30 dygn) och cachar URL:en på disk, så
-- URL:en är stabil mellan appstarter och både Supabase-CDN:n och expo-image
-- återanvänder sin cache precis som förut. Skillnaden är att åtkomsten nu är
-- tidsbegränsad och återkallningsbar, och att ingen utan konto kommer åt något.

-- ── LEGACY-SÖKVÄGAR (mätt i prod 2026-08-22) ──────────────────────────────
-- Bucketen innehåller 979 objekt fördelade på FYRA sökvägsmönster – bara ett
-- av dem är den nuvarande strukturen:
--
--   {user_id}/…   248 st   nuvarande struktur (utils/storage.uploadUserImage)
--   public/…      717 st   legacy, 19 utan owner
--   moodboard/…    12 st   legacy
--   avatars/…       2 st   legacy
--
-- Legacy-sökvägarna kan INTE matchas på mappnamn (första mappnivån är
-- 'public'/'moodboard'/'avatars', inte ett user_id). Policyn nedan attribuerar
-- dem därför via `storage.objects.owner` i stället. Regeln är medvetet
-- generell – den räknar inte upp prefixen, utan säger "äger du objektet får du
-- läsa det" – så ett prefix vi inte känner till inte tystnar.
--
-- Attributionen är verifierad: av de 451 legacy-objekt som är refererade från
-- garments/wishlist/moodboard stämmer owner med radens user_id i 100 % av
-- fallen, noll avvikelser.
--
-- 19 objekt saknar owner. Samtliga är oreferererade föräldralösa filer med den
-- äldsta tidsstämpelnamngivningen (1772289600097_….png). De blir oläsbara
-- efter den här migrationen, vilket är utan effekt – ingen rad pekar på dem.
--
-- Städning av föräldralösa filer görs INTE här: 266 av 717 public/-objekt är
-- oreferererade. Radering är oåterkallelig och hör hemma i ett eget, granskat
-- steg – inte i en policymigration.

-- ── Vem får LÄSA ett objekt? ──────────────────────────────────────────────
-- SECURITY DEFINER så vi slipper RLS-rekursion mot household_members, och så
-- att vi kan jämföra mappnamnet som TEXT (aldrig casta osäkra legacy-sökvägar
-- till uuid – det skulle ge körfel på t.ex. 'avatars/...').
--
-- Objektets `owner` skickas in som argument från policyn i stället för att
-- slås upp igen inuti funktionen – annars hade varje läsning blivit en
-- self-join mot storage.objects.
drop function if exists public.can_read_garment_object(text);

create or replace function public.can_read_garment_object(object_name text, object_owner uuid)
returns boolean
language sql stable security definer set search_path = public, storage as $$
  select
    -- 1. Nuvarande struktur: mappnamnet ÄR ditt user_id.
    (storage.foldername(object_name))[1] = auth.uid()::text
    -- 2. Alla legacy-prefix (public/, moodboard/, avatars/ …): objektets owner
    --    sattes av storage vid uppladdning och är verifierat pålitlig.
    or object_owner = auth.uid()
    -- 3. Hushållsmedlemmars bilder – par-/familjeläget visar varandras plagg
    --    och avatarer i läsläge (partner_*-RPC:erna returnerar image_url).
    --    Täcker båda strukturerna ovan.
    or exists (
      select 1
      from household_members hm
      where hm.household_id in (
              select household_id from household_members where user_id = auth.uid()
            )
        and (
          hm.user_id::text = (storage.foldername(object_name))[1]
          or hm.user_id = object_owner
        )
    )
$$;

grant execute on function public.can_read_garment_object(text, uuid) to authenticated;

drop policy if exists "garments read any" on storage.objects;

create policy "garments read own or household" on storage.objects
  for select to authenticated
  using (bucket_id = 'garments' and public.can_read_garment_object(name, owner));

-- ── Stäng den publika läsningen ───────────────────────────────────────────
update storage.buckets set public = false where id = 'garments';

-- ── Efterkontroll (kör som en inloggad användare, inte service role) ──────
-- Verifiera i appen direkt efteråt: garderoben laddar, ett gammalt plagg med
-- public/-sökväg visas, partnerns plagg visas, ny uppladdning fungerar.
