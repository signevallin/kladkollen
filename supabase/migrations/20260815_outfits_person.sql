-- Barn-outfits: gör så att en sparad/loggad outfit kan tillhöra ett barn i
-- hushållet ("Familjen idag" på hemskärmen). Barn har inga egna konton, så
-- raden ägs fortsatt av föräldern (user_id = auth.uid()) men attribueras till
-- barnet via person_id. Befintlig RLS (user_id = auth.uid()) gäller oförändrad
-- – föräldern äger raden – så inga nya policyer behövs. person_id = null =
-- förälderns egen outfit (som tidigare).
--
-- OBS: alla ägar-vyer (Mina outfits, statistik, AI:ns variationsminne) måste
-- filtrera person_id is null så barnens outfits inte blandas in där.
alter table outfits
  add column if not exists person_id uuid references people(id) on delete cascade;

create index if not exists outfits_person_id_idx on outfits (person_id) where person_id is not null;
