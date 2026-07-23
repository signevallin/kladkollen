-- Låter en användare spara en outfit i sin PARTNERS konto (t.ex. matchad
-- paranalys). Household-vaktad. garment_ids utelämnas (partnerns plagg-id:n
-- länkas inte här) – outfiten visas via namn + bilder.
create or replace function save_partner_outfit(target uuid, p_name text, p_garment_names text[], p_image_urls text[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if target <> auth.uid() and not is_household_member(target) then
    raise exception 'Inte tillåtet';
  end if;
  insert into outfits (user_id, name, garment_names, image_urls, saved)
    values (target, coalesce(p_name, 'Outfit'), coalesce(p_garment_names, '{}'), coalesce(p_image_urls, '{}'), true)
    returning id into new_id;
  return new_id;
end $$;

grant execute on function save_partner_outfit(uuid, text, text[], text[]) to authenticated;
revoke execute on function save_partner_outfit(uuid, text, text[], text[]) from anon;
