-- När man kopplar isär hushållet ska gillamarkeringar (outfit_likes) mellan
-- medlemmarna städas bort – annars ligger "Gillade av partner" kvar efteråt.
create or replace function leave_household()
returns void
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
  if hid is null then return; end if;

  -- Ta bort likes i BÅDA riktningar mellan mig och övriga hushållsmedlemmar:
  -- mina likes på deras outfits, och deras likes på mina outfits.
  delete from outfit_likes ol
  using outfits o
  where ol.outfit_id = o.id
    and (
      (ol.user_id = auth.uid() and o.user_id in (
        select user_id from household_members where household_id = hid and user_id <> auth.uid()
      ))
      or
      (o.user_id = auth.uid() and ol.user_id in (
        select user_id from household_members where household_id = hid and user_id <> auth.uid()
      ))
    );

  delete from household_members where user_id = auth.uid();
  if not exists (select 1 from household_members where household_id = hid) then
    delete from households where id = hid;
  end if;
end $$;

grant execute on function leave_household() to authenticated;
