-- Språk per användare, så server-notiserna (Vercel Cron: send-notifications,
-- family-size-reminders) kan skickas på användarens valda språk. Skrivs från
-- appen (utils/settings) när språket sätts/ändras och vid inloggning. Saknas
-- värde faller notiserna tillbaka på svenska.
alter table profiles add column if not exists lang text;
