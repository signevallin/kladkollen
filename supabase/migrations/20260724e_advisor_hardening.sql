-- Åtgärdar Advisor-varningarna som är säkra att åtgärda utan att bryta appen.

-- 0025: publik bucket behöver ingen bred SELECT-policy för att bild-URL:er ska
-- fungera – policyn tillät dessutom listning av HELA bucketen. Ta bort den.
drop policy if exists "Authenticated can read garments bucket" on storage.objects;

-- 0026/0027: dölj rent interna tabeller ur det auto-genererade data-API:t.
-- Klienten läser aldrig dessa direkt – de nås bara via SECURITY DEFINER-RPC:er
-- (som kör som ägaren) eller service role. RLS skyddar redan raderna; det här
-- tar även bort dem ur den upptäckbara GraphQL/REST-schemat.
revoke select on public.api_rate_limits   from anon, authenticated;
revoke select on public.collages          from anon, authenticated;
revoke select on public.households        from anon, authenticated;
revoke select on public.household_invites from anon, authenticated;
revoke select on public.trips             from anon, authenticated;

-- 0028: utloggade (anon) ska aldrig kunna anropa våra RPC:er (de bygger på
-- auth.uid() och gör inget vettigt för anon ändå – men ta bort exponeringen).
revoke execute on function create_partner_invite()   from anon;
revoke execute on function join_by_invite(text)      from anon;
revoke execute on function leave_household()          from anon;
revoke execute on function partner_garments(uuid)    from anon;
revoke execute on function partner_wishlist(uuid)    from anon;
revoke execute on function partner_outfits(uuid)     from anon;
revoke execute on function partner_calendar(uuid)    from anon;
revoke execute on function partner_trip(uuid)        from anon;
revoke execute on function bump_rate_limit(int, int) from anon;

-- Ren intern hjälpfunktion – anropas bara inifrån andra (definer-)funktioner.
revoke execute on function is_household_member(uuid) from anon, authenticated;

-- OBS: my_household_ids() lämnas orörd med avsikt – den används i RLS-policyer
-- som utvärderas som den inloggade rollen, så authenticated MÅSTE kunna köra den.
