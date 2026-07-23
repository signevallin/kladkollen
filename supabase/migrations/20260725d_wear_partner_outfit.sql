-- Lägger partnerns par-outfit i PARTNERNS kalender på ett datum (t.ex. "vill ha
-- på mig idag" för en par-generering lägger även sambons look på hens dag).
-- Household-vaktad. Sparar outfiten och kopplar den till dagen.
create or replace function wear_partner_outfit(target uuid, p_name text, p_garment_names text[], p_image_urls text[], p_date date)
returns void
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if target <> auth.uid() and not is_household_member(target) then
    raise exception 'Inte tillåtet';
  end if;
  insert into outfits (user_id, name, garment_names, image_urls, saved)
    values (target, coalesce(p_name, 'Outfit'), coalesce(p_garment_names, '{}'), coalesce(p_image_urls, '{}'), true)
    returning id into oid;
  insert into outfit_calendar (user_id, outfit_id, date)
    values (target, oid, p_date)
    on conflict (user_id, date) do update set outfit_id = excluded.outfit_id;
end $$;

grant execute on function wear_partner_outfit(uuid, text, text[], text[], date) to authenticated;
revoke execute on function wear_partner_outfit(uuid, text, text[], text[], date) from anon;
