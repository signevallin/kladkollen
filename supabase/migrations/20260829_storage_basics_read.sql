-- Läspolicy för Snabbstartens basplaggs-bibliotek.
--
-- Basplaggsbilderna ligger i garments-bucketen under prefixet `basics/…`
-- (basics/{kön}/{id}/{färg}.png). Det är generiska, AI-genererade katalogbilder
-- – INGEN användardata. Den ägar-scopade läspolicyn ("garments read own or
-- household", 20260824_storage_private_signed.sql) blockerar dem eftersom de
-- saknar en user-owner: en vanlig användare kan då inte signera en URL till dem
-- och SignedImage visar en tom ruta.
--
-- Denna policy släpper LÄSNING (select) av just `basics/`-prefixet för alla
-- inloggade användare. Policyer är permissiva och OR-kombineras, så den
-- befintliga ägar-policyn är oförändrad – detta lägger bara till läsrätt för de
-- delade katalogbilderna. Bucketen förblir privat (signerade URL:er krävs).
create policy "garments read basics" on storage.objects
  for select to authenticated
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = 'basics');
