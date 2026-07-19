-- Typ (subkategori) och pris på köplistan – samma fält som vanliga plagg.
-- Kör i Supabase SQL Editor.
alter table wishlist add column if not exists subcategory text;
alter table wishlist add column if not exists price numeric;
