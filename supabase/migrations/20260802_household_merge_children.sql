-- Bugg: när man går med i en partners hushåll (join_by_invite) flyttades bara
-- användaren över – barnen (people) och plaggen låg kvar i det gamla hushållet
-- och "försvann". Fix: ta med barn + plagg till det nya hushållet. Plus en
-- engångsåterställning av redan strandade barn.

create or replace function join_by_invite(invite_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid; cur uuid;
begin
  select household_id into hid from household_invites
    where code = upper(invite_code) and (expires_at is null or expires_at > now());
  if hid is null then raise exception 'Ogiltig eller utgången kod'; end if;
  select household_id into cur from household_members where user_id = auth.uid() limit 1;
  if cur is not null and cur <> hid then
    -- Flytta med barn/personer och plagg till det nya (gemensamma) hushållet.
    update people   set household_id = hid where household_id = cur;
    update garments set household_id = hid where household_id = cur;
    delete from household_members where user_id = auth.uid();
    -- Städa bort det gamla hushållet om det blev tomt.
    if not exists (select 1 from household_members where household_id = cur) then
      delete from households where id = cur;
    end if;
  end if;
  insert into household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'member') on conflict do nothing;
  return hid;
end $$;

grant execute on function join_by_invite(text) to authenticated;

-- ── Engångsåterställning ──
-- Barn som fastnat i ett TOMT hushåll (skaparen har lämnat det) flyttas till
-- skaparens nuvarande hushåll.
update people p
set household_id = cur.hid
from households h
cross join lateral (
  select hm.household_id as hid from household_members hm where hm.user_id = h.created_by limit 1
) cur
where p.household_id = h.id
  and h.created_by is not null
  and cur.hid is not null
  and not exists (select 1 from household_members hm2 where hm2.household_id = h.id);

-- Håll plaggens household_id i synk med personens (så barnvyer + påminnelser hittar dem).
update garments g
set household_id = p.household_id
from people p
where g.person_id = p.id
  and g.household_id is distinct from p.household_id;

-- Rensa tomma hushåll utan personer/plagg som blev över.
delete from households h
where not exists (select 1 from household_members hm where hm.household_id = h.id)
  and not exists (select 1 from people p where p.household_id = h.id)
  and not exists (select 1 from garments g where g.household_id = h.id);
