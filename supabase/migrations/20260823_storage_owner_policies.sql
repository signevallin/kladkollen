-- ÅTGÄRD 1 (av 2) – stäng skriv-/raderhålet i garments-bucketen.
--
-- Bakgrund: 20260726_storage_unblock.sql skapade policies vars ENDA villkor var
-- bucket_id. Det innebar att vilken inloggad användare som helst kunde skriva
-- över eller RADERA samtliga användares bilder (GDPR art. 5.1(f) och art. 32).
-- Kommentaren i utils/storage.ts påstod att path-prefixet skyddade mot detta –
-- det gjorde det inte, eftersom ingen policy kontrollerade prefixet.
--
-- Den här migrationen scopar skrivning/ändring/radering till ägarens egen mapp.
-- Sökvägsformatet är `{user_id}/{uuid}.{ext}` (se utils/storage.uploadUserImage),
-- så villkoret matchar exakt vad klienten redan gör → INGEN appändring krävs.
--
-- SÄKER ATT KÖRA DIREKT, före nästa appbygge. Läsning lämnas orörd här;
-- den stängs i 20260824_storage_private_signed.sql som körs TILLSAMMANS med
-- den nya appbuilden (den kräver klientstöd för signerade URL:er).

-- ── Skrivning: bara i din egen mapp ───────────────────────────────────────
drop policy if exists "garments write any"  on storage.objects;
drop policy if exists "garments modify any" on storage.objects;
drop policy if exists "garments remove any" on storage.objects;

create policy "garments write own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "garments modify own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "garments remove own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'garments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      -- Legacy: äldsta avatarerna låg som avatars/avatar-{uid}.jpg. Låt ägaren
      -- städa bort sin egen (används av api/delete-account.ts).
      or name = 'avatars/avatar-' || auth.uid()::text || '.jpg'
    )
  );
