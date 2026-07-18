-- Märke på köplistan (samma som plagg i garderoben).
-- Kör i Supabase SQL Editor.
alter table wishlist add column if not exists brand text;
