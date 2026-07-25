-- Läser en hushållsmedlems profil (namn + avatar) på ett robust sätt, oberoende
-- av profiles-RLS. Övrig partnerdata går redan via partner_*-RPC:er; namn/avatar
-- gjorde det inte, vilket kunde göra att partnerns profilbild inte syntes om
-- läspolicyn på profiles saknades/betedde sig fel. Household-vaktad.
create or replace function partner_profile(target uuid)
returns table(id uuid, name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar_url
  from profiles p
  where p.id = target
    and (target = auth.uid() or is_household_member(target))
$$;

grant execute on function partner_profile(uuid) to authenticated;
revoke execute on function partner_profile(uuid) from anon;
