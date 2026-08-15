-- Köplista per barn: en förälder kan hålla en egen köplista för varje barn
-- (saker att köpa till barnet), på samma sätt som barnens outfits. Raden ägs av
-- föräldern (user_id) men attribueras till barnet via person_id. Befintlig RLS
-- (user_id = auth.uid()) gäller oförändrad. person_id = null = förälderns egen
-- köplista (som tidigare).
--
-- OBS: ägar-vyn (min köplista) måste filtrera person_id is null så barnens
-- köplistor inte blandas in där.
alter table wishlist
  add column if not exists person_id uuid references people(id) on delete cascade;

create index if not exists wishlist_person_id_idx on wishlist (person_id) where person_id is not null;
