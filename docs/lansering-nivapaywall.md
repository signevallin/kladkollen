# Lansering: nivåbaserad paywall (Singel / Partner / Familj)

Den här checklistan aktiverar den nivåbaserade paywallen som ligger på grenen
`claude/tiered-paywall`. **Koden är klar och `tsc`-ren** – det som återstår är
konfiguration i App Store Connect + RevenueCat och rätt ordning vid release.

Så länge inget av nedan är gjort degraderar appen snällt: paywallen visar
"Premium går snart att köpa här", och köp är inaktiva. Inget kraschar.

---

## 0. Nyckelfakta koden förutsätter (ändra inte utan att ändra koden)

Både servern (`api/_utils.ts` `getUserTier`, migrationen `current_tier()`) och
klienten (`utils/purchases.ts`) härleder nivån ur **product-id** och **entitlement-namn**.
Namnge därför produkterna exakt så här:

**Nivå ur product-id** (skiftlägesokänsligt, delsträng):
| Innehåller | Nivå |
|-----------|------|
| `family` eller `familj` | Familj |
| `partner` | Partner |
| annat betalt | Singel |

**Årsvis** känns igen om product-id (eller perioden) innehåller `annual`, `year` eller `år`.

**Entitlement-namn i RevenueCat** (klientens `tierFromInfo`): exakt `single`, `partner`, `family`.

---

## 1. App Store Connect – prenumerationer

Skapa **en** prenumerationsgrupp (t.ex. "Skrud Premium") med **sex**
auto-förnyande prenumerationer. En grupp gör att en användare bara kan ha en
aktiv nivå åt gången och kan upp-/nedgradera smidigt.

| Product ID | Nivå | Period | Pris (SEK) |
|-----------|------|--------|-----------|
| `skrud_single_monthly` | Singel | 1 mån | 29 |
| `skrud_single_annual` | Singel | 1 år | 249 |
| `skrud_partner_monthly` | Partner | 1 mån | 49 |
| `skrud_partner_annual` | Partner | 1 år | 449 |
| `skrud_family_monthly` | Familj | 1 mån | 69 |
| `skrud_family_annual` | Familj | 1 år | 599 |

- Lokaliserad titel/beskrivning per produkt (minst svenska + engelska).
- En marknadsförings-/granskningsskärmdump krävs per grupp.
- Prenumerationerna kan **submittas tillsammans med app-bygget** (första gången
  måste minst en In-App Purchase skickas in i samma version).

## 2. RevenueCat

1. **Koppla App Store Connect** (App-Specific Shared Secret) under projektets
   Apple-inställningar.
2. **Products:** importera/lägg till de sex product-id:na ovan.
3. **Entitlements:** skapa tre – `single`, `partner`, `family`. Attachera
   **kumulativt** (så en högre nivå inkluderar de lägre):
   - `skrud_single_*` → `single`
   - `skrud_partner_*` → `single`, `partner`
   - `skrud_family_*` → `single`, `partner`, `family`
4. **Offering:** skapa en offering (märk den **current/default**) med sex
   paket, ett per product-id. Klienten läser `offerings.current.availablePackages`.
5. **API-nyckel:** kopiera den **publika Apple-nyckeln** (börjar med `appl_...`).

## 3. Nycklar & webhook

- **`eas.json`:** byt `EXPO_PUBLIC_REVENUECAT_IOS_KEY` från test-nyckeln
  (`test_...`) till produktionsnyckeln (`appl_...`). Finns i både build-profilerna.
- **Vercel env:** sätt `REVENUECAT_WEBHOOK_SECRET` (valfritt hemligt värde).
- **RevenueCat → Integrations → Webhooks:** URL
  `https://skrud.app/api/revenuecat-webhook`, Authorization-header = samma värde
  som `REVENUECAT_WEBHOOK_SECRET`. Webhooken skriver `entitlements.product_id`
  + `pro_until` per användare (`app_user_id` = Supabase-user-id, sätts av
  `identifyPurchases`).

## 4. Databas-migration

Kör **`supabase/migrations/20260811_tier_gating.sql`** (`current_tier()` +
grindar på `create_partner_invite()` / `ensure_household()`).

> ⚠️ Kör den **först när RevenueCat-produkterna + entitlements är live och minst
> en betald användare kan finnas**. Innan dess returnerar `current_tier()`
> `'none'` för alla, vilket gör par-/familjefunktionerna otillgängliga.

## 5. Merga koden & bygg

- **Merga `claude/tiered-paywall` → main.** Då deployar Vercel serverns
  nivå-grindar (färganalys + garderobsanalys kräver Singel; par/familj via RPC:erna).
- **Gör ett EAS-produktionsbygge** så den nya nivå-paywallen och klient-grindarna
  kommer med i appen.

> ⚠️ **Ordningsvarning:** serverns grind på `analyze-color`/`analyze-wardrobe`
> börjar returnera `402 premium_required` för gratisanvändare i samma stund
> api:t deployas. Den **nya** appen hanterar det (klienten kollar `isPro` och
> visar paywall i stället för att anropa), men **äldre TestFlight-byggen** gör
> det inte. Deploya därför api-grindarna i samma släpp som det nya app-bygget.

## 6. Testa i sandbox (TestFlight)

- [ ] Paywallen visar tre nivåer med rätt priser (månad/år-växlaren funkar).
- [ ] Köp av varje nivå går igenom; `isPro`/`tier` uppdateras direkt.
- [ ] Färganalys + "analysera garderoben" är låsta på gratis, upplåsta på Singel+.
- [ ] Par-läge kräver Partner, Familj/barn kräver Familj (RPC:erna kastar annars).
- [ ] Inbjuden partner/familjemedlem kan gå med **gratis** i betalande ägares
      hushåll (`join_by_invite` är avsiktligt ogrindad).
- [ ] "Återställ köp" återställer rätt nivå.
- [ ] Webhook: efter köp finns rätt `product_id` + `pro_until` i `entitlements`.

## 7. Beslut som redan är tagna

- Priser: 29/49/69 kr/mån, 249/449/599 kr/år.
- Gravidläge ligger under **Partner**.
- Färganalys + AI-garderobsanalys kräver minst **Singel**.
- **Ingen grandfathering** – befintliga gratisanvändare möter grinden direkt.
