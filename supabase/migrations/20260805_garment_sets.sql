-- ── Set: länka plagg som hör ihop (co-ord, kostym, bikini ...) ───────────────
-- Ett plagg kan tillhöra HÖGST ett set (set_id på plagget). Setet är
-- organiserande – plaggen kan fortfarande stylas var för sig. En snabbknapp
-- ("styla hela setet") genererar en outfit byggd kring hela setet.

create table if not exists garment_sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);
alter table garment_sets enable row level security;

drop policy if exists "own sets select" on garment_sets;
create policy "own sets select" on garment_sets for select using (auth.uid() = user_id);
drop policy if exists "own sets insert" on garment_sets;
create policy "own sets insert" on garment_sets for insert with check (auth.uid() = user_id);
drop policy if exists "own sets update" on garment_sets;
create policy "own sets update" on garment_sets for update using (auth.uid() = user_id);
drop policy if exists "own sets delete" on garment_sets;
create policy "own sets delete" on garment_sets for delete using (auth.uid() = user_id);

-- Kopplingen på plagget. on delete set null → tas setet bort blir plaggen fria.
alter table garments add column if not exists set_id uuid references garment_sets on delete set null;
create index if not exists garments_set_id_idx on garments (set_id) where set_id is not null;
