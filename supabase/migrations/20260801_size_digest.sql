-- Serverskickad veckodigest för storlekspåminnelser (familjeläget).
-- Dedup: senaste datum en digest skickades till användaren (max en per vecka).
alter table profiles add column if not exists last_size_digest date;
