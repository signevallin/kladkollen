-- Hur frusen användaren är (1 = alltid varm, 5 = fryser lätt). Justerar hur
-- AI:n tolkar temperaturen vid outfit-förslag. Kör i Supabase SQL Editor.
alter table profiles add column if not exists cold_sensitivity int not null default 3;
