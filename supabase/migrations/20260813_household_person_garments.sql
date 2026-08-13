-- Delad familjegarderob: låt alla hushållsmedlemmar se och sköta plagg som
-- hör till en person (barn/vuxen) i hushållet.
--
-- Problem: garments_owner_all begränsar garments till user_id = auth.uid(), så
-- en partner ser barnen (people-RLS är hushållsvakt) men INTE barnens kläder,
-- eftersom plaggen ägs av den förälder som lade in dem. (En partner kunde redan
-- LÄGGA TILL barnkläder under sitt eget user_id men inte se den andres.)
--
-- Lösning: additiva policies (OR:as med garments_owner_all) som ger läs/ändra/
-- radera på plagg vars person_id pekar på en person i mitt hushåll. Personliga
-- plagg (person_id null) förblir privata – partnerns egen garderob visas även
-- fortsatt skrivskyddat via partner_garments-RPC:n.

-- SECURITY DEFINER-hjälpare: person-id:n i mina hushåll. Läser people utan RLS
-- men filtrerar på my_household_ids() (som utgår från auth.uid()), så den är
-- korrekt scopad och undviker RLS-rekursion i policyn nedan.
create or replace function my_household_person_ids()
returns setof uuid
language sql security definer stable set search_path = public as $$
  select id from people where household_id in (select my_household_ids())
$$;
grant execute on function my_household_person_ids() to authenticated;

drop policy if exists "household reads person garments" on garments;
create policy "household reads person garments" on garments for select to authenticated
  using (person_id in (select my_household_person_ids()));

drop policy if exists "household updates person garments" on garments;
create policy "household updates person garments" on garments for update to authenticated
  using (person_id in (select my_household_person_ids()))
  with check (person_id in (select my_household_person_ids()));

drop policy if exists "household deletes person garments" on garments;
create policy "household deletes person garments" on garments for delete to authenticated
  using (person_id in (select my_household_person_ids()));

-- INSERT behövs ingen ny policy för: garments_owner_all tillåter redan insert när
-- user_id = auth.uid(), och en förälder som lägger in ett barnplagg sätter sitt
-- eget user_id + barnets person_id.
