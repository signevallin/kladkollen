-- Familjeoutfits hårdkodade vuxna till köldkänslighet 3, eftersom partnerns
-- egen uppgift inte gick att läsa. Lägg till den i den household-vaktade RPC:n.
-- pregnant exponeras MEDVETET inte: det är personens ensak, och den som är
-- gravid genererar sin egen outfit där justeringen redan gäller.
drop function if exists partner_profile(uuid);

create or replace function partner_profile(target uuid)
returns table (id uuid, name text, avatar_url text, cold_sensitivity int)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.avatar_url, coalesce(p.cold_sensitivity, 3)
  from profiles p
  where p.id = target
    and exists (
      select 1
      from household_members a
      join household_members b on b.household_id = a.household_id
      where a.user_id = auth.uid() and b.user_id = target
    );
$$;

revoke all on function partner_profile(uuid) from public;
grant execute on function partner_profile(uuid) to authenticated;
