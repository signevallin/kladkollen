-- ── Familjeläget, steg 3: koppla plagg till en person ──
-- Ett plagg kan tillhöra/vara tänkt för en person i hushållet (särskilt barn),
-- ha en normaliserad barnstorlek i cm och en status som driver
-- hand-me-down-logiken (används / sparad i låda / urvuxen).

alter table garments add column if not exists person_id    uuid references people on delete set null;
alter table garments add column if not exists household_id  uuid references households on delete set null;
alter table garments add column if not exists size_cm       int;
alter table garments add column if not exists status        text;  -- 'in_use' | 'stored' | 'outgrown'

-- Snabbar upp påminnelsemotorns uppslag (sparade plagg per hushåll/storlek).
create index if not exists garments_person_idx    on garments (person_id);
create index if not exists garments_household_idx  on garments (household_id);
