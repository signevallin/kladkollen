-- Passform på plagg (Skinny, Slim, Regular, Relaxed, Oversize).
-- Kör i Supabase SQL Editor.
alter table garments add column if not exists fit text;
