-- Märke + pris på plagg (för märkes-statistik och cost-per-wear).
-- Kör i Supabase SQL Editor.
alter table garments add column if not exists brand text;
alter table garments add column if not exists price numeric;
