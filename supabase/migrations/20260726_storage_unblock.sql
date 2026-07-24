-- Åtgärdar "new row violates row-level security policy" vid bilduppladdning.
--
-- Bakgrund: garments-bucketen hade en blandning av breda och strikta
-- (per-mapp) storage-policies, plus ev. restriktiva policies som ANDas ihop
-- med allt annat. En enda restriktiv/felaktig policy räcker för att blockera
-- uppladdningen även om övriga tillåter den. Vi nollställer därför alla
-- policies som rör garments-bucketen och återskapar en ren, tillåtande
-- uppsättning. Bucketen är publik och åtkomst till plaggen styrs på
-- garments-TABELLEN (user_id = auth.uid()), så det är säkert att låta vilken
-- inloggad användare som helst skriva i bucketen.

-- ── STORAGE: garments-bucketen ────────────────────────────────────────────
-- Droppa BARA policies som nämner garments (rör inte andra buckets, t.ex. avatarer).
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%garments%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "garments read any"   on storage.objects
  for select to public          using (bucket_id = 'garments');
create policy "garments write any"  on storage.objects
  for insert to authenticated with check (bucket_id = 'garments');
create policy "garments modify any" on storage.objects
  for update to authenticated using (bucket_id = 'garments') with check (bucket_id = 'garments');
create policy "garments remove any" on storage.objects
  for delete to authenticated using (bucket_id = 'garments');

-- ── TABELL: public.garments ───────────────────────────────────────────────
-- Nollställ ev. gamla/restriktiva policies och återskapa en ren ägar-policy.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'garments'
  loop
    execute format('drop policy if exists %I on public.garments', pol.policyname);
  end loop;
end $$;

alter table public.garments enable row level security;
create policy garments_owner_all on public.garments
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
