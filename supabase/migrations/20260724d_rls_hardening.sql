-- Härdar RLS på alla användartabeller. Slår på RLS (no-op om redan på) och
-- säkerställer en ägar-policy per tabell, så ingen tabell kan råka stå öppen.
-- Kör Supabase → Advisors → Security efteråt och bekräfta att inget varnar.

-- user_id-ägda tabeller
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'garments','outfits','wishlist','moodboard','outfit_calendar',
    'pending_imports','locations','collages'
  ] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table %I enable row level security', tbl);
      execute format('drop policy if exists rls_owner_%1$s on %1$I', tbl);
      execute format(
        'create policy rls_owner_%1$s on %1$I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
        tbl);
    end if;
  end loop;
end $$;

-- profiles ägs via id (inte user_id). Behåller ev. extra SELECT-policy för
-- hushållsmedlemmar (partnerns namn) – den här är additiv.
alter table profiles enable row level security;
drop policy if exists rls_owner_profiles on profiles;
create policy rls_owner_profiles on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
