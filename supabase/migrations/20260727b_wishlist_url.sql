-- Sparar produktlänken för köplistans plagg, så vi kan visa en "Köp"-knapp och
-- lägga på affiliate-spårning.
alter table wishlist add column if not exists url text;
