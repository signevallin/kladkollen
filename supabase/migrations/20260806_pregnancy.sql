-- ── Gravidläge ──────────────────────────────────────────────────────────────
-- Ett valfritt, privat läge som anpassar AI-outfits efter graviditeten och låter
-- plagg pausas (döljas från förslag) utan att tas bort. Passar Skruds idé om en
-- garderob för alla faser i livet. Ingen hälsodata – bara garderob.

-- På profilen: om läget är på och (valfritt) beräknat födelsedatum (BF) för att
-- kunna räkna ut trimester i appen.
alter table profiles add column if not exists pregnant  boolean not null default false;
alter table profiles add column if not exists due_date  date;

-- På plagget: markera gravid-/amningsvänligt, och pausa under graviditeten.
-- Pausade plagg utesluts ur outfit-förslagen men ligger kvar och kan tas tillbaka.
alter table garments add column if not exists maternity_friendly boolean not null default false;
alter table garments add column if not exists paused_pregnancy    boolean not null default false;
create index if not exists garments_paused_pregnancy_idx on garments (paused_pregnancy) where paused_pregnancy;
