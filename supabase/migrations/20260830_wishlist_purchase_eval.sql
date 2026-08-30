-- Sparar "smart köp?"-bedömningen (api/evaluate-purchase) på köplisteposten så
-- den kan visas igen i garment-detail (köplisteläget). JSON: verdict, score,
-- headline, reasons, pairsWith, gap, duplicate, garment. RLS oförändrad – de
-- befintliga wishlist-policyerna täcker kolumnen.
alter table public.wishlist add column if not exists purchase_eval jsonb;
