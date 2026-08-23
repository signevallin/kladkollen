-- Skostorlek som egen dimension.
--
-- Skor mäts i EU-nummer, inte i klädernas centimeterskala (som beskriver
-- kroppslängd). Utan en egen kolumn gick skostorlek bara att skriva som fritext
-- i `size`, vilket appen inte kan räkna på – och det är just skor barn växer ur
-- snabbast. Storlekspåminnelser, "passar nu"-filtret och resepackningen kunde
-- därför aldrig säga något om skor.
--
-- Modellen speglar kläderna medvetet, så samma logik kan användas för båda:
--   plagget:  garments.size_cm        ⇄  garments.shoe_size
--   barnet:   people.current_size_cm  ⇄  people.current_shoe_size

alter table garments add column if not exists shoe_size int;

alter table people add column if not exists current_shoe_size   int;
alter table people add column if not exists shoe_size_updated_at timestamptz;

comment on column garments.shoe_size          is 'EU-skostorlek. Används i stället för size_cm när kategorin är Skor.';
comment on column people.current_shoe_size    is 'Barnets aktuella EU-skostorlek.';
comment on column people.shoe_size_updated_at is 'När current_shoe_size senast bekräftades.';

-- Ett par skor hade fått en klädstorlek i cm insatt (50–170 beskriver längd,
-- inte fot). Nolla den – värdet var aldrig meningsfullt och stör annars både
-- påminnelserna och "passar nu"-filtret.
update garments set size_cm = null where category = 'Skor' and size_cm is not null;
