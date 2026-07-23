-- Egna stilregler som AI:n följer vid outfit-generering (kommaseparerade nycklar).
-- Kör i Supabase SQL Editor.
alter table profiles add column if not exists style_rules text;
