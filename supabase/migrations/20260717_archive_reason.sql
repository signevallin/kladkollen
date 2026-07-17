-- Anledning till att ett plagg arkiverats (för liten, fel säsong, osv).
-- Kör i Supabase SQL Editor.
alter table garments add column if not exists archive_reason text;
