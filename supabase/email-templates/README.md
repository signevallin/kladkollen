# Mejlmallar (Supabase Auth)

Dessa mallar redigeras och sparas i **Supabase Dashboard → Authentication →
Emails → Templates**. De deployas alltså inte från repot – filerna här är en
versionskontrollerad referens (kopiera in innehållet i dashboarden).

## confirm-signup.html — "Confirm signup"

Bekräftelsemejlet som skickas när en ny användare registrerar sig.

- **Ämnesrad (Subject):** klistra in den språkvillkorliga varianten så utländska
  användare får engelska:
  ```
  {{ if or (eq .Data.lang "en") (eq .Data.lang "de") (eq .Data.lang "es") (eq .Data.lang "fr") }}Welcome to Skrud – confirm your email{{ else }}Välkommen till Skrud – bekräfta din e-post{{ end }}
  ```
- **Body:** klistra in hela innehållet i `confirm-signup.html`.
- Behåll `{{ .ConfirmationURL }}` (bekräftelselänken) – tas den bort kan
  ingen verifiera sitt konto.

### Språk (svenska/engelska)
Mallen väljer språk via `{{ .Data.lang }}`, som sätts när appen anropar
`supabase.auth.signUp(..., { options: { data: { lang } } })` (se `app/login.tsx`).
Svenska är standard; är appspråket en/de/es/fr visas engelska (universellt för
utländska användare). Vill du ha fullständig de/es/fr i mejlet får du lägga till
fler `{{ else if eq .Data.lang "de" }}…`-grenar per textsträng.

Gäller bara nya registreringar efter att metadatan börjat skickas; saknas
`lang` (äldre flöden, OAuth) faller mallen tillbaka på svenska.

### Att tänka på inför lansering
- **Egen SMTP:** Supabases inbyggda mejltjänst har hård rate limit och generisk
  avsändare. Konfigurera en riktig leverantör (Resend/Postmark/SendGrid) under
  Authentication → Emails → SMTP Settings med `no-reply@dindomän`.
- **Site URL / Redirect:** bekräftelselänken landar på projektets Site URL
  (Authentication → URL Configuration) om inte `emailRedirectTo` skickas med i
  `supabase.auth.signUp(...)`.
