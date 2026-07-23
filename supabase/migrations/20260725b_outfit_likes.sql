-- Sambon kan "gilla" (hjärta) partnerns outfits. Ägaren ser hjärtat på sina
-- egna outfits.
create table if not exists outfit_likes (
  outfit_id  uuid references outfits on delete cascade,
  user_id    uuid references auth.users on delete cascade,  -- den som gillar
  created_at timestamptz default now(),
  primary key (outfit_id, user_id)
);
alter table outfit_likes enable row level security;

-- Man får läsa likes man SJÄLV gjort, samt likes på sina EGNA outfits.
drop policy if exists "read relevant likes" on outfit_likes;
create policy "read relevant likes" on outfit_likes for select
  using (user_id = auth.uid() or outfit_id in (select id from outfits where user_id = auth.uid()));

-- Skrivning sker bara via RPC:n nedan (som validerar hushållstillhörighet).
revoke insert, update, delete on outfit_likes from anon, authenticated;

-- Togglar en like på en outfit som tillhör en hushållsmedlem (eller en själv).
create or replace function toggle_outfit_like(target_outfit uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from outfits where id = target_outfit;
  if owner is null then raise exception 'Outfit saknas'; end if;
  if owner <> auth.uid() and not is_household_member(owner) then
    raise exception 'Inte tillåtet';
  end if;
  if exists (select 1 from outfit_likes where outfit_id = target_outfit and user_id = auth.uid()) then
    delete from outfit_likes where outfit_id = target_outfit and user_id = auth.uid();
    return false;
  else
    insert into outfit_likes(outfit_id, user_id) values (target_outfit, auth.uid());
    return true;
  end if;
end $$;

grant execute on function toggle_outfit_like(uuid) to authenticated;
revoke execute on function toggle_outfit_like(uuid) from anon;
