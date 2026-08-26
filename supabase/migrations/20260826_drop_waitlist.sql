-- Väntelistan tas bort.
--
-- Den fyllde en funktion före lansering: samla adresser till dem som ville veta
-- när appen släpptes. Appen är släppt, landningssidan har en App Store-knapp i
-- stället för ett formulär, och båda endpoints (api/waitlist.ts,
-- api/waitlist-list.ts) är borttagna.
--
-- Tabellen innehöll två rader vid raderingen. Båda personerna hade redan konton
-- i appen, så ingen blev utan den notis de anmält sig för.
--
-- Integritetspolicyns stycke om väntelistan är borttaget i samma ändring. En
-- policy som beskriver data vi inte längre har är lika fel som en som utelämnar
-- data vi har.

drop table if exists public.waitlist;
