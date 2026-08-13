-- Server-grind för prenumerationsnivåer (par/familj).
--
-- VIKTIGT: kör denna FÖRST när RevenueCat-produkterna + entitlements är live.
-- Innan dess returnerar current_tier() 'none' för alla, och då kastar
-- create_partner_invite()/ensure_household() → par- och familjefunktionerna
-- blir otillgängliga tills någon faktiskt har rätt nivå. (Därför ligger den på
-- en egen, omärgad gren tillsammans med resten av nivå-paywallen.)
--
-- Nivån härleds ur entitlements.product_id (samma nyckelord som klienten och
-- api/_utils: family/familj → family, partner → partner, annat betalt → single).

-- Aktuell användares nivå. SECURITY DEFINER så den kan läsa entitlements även om
-- RLS annars begränsar; stable + set search_path för säkerhet.
create or replace function current_tier()
returns text
language sql security definer set search_path = public stable as $$
  select coalesce((
    select case
      when e.pro_until is null or e.pro_until <= now() then 'none'
      when lower(coalesce(e.product_id, '')) like '%family%'
        or lower(coalesce(e.product_id, '')) like '%familj%' then 'family'
      when lower(coalesce(e.product_id, '')) like '%partner%' then 'partner'
      else 'single'
    end
    from entitlements e where e.user_id = auth.uid()
  ), 'none');
$$;
grant execute on function current_tier() to authenticated;

-- Par-läge kräver minst Partner-nivå. Skapar hushåll + inbjudningskod.
-- (Oförändrad kropp förutom nivå-grinden överst.)
create or replace function create_partner_invite()
returns text
language plpgsql security definer set search_path = public as $$
declare hid uuid; c text;
begin
  if current_tier() not in ('partner', 'family') then
    raise exception 'Kräver Skrud Premium (Partner)';
  end if;
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
  if hid is null then
    insert into households (name, created_by) values ('Vårt hem', auth.uid()) returning id into hid;
    insert into household_members (household_id, user_id, role) values (hid, auth.uid(), 'owner');
  end if;
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into household_invites (code, household_id, created_by) values (c, hid, auth.uid());
  return c;
end $$;

-- Familj (barn/personer) kräver Familj-nivå. Detta är ingångspunkten som skapar
-- hushållet för barn-hantering. (Oförändrad kropp förutom nivå-grinden överst.)
create or replace function ensure_household()
returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if current_tier() <> 'family' then
    raise exception 'Kräver Skrud Premium (Familj)';
  end if;
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
  if hid is not null then return hid; end if;
  insert into households (name, created_by) values ('Mitt hushåll', auth.uid()) returning id into hid;
  insert into household_members (household_id, user_id, role) values (hid, auth.uid(), 'owner');
  return hid;
end $$;

-- join_by_invite lämnas ogrindad med flit: den inbjudna partnern/familjemedlemmen
-- ska kunna gå med gratis i den betalande ägarens hushåll (en betald nivå räcker
-- för hushållet).
