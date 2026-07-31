# Skrud Premium – aktivera köpen

Freemium-infrastrukturen är byggd och **fungerar redan i gratis-läge**. Det här
dokumentet beskriver vad som återstår för att slå på riktiga köp.

## Modell
- **Gratis:** hela garderoben + **3 AI-outfits/vecka** + grundstatistik.
- **Premium:** obegränsade AI-outfits, par-matchning, familjeläge.
- Kvoten enforcas **serverside** (`api/generate-outfit.ts` → RPC `use_ai_credit`),
  så den går inte att kringgå. Pro-status läses ur `entitlements`-tabellen som
  bara webhooken kan skriva.

## Vad som redan är byggt
| Del | Fil |
|---|---|
| DB: entitlements + veckokvot + RPC:er | `supabase/migrations/20260804_premium.sql` |
| Serverside kvot-enforcement | `api/_utils.ts` (`useAiCredit`) + `api/generate-outfit.ts` |
| RevenueCat-wrapper (byggsäker) | `utils/purchases.ts` |
| Entitlements-context (`useEntitlements`, `isPro`) | `utils/entitlements.tsx` |
| Paywall-skärm | `app/paywall.tsx` |
| Grindar (par, familj, AI-kvot → paywall) | `app/home.tsx`, `app/profile.tsx` |
| RevenueCat-webhook (sätter pro_until) | `api/revenuecat-webhook.ts` |

`react-native-purchases` är installerat. Tills en RevenueCat-nyckel är satt körs
appen i gratis-läge (paywallen visar "Premium går snart att köpa här").

## Steg för att gå live

1. **Kör migrationen** `20260804_premium.sql` i Supabase.

2. **App Store Connect:** skapa en auto-förnyande prenumeration med två varianter
   (månad + år), t.ex. `skrud_premium_monthly` / `skrud_premium_yearly`. Gå med i
   **Small Business Program** (15 % i stället för 30 %). (Google Play: motsvarande
   produkter när Android blir aktuellt.)

3. **RevenueCat:**
   - Skapa konto + lägg till appen (iOS, ev. Android).
   - Lägg till produkterna från App Store Connect.
   - Skapa ett **entitlement med id `premium`** och koppla produkterna till det.
     (Måste heta `premium` – se `PREMIUM_ENTITLEMENT` i `utils/purchases.ts`.)
   - Skapa en **Offering** med månads- och årspaketen (det paywallen listar).

4. **Miljövariabler:**
   - App-bygget (eas.json/env): `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (den publika SDK-nyckeln),
     ev. `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
   - Server (Vercel): `REVENUECAT_WEBHOOK_SECRET` (valfritt hemligt värde),
     samt `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` (finns troligen redan).

5. **RevenueCat-webhook:** peka den mot
   `https://<er-domän>/api/revenuecat-webhook` och sätt Authorization-headern till
   samma värde som `REVENUECAT_WEBHOOK_SECRET`.

6. **Native-ombygge:** `npx expo prebuild --clean` + bygg om (react-native-purchases
   länkas via autolinking). Nu blir `purchasesAvailable` sant och paywallen visar
   riktiga paket.

## Justera gränsen
Gratis-kvoten (3/vecka) sätts på **två ställen** som måste hållas i synk:
`FREE_AI_PER_WEEK` i `api/_utils.ts` (server, den bindande) och i
`utils/entitlements.tsx` (klient, för UI).

## Möjliga framtida Premium-grindar (ej gjorda än)
- Dag-till-kväll och avancerad statistik (Mood ROI/Power Pieces) är i dag gratis.
  Statistiken har redan en egen "lås upp genom att betygsätta"-mekanik, så en
  betalgrind där bör vägas mot den.
