-- Notiserna föreslog samma plagg om och om igen.
--
-- "Rätt väder" och "Glömda skatter" valde båda med
--   .sort((a,b) => daysSince(b.last_worn) - daysSince(a.last_worn))[0]
-- alltså ALLTID plagget som legat orört längst. En notis ändrar inte last_worn
-- – det gör bara att man faktiskt använder plagget – så samma plagg låg kvar
-- överst i sorteringen tills det bars. Loopen var garanterad, inte otur.
--
-- Kolumnen minns vilket plagg som senast föreslogs så att det kan uteslutas
-- nästa gång. Tillsammans med slumpvalet bland de mest bortglömda (se
-- api/send-notifications.ts) kan samma plagg aldrig komma två gånger i rad.

alter table profiles add column if not exists last_notif_garment uuid;

comment on column profiles.last_notif_garment is
  'Plagget som senast föreslogs i en notis. Utesluts nästa gång så samma plagg aldrig kommer två gånger i rad.';
