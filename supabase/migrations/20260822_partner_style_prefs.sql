-- Sista fältet i personaliseringen som saknades för partnern: vald stil.
-- Par-outfits ska landa i VAR SIN stil, inte i den ena partnerns.
-- pregnant exponeras fortfarande inte.
drop function if exists partner_profile(uuid);

create or replace function partner_profile(target uuid)
returns table (
  id uuid, name text, avatar_url text,
  cold_sensitivity int, color_analysis jsonb, style_prefs text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.avatar_url,
         coalesce(p.cold_sensitivity, 3), p.color_analysis, p.style_prefs
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
