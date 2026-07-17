-- Skiljer på outfits som användaren aktivt sparat och outfits som bara fått
-- ett betyg (feedback till AI:n ska inte hamna i "Mina outfits"-listan).
-- Befintliga rader räknas som sparade (default true). Kör i SQL Editor.
alter table outfits add column if not exists saved boolean not null default true;
