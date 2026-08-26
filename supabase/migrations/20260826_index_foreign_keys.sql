-- Indexera ägarkolumner och främmande nycklar.
--
-- Efter att garments visat sig sakna index på user_id gicks alla tabeller
-- igenom. Tolv kolumner saknade index, och samtliga är antingen en kolumn som
-- RLS filtrerar på vid varje läsning eller en främmande nyckel. Postgres skapar
-- inte index för främmande nycklar automatiskt – kaskadraderingar tvingas då
-- göra sekventiella scanningar, vilket bland annat drabbar kontoradering.
--
-- Mätvärden vid tillfället: tabellerna är små (1–95 rader), så planeraren väljer
-- fortfarande sekventiell scan för de flesta – det är korrekt, en indexläsning
-- är dyrare än att läsa 95 rader. Indexen finns för att kostnaden annars växer
-- med totala antalet rader i databasen i stället för med användarens egen data.
-- Verifierat att de FUNGERAR med enable_seqscan=off:
--
--   Bitmap Index Scan on outfits_user_idx (actual rows=31)
--
-- garments är redan indexerad i 20260826_garments_user_index.sql, där tabellen
-- var tillräckligt stor för att planeraren ska byta direkt.

-- Ägarkolumner: filtreras av RLS på varje läsning.
create index if not exists outfits_user_idx                on public.outfits (user_id);
create index if not exists wishlist_user_idx               on public.wishlist (user_id);
create index if not exists moodboard_user_idx              on public.moodboard (user_id);
create index if not exists collages_user_idx               on public.collages (user_id);
create index if not exists garment_sets_user_idx           on public.garment_sets (user_id);
create index if not exists outfit_likes_user_idx           on public.outfit_likes (user_id);
create index if not exists person_outfit_calendar_user_idx on public.person_outfit_calendar (user_id);

-- household_members.user_id slås upp av my_household_ids(), som varje
-- hushållsvaktad RLS-policy anropar.
create index if not exists household_members_user_idx      on public.household_members (user_id);

-- Främmande nycklar utan index.
create index if not exists people_household_idx            on public.people (household_id);
create index if not exists household_invites_household_idx on public.household_invites (household_id);
create index if not exists outfit_calendar_outfit_idx      on public.outfit_calendar (outfit_id);
create index if not exists person_outfit_calendar_outfit_idx on public.person_outfit_calendar (outfit_id);
