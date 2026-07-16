-- Egna platser för var plagg finns, med flagga för om platsen hör till arkivet.
-- Kör i Supabase SQL Editor.
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_archive boolean not null default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table locations enable row level security;

drop policy if exists "own locations" on locations;
create policy "own locations" on locations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists locations_user_idx on locations (user_id, sort_order);
