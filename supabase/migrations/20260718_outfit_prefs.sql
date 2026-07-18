-- Personliga inställningar för outfit-AI:n:
-- 1) En egen kommentar per tillfälle (Jobb, Skola, Ledig, ...) som AI:n väger in.
-- 2) Vilka musikgenrer låtförslagen ska hämtas ur.
-- Kör i Supabase SQL Editor.
alter table profiles add column if not exists outfit_context_notes jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists music_genres text;
