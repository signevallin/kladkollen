# Skrud – App Store Connect: App Privacy & App Review

Ifyllnadshjälp för inlämning. Grundad på vad appen faktiskt gör (Supabase-konto,
foton, plats för väder, familjeläge, AI via OpenAI/Anthropic/Replicate, Sentry
för kraschrapporter). **Skriv aldrig in riktiga lösenord i det här dokumentet –
demokonto-uppgifterna fylls in direkt i App Store Connect.**

---

## 1. App Privacy ("nutrition label")

### Data Used to Track You
**Ingen.** Appen har inga annons-/spårnings-SDK:er, använder inte IDFA och kräver
ingen App Tracking Transparency-prompt. Svara **"No"** på tracking genomgående.

### Data som samlas in
Allt nedan är **kopplat till användaren** (Linked to You) och **används inte för
tracking**. Syfte anges per typ.

| Apple-kategori | Datatyp | Samlas in? | Syfte | Kommentar |
|---|---|---|---|---|
| **Contact Info** | Email Address | Ja | App Functionality | Konto (e-post/Apple/Google). Apple Private Relay stöds. |
| **Contact Info** | Name | Ja | App Functionality | Profilnamn + namn på familjemedlemmar användaren lägger till. |
| **User Content** | Photos or Videos | Ja | App Functionality | Bilder på plagg/inspiration (kamera + bibliotek). |
| **User Content** | Other User Content | Ja | App Functionality, Product Personalization | Plaggdetaljer, outfits, anteckningar, stilregler. |
| **Identifiers** | User ID | Ja | App Functionality | Konto-id (Supabase). |
| **Identifiers** | Device ID | Ja | App Functionality | Push-token för notiser. |
| **Location** | Coarse Location | Ja | App Functionality | Väderbaserade outfit-förslag. Låg precision (~stad/kvarter). |
| **Purchases** | Purchase History | Ja* | App Functionality | *Endast om användaren använder "Importera köp" (namn, märke, pris, datum). |
| **Diagnostics** | Crash Data | Ja | App Functionality | Sentry, `sendDefaultPii: false`. Ej kopplat till identitet. |
| **Diagnostics** | Performance Data | Ja | App Functionality | Sentry (låg samplingsgrad). Ej kopplat till identitet. |
| **Other Data** | Other Data | Ja | App Functionality, Product Personalization | Preferenser (musikgenrer, köldkänslighet, livsläge) samt familjemedlemmars födelsedatum/storlek/kön (för storlekspåminnelser). |

**Not om kalendern:** appen begär kalenderbehörighet och läser dagens händelser,
men behandlingen sker **helt på enheten** (`utils/calendar.ts`) – inget
kalenderinnehåll skickas till oss eller till tredje part, och inget sparas.
Kalenderdata ska därför **inte** anges som insamlad data i etiketten. Det är
ändå redovisat i integritetspolicyns avsnitt 2, och nämns i Review Notes nedan.

**Not om Diagnostics:** Sentry kör med `sendDefaultPii: false`, så markera Crash/
Performance Data som **inte** kopplat till användaren (Not Linked). Övriga rader
är kopplade (Linked).

**Not om barndata:** I familjeläget matar användaren in uppgifter om sina egna
barn (namn, födelsedatum, storlek). Appen tillhör **inte** Kids-kategorin – den
riktar sig till vuxna som sköter hushållets garderob.

### Tredjepartsbehandling (för privacy policy, inte själva etiketten)
Plagg­bilder och text skickas till **OpenAI**, **Anthropic** och **Replicate**
för att generera outfits/analys och ta bort bakgrund. De agerar
databehandlare (inte för egen annonsering). Väderdata hämtas från **Open-Meteo**.
Detta står numera i integritetspolicyn (avsnitt 4), tillsammans med Supabase,
Vercel, RevenueCat och Sentry. Avsnitt 5 redovisar överföringen till USA och
grunden för den (SCC / EU–US DPF) – det saknades tidigare helt.

### Privacy Policy URL
Ange URL:en i App Store Connect (t.ex. `https://<er-domän>/privacy` – samma
sida som finns i appen). Krävs.

> ⚠️ Innan inlämning: fyll i `[LEGAL FORM]`, `[REG. NO.]` och `[POSTAL ADDRESS]`
> i avsnitt 1 av policyn (`app/privacy.tsx` + `public/privacy.html`). Så länge
> platshållarna står kvar saknar policyn en identifierbar personuppgifts-
> ansvarig, vilket bryter mot GDPR art. 13.1(a).

