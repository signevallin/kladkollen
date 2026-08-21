# Mejlmallar (Supabase Auth)

Dessa mallar redigeras och sparas i **Supabase Dashboard → Authentication →
Emails → Templates**. De deployas alltså inte från repot – filerna här är en
versionskontrollerad referens (kopiera in innehållet i dashboarden).

## confirm-signup.html — "Confirm signup"

Bekräftelsemejlet som skickas när en ny användare registrerar sig.

- **Ämnesrad (Subject):** klistra in den språkvillkorliga varianten så utländska
  användare får engelska:
  ```
  {{ if ne (printf "%v" .Data.lang) "sv" }}Welcome to Skrud – confirm your email{{ else }}Välkommen till Skrud – bekräfta din e-post{{ end }}
  ```
- **Body:** klistra in hela innehållet i `confirm-signup.html`.
- Behåll `{{ .ConfirmationURL }}` (bekräftelselänken) – tas den bort kan
  ingen verifiera sitt konto.

### Språk (svenska/engelska)
Mallen väljer språk via `{{ .Data.lang }}`, som sätts när appen anropar
`supabase.auth.signUp(..., { options: { data: { lang } } })` (se `app/login.tsx`).

**Engelska är default.** Bara `lang == "sv"` ger svenska; allt annat – inklusive
saknat värde – ger engelska. Det är avsiktligt: en användare vi inte vet något om
förstår med större sannolikhet engelska än svenska.

`printf "%v"` i språkraden är inte kosmetik. Saknas `lang` helt kraschar en rak
`eq`-jämförelse mot nil, och GoTrue faller då tyst tillbaka på Supabases
standardmall. `printf` gör om värdet till en sträng först, så jämförelsen alltid
går att göra. Det gäller OAuth-konton, som aldrig går via `signUp` och därför
saknar `lang`.

Vill du ha fullständig de/es/fr får du lägga till fler
`{{ else if eq .Data.lang "de" }}…`-grenar per textsträng.

Gäller bara nya registreringar efter att metadatan börjat skickas; saknas
`lang` (äldre flöden, OAuth) faller mallen tillbaka på svenska.

## reset-password.html — "Reset Password"

Mejlet som skickas när någon trycker "Glömt lösenord?" i inloggningen
(`supabase.auth.resetPasswordForEmail` i `app/login.tsx`).

- **Ämnesrad (Subject):**
  ```
  {{ if ne (printf "%v" .Data.lang) "sv" }}Reset your Skrud password{{ else }}Återställ ditt lösenord i Skrud{{ end }}
  ```
- **Body:** klistra in hela innehållet i `reset-password.html`.
- Behåll `{{ .ConfirmationURL }}` – utan den finns ingen väg till nytt lösenord.
- Klistra in under fliken **Reset Password**, inte Confirm signup eller Magic
  Link. Får du Supabases standardtext ("Follow this link to reset the password
  for your user") är mallen inte sparad, eller sparad på fel flik.

### Mallen är byggd från confirm-signup.html med flit
En tidigare version hade en nil-säker språkrad
(`{{ $lang := "" }}{{ if .Data }}…`). Den gjorde att GoTrue tyst föll tillbaka på
Supabases standardmall – mejlet kom fram, men som standardtext. Bekräftelsemallen
med samma struktur fungerade hela tiden, så felet låg i det som skilde dem åt.

Håll därför konstruktionerna identiska med `confirm-signup.html`. Behöver du
ändra språkraden: verifiera med ett testutskick, för dashboarden sparar utan att
klaga även när GoTrue inte kan rendera mallen.

OAuth-konton saknar `lang` i `raw_user_meta_data` (den sätts bara av `signUp`)
och får engelska via `printf`-varianten ovan.

Samma språkval som bekräftelsemejlet: `.Data` är användarens
`raw_user_meta_data`, satt vid registreringen. Konton utan `lang` – OAuth-konton
och äldre konton – får engelska.

### Två påståenden i mallen som måste stämma med inställningarna
- **"gäller i en timme" / "valid for one hour"** speglar Email OTP Expiration
  (Authentication → Providers → Email), som är 3600 s som standard. Ändrar du
  den, ändra texten i båda språken.
- **Länken är bunden till klienten som begärde den.** Supabase kör PKCE här och
  redirectar till `…/reset-password?code=<uuid>`. Code verifier ligger i den
  klientens lagring, så koden kan bara lösas in där begäran gjordes. Begärs den
  i appen måste bytet ske i appen.

  Obs: felsvar kommer alltid tillbaka som *fragment*
  (`#error=…&error_code=otp_expired`) oavsett flöde. Att sondera med en ogiltig
  token säger alltså ingenting om vilket flöde en giltig länk använder – det var
  så jag först drog fel slutsats.

### Redirect – måste vara https, inte app-schemat
Länken pekar på `https://kladkollen.vercel.app/reset-password`, som måste ligga i
Authentication → URL Configuration → Redirect URLs.

Peka den INTE på `kladkollen://reset-password`. Supabase svarar med en 303 till
redirect-målet, och Safari kan varken rendera ett custom scheme eller lämna över
till appen utan en användargest – resultatet blir en tom sida och användaren kommer
aldrig vidare. Det var precis felet innan.

https-sidan är Expo-webbygget (samma `app/reset-password.tsx`). Saknar den
webbklienten en code verifier – vilket den gör när länken begärdes i appen –
visar sidan i stället en "Öppna i Skrud"-knapp som djuplänkar vidare med koden.
Knapptrycket är en användargest, och det är just vad iOS kräver för att öppna ett
custom scheme; en redirect räcker inte.

Sidan försöker medvetet INTE lösa in koden utan verifierare: ett misslyckat
försök riskerar att bränna en engångskod.

### Att tänka på inför lansering
- **Egen SMTP:** Supabases inbyggda mejltjänst har hård rate limit och generisk
  avsändare. Konfigurera en riktig leverantör (Resend/Postmark/SendGrid) under
  Authentication → Emails → SMTP Settings med `no-reply@dindomän`.
- **Site URL / Redirect:** bekräftelselänken landar på projektets Site URL
  (Authentication → URL Configuration) om inte `emailRedirectTo` skickas med i
  `supabase.auth.signUp(...)`.
