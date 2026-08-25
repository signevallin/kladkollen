-- Hjärtslag för gallring av inaktiva konton.
--
-- Varför en egen kolumn: auth.users.last_sign_in_at uppdateras BARA vid
-- faktisk inloggning, inte när mobilsessionen förnyas med token-refresh. I vår
-- egen data hade ett aktivt konto 37 dagar sedan "inloggning" men 8 dagar sedan
-- senaste plagg. Gallring byggd på last_sign_in_at hade raderat användare som
-- fortfarande använder appen varje dag.
--
-- Klienten skriver hit som mest en gång per dygn (utils/activity.ts).

alter table public.profiles
  add column if not exists last_active_at timestamptz;

-- Seed: befintliga användare har aldrig hunnit pinga. Utan seedning ser alla ut
-- att vara inaktiva sedan urminnes tid. Bästa tillgängliga uppskattning är den
-- senaste av deras faktiska spår i datan.
update public.profiles p
set last_active_at = greatest(
      (select max(g.created_at) from public.garments g where g.user_id = p.id),
      (select max(o.created_at) from public.outfits  o where o.user_id = p.id),
      (select u.last_sign_in_at from auth.users u where u.id = p.id)
    )
where p.last_active_at is null;
