# Mejlmallar (Supabase Auth)

Dessa mallar redigeras och sparas i **Supabase Dashboard → Authentication →
Emails → Templates**. De deployas alltså inte från repot – filerna här är en
versionskontrollerad referens (kopiera in innehållet i dashboarden).

## confirm-signup.html — "Confirm signup"

Bekräftelsemejlet som skickas när en ny användare registrerar sig.

- **Ämnesrad (Subject):** `Välkommen till Skrud – bekräfta din e-post`
- **Body:** klistra in hela innehållet i `confirm-signup.html`.
- Behåll `{{ .ConfirmationURL }}` (bekräftelselänken) – tas den bort kan
  ingen verifiera sitt konto.

### Att tänka på inför lansering
- **Egen SMTP:** Supabases inbyggda mejltjänst har hård rate limit och generisk
  avsändare. Konfigurera en riktig leverantör (Resend/Postmark/SendGrid) under
  Authentication → Emails → SMTP Settings med `no-reply@dindomän`.
- **Site URL / Redirect:** bekräftelselänken landar på projektets Site URL
  (Authentication → URL Configuration) om inte `emailRedirectTo` skickas med i
  `supabase.auth.signUp(...)`.
