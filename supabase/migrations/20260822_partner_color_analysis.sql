-- Par- och familjeoutfits vägde in MIN färganalys men inte partnerns, eftersom
-- den inte gick att läsa. Lägg till den i den household-vaktade RPC:n.
-- Kolumnen innehåller en härledd färgpalett (färgnamn), inte hy-/utseendedata.
-- pregnant exponeras fortfarande INTE – se 20260822_partner_cold_sensitivity.
drop function if exists partner_profile(uuid);

create or replace function partner_profile(target uuid)
returns table (id uuid, name text, avatar_url text, cold_sensitivity int, color_analysis jsonb)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.avatar_url, coalesce(p.cold_sensitivity, 3), p.color_analysis
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