### Privacy Manifest (PrivacyInfo.xcprivacy)
Konfigurerad via `ios.privacyManifests` i `app.json`: `NSPrivacyTracking: false`,
tom `NSPrivacyTrackingDomains` och de fyra required-reason-API:er appen använder
(FileTimestamp `C617.1`, UserDefaults `CA92.1`, DiskSpace `E174.1`,
SystemBootTime `35F9.1`).

**Verifiera i det faktiska bygget** – saknas manifestet avvisas uppladdningen
med `ITMS-91053` redan innan review:

```
npx expo prebuild -p ios --no-install
plutil -p ios/Skrud/PrivacyInfo.xcprivacy
```

Tredjepartsberoenden (`@sentry/react-native`, `expo-file-system`,
AsyncStorage m.fl.) levererar sina egna manifest i respektive pod – de behöver
inte upprepas här, men kontrollera att inget nytt beroende saknar sitt.

---

## 2. App Review Information

### Sign-In krävs
Appen kräver inloggning. Lägg in ett **demokonto** i App Store Connect →
*App Review Information* → *Sign-In required: Yes*:

```
Användarnamn:  <DEMO_EMAIL>        (fyll i i App Store Connect – inte här)
Lösenord:      <DEMO_PASSWORD>
```

**Förbered demokontot så här (viktigt – annars ser granskaren en tom app):**
1. Skapa ett konto i appen med en e-post ni kontrollerar.
2. Lägg till **minst 6–8 plagg** i olika kategorier (överdel, underdel, skor,
   ytterplagg) med bilder – AI:n kräver minst skor + över-/nederdel för att
   kunna generera en outfit.
3. Valfritt: logga en outfit och betygsätt den, så statistik-vyn har innehåll.
4. Verifiera att inloggning fungerar med uppgifterna innan inlämning.

> Tips: Sign in with Apple fungerar också, men ett stabilt e-post/lösenord-konto
> är enklast för granskaren.

### Review Notes (klistra in i "Notes")

```
Skrud is a digital wardrobe and AI stylist.

GETTING STARTED
- Sign in with the demo account provided above (or Sign in with Apple).
- The demo account already has garments added so features work immediately.

KEY FLOWS TO TEST
- Home: tap "Generate outfit" to get an AI-styled outfit for the selected
  context (work, date, party, etc.). Requires garments in the wardrobe.
- Wardrobe: browse/add garments; add a photo via camera or photo library.
- The daily song card plays a 30-second preview from Apple's iTunes Search
  API and links out to Apple Music / Spotify.

PERMISSIONS (all optional; the app works if declined)
- Location: used only to fetch local weather so outfit suggestions match the
  weather. Coarse/low accuracy.
- Camera & Photos: to add pictures of garments.
- Notifications: optional weather tips and reminders.
- Calendar: optional, to suggest an outfit that fits the day's plans.

THIRD-PARTY CONTENT
- Song previews and artwork come from Apple's iTunes Search API (30s previews,
  streamed, linked back to Apple Music). Links to Spotify/Apple Music use their
  official logos. Content Rights = Yes.

AI
- Outfit generation and image analysis use OpenAI/Anthropic; garment images are
  processed to suggest outfits. No content is used for advertising.

The app is available in Swedish, English, German, Spanish and French.
```

### Övriga ASC-svar
- **Content Rights:** Yes (appen använder/lånkar till tredjepartsinnehåll –
  Apple Music-previews, Spotify/Apple Music-länkar – med rättigheterna på plats).
- **Export Compliance:** redan hanterat i appen via
  `ITSAppUsesNonExemptEncryption: false` (ingen icke-undantagen kryptering).
- **Age Rating:** fyll i formuläret; appen har inget känsligt innehåll →
  förväntas bli 4+ (ev. beroende på webblänkar ut).
- **Advertising Identifier (IDFA):** No.

---

## 3. Checklista före inlämning
- [ ] Företagsuppgifter ifyllda i integritetspolicyns avsnitt 1 (inga `[...]` kvar).
- [ ] `PrivacyInfo.xcprivacy` verifierad i prebuild-utdata.
- [ ] Demokonto skapat och fyllt med plagg; uppgifter inlagda i ASC.
- [ ] App Privacy ifylld enligt tabellen ovan; Tracking = No.
- [ ] Privacy Policy URL angiven.
- [ ] Content Rights = Yes.
- [ ] Age Rating-formuläret ifyllt.
- [ ] Review Notes inklistrade.
