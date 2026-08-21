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

## reset-password.html — "Reset Password"

Mejlet som skickas när någon trycker "Glömt lösenord?" i inloggningen
(`supabase.auth.resetPasswordForEmail` i `app/login.tsx`).

- **Ämnesrad (Subject):**
  ```
  {{ if or (eq .Data.lang "en") (eq .Data.lang "de") (eq .Data.lang "es") (eq .Data.lang "fr") }}Reset your Skrud password{{ else }}Återställ ditt lösenord i Skrud{{ end }}
  ```
- **Body:** klistra in hela innehållet i `reset-password.html`.
- Behåll `{{ .ConfirmationURL }}` – utan den finns ingen väg till nytt lösenord.

Samma språkval som bekräftelsemejlet: `.Data` är användarens
`raw_user_meta_data`, satt vid registreringen. Konton som skapades innan
metadatan började skickas – och OAuth-konton – saknar `lang` och får svenska.

### Två påståenden i mallen som måste stämma med inställningarna
- **"gäller i en timme" / "valid for one hour"** speglar Email OTP Expiration
  (Authentication → Providers → Email), som är 3600 s som standard. Ändrar du
  den, ändra texten i båda språken.
- **"öppna den på samma enhet"** följer av att klienten kör `flowType: 'pkce'`
  (se `supabase.ts`). Code verifier ligger i enhetens AsyncStorage, så en länk
  som begärts på telefonen fungerar inte om den öppnas på datorn. Byter ni bort
  PKCE kan raden tas bort.

### Redirect
Länken pekar på `kladkollen://reset-password`, som måste ligga i Authentication
→ URL Configuration → Redirect URLs. Appen upprättar sessionen själv i
`app/reset-password.tsx`; `detectSessionInUrl` gör ingenting på native.

### Att tänka på inför lansering
- **Egen SMTP:** Supabases inbyggda mejltjänst har hård rate limit och generisk
  avsändare. Konfigurera en riktig leverantör (Resend/Postmark/SendGrid) under
  Authentication → Emails → SMTP Settings med `no-reply@dindomän`.
- **Site URL / Redirect:** bekräftelselänken landar på projektets Site URL
  (Authentication → URL Configuration) om inte `emailRedirectTo` skickas med i
  `supabase.auth.signUp(...)`.
