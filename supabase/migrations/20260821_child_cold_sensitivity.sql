-- Köldkänslighet per barn, samma skala som profiles.cold_sensitivity (1–5, 3 = lagom).
-- Används för att justera den upplevda temperaturen i outfit-genereringen, och
-- därmed också var mössgränsen går för små barn.
alter table people add column if not exists cold_sensitivity int not null default 3;
