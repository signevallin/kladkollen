-- Fix: upsert mot trips misslyckades tyst efter att SELECT revokerades i
-- advisor-hardeningen (20260724e). supabase-js .upsert() behöver SELECT-rätt
-- (RETURNING) för att slutföra, så reseplanen nådde aldrig molnet och en
-- partner kunde aldrig se den (trips-tabellen förblev tom).
--
-- Återger SELECT till authenticated. Säkert: RLS-policyn "own trip" begränsar
-- fortfarande läsning till den egna raden (user_id = auth.uid()), och partnerns
-- resa nås enbart via den household-vaktade SECURITY DEFINER-funktionen
-- partner_trip(). Kör i Supabase SQL Editor.
grant select on public.trips to authenticated;
