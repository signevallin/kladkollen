-- Amningsläge: efter förlossningen kan användaren slå på "Ammar" så AI:n
-- prioriterar amningsvänliga plagg (uppknäppbart/omlott framtill). Ingen
-- hälsodata – bara en flagga i profilen, precis som gravidläget (pregnant).
alter table profiles
  add column if not exists nursing boolean default false;
