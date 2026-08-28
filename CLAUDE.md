# CLAUDE.md — projektminne för Skrud (kladkollen)

Skrud är en svensk React Native/Expo-app (SDK 54, expo-router, TypeScript
strict) – en digital garderob med AI-outfits, väder, set, tvätt, par/familj,
gravidläge och Premium (RevenueCat). Backend: Supabase (auth, Postgres/RLS,
RPCs) + edge-functions på Vercel.

## Svara som produktteamet

Signe arbetar med Skrud genom ett rollspel: svar ska struktureras som ett agilt
produktteam. **Teamledaren** bryter ner uppgiften och fördelar, berörda agenter
svarar under egen rubrik, Teamledaren avslutar med en konkret slutsats. Roller:
Teamledare, Marknadsföring, Ekonomi, Kundsupport & UX Writing, Branding & UI/UX,
Backend & Reliability, Frontend & Client, Compliance & Privacy. Bara de roller som
har något att säga ska tala. Korta faktasvar behöver inte formatet.

Detta har fallit bort flera gånger när chatthistoriken rullat vidare – därav att
det står här. Not: rollbeskrivningen påstår att frontend är "Swift/SwiftUI".
Det är fel, kodbasen är React Native/Expo. Följ koden.

## Använd kunskapsgrafen först (spara tokens)

Repot innehåller en förbyggd kunskapsgraf i `graphify-out/`. **Slå upp i den
innan du greppar/läser dig igenom filer** för att förstå hur saker hänger
ihop – det är snabbare och billigare.

- `graphify-out/graph.json` – hela grafen (noder = funktioner/komponenter/
  tabeller, kanter = anrop/referenser). Fråga den i stället för att läsa filer.
- `graphify-out/GRAPH_REPORT.md` – höjdpunkter: kärnabstraktioner ("god
  nodes"), communities per skärm, kopplingar.
- `graphify-out/graph.html` – interaktiv graf för människor.

Praktiska CLI-frågor (kräver `uv tool install "graphifyy[sql]"`):
- `graphify explain "NamnPåNod"` – förklarar en nod och dess grannar.
- `graphify path "A" "B"` – kortaste vägen mellan två saker.

Arbetsflöde:
1. Börja med `GRAPH_REPORT.md` för överblick, eller `graphify explain "X"`
   för en specifik funktion/komponent.
2. Öppna bara de faktiska källfilerna när du behöver se/ändra exakt kod.
3. **Efter kodändringar:** kör `graphify update .` (ingen API-kostnad,
   deterministiskt) så grafen hålls färsk. Grafen är byggd från en viss commit
   (står i `GRAPH_REPORT.md`); jämför med `git rev-parse HEAD` för att se om
   den är inaktuell.

Grafen täcker appskärmar, `utils/`, `api/`-routes och Supabase-schemat
(`supabase/migrations/*.sql`).

## Mät mot produktion innan du skriver en siffra

Varje gång ett antagande om datan hamnade i kod eller kommentar under den här
kodbasens historia har det visat sig fel. Några verkliga exempel:

- En migration påstod "förväntat svar: 0 objekt under `public/`". Det verkliga
  svaret var 717 av 979 – att köra den hade släckt tre fjärdedelar av alla bilder.
- Ett städskript byggdes på att tre tabeller refererar bilder. Det är **nio**
  (`garments`, `wishlist`, `moodboard`, `pending_imports`, `people.avatar_url`,
  `profiles.avatar_url`, `outfits.image_urls`, `collages.items`, `trips.data`).
  Med tre av dem hade nio levande bilder raderats som "föräldralösa".
- En tillväxtmodell för skostorlekar skrevs på känsla och låg upp till 8
  storlekar fel. Den fångades bara för att den testades mot kända referensvärden.

**Regel:** har du en siffra om datan – fråga databasen först, skriv sedan. Och
när en modell approximerar verkligheten (tillväxt, temperatur, storlekar), lägg
referenspunkterna som testfall så den inte kan glida iväg obemärkt.

Två oberoende metoder som ger samma svar är den enda bekräftelse som är värd
något inför något oåterkalleligt. Städningen av 311 bilder kördes först när både
en SQL-fråga och skriptets egen regex-extrahering landade på exakt samma tal.

## Verifiering: vad som faktiskt bevisar något

`tsc` och testsviten ser inte allt. Konkreta fall där grönt ljus var värdelöst:

- **Layout.** Ett barnkort där namnet bröt ett tecken per rad passerade `tsc` och
  94 tester. Det krävdes en skärmbild. **Ta alltid en skärmbild efter en
  UI-ändring** – simulatorn nås via `mcp__Claude_Code_iOS_Simulator__control`.
- **Att appen kör din kod.** Debug-bygget bäddar in en `main.jsbundle`. En app
  som startas med `simctl launch` (eller dev-client-deeplänken) kan därför köra
  vidare på den *inbäddade* bundlen och aldrig kontakta Metro – den ser helt
  normal ut, men ingen av dina ändringar finns i den. Att greppa bundlen som
  Metro *serverar* bevisar därför ingenting om vad appen *kör*.
  **Enda giltiga kvittot: Metro-loggen visar en `iOS Bundling`/`Bundled`-rad
  efter din omstart.** Gör den inte det, kör appen gammal kod och bara
  `npx expo run:ios` hjälper.
- **Att du kan se loggarna.** Starta aldrig Metro med `… | tail -N` – pipen
  buffrar och filen fylls först när Metro avslutas, så du läser en *tidigare*
  körning. Skriv till en riktig fil (`> /tmp/metro.log 2>&1`) när du behöver
  appens `console.log`.
- **Att en promptregel biter.** Att strängen finns i prompten bevisar ingenting.
  Reglerna konkateneras och kan säga emot varandra: "ANVÄNDAREN ÄR LÄTTFRUSEN:
  lägg *hellre* till ett lager" stod bredvid "MILT VÄDER: ytterkläder är *inte
  nödvändigt*", och modellen tog rimligen tillståndet framför önskan. Dumpa hela
  regeluppsättningen (`buildWeatherContext(...).rules`) och läs den som modellen
  läser den – och generera sedan en riktig outfit. **Ändringen är inte klar
  förrän utfallet ändrats**, inte när texten finns med.
- **`console.log` och `console.warn` når INTE systemloggen i Release.** Bara
  `console.error` gör det (uppmätt i tre Release-bygden). Sandbox-köp och annat
  som bara går att testa i Release behöver alltså error-nivå för att synas i
  Xcode eller Console.app – en `__DEV__`-gatad logg är osynlig exakt där felet är.
- **Testdata skriver tillbaka sig själv.** Ändrar du en profilrad i databasen
  medan appen kör skriver den tillbaka sitt cachade värde vid nästa autosave.
  Stoppa appen först (`xcrun simctl terminate`), och **kontrollera** att
  återställningen höll i stället för att anta det.
- **Att en säkerhetsfix biter.** Att appen visar en bild bevisar ingenting –
  signerade URL:er honoreras oavsett RLS. Testa i stället policyn direkt:
  `set local role authenticated; set local request.jwt.claims = '{"sub":"<uid>"}';`
  och jämför antalet läsbara rader mot ett facit räknat som service role.

## Tysta fel är de farliga i den här kodbasen

Inget av följande kraschade något. De gav bara fel svar, i tysthet:

- `storage.list()` returnerar **100 poster som default**. Kontoraderingen lämnade
  kvar allt därutöver.
- `catch { /* ... */ }` runt hämtningen av barn i `garment-detail` dolde att
  `familyOn` var false när effekten kördes – familjesektionen uteblev helt.
- `childSizeFits` returnerade `true` när `size_cm` var null, vilket lät **varje
  sko** passera ofiltrerat (skor har `shoe_size`, inte `size_cm`).
- En effekt som beror på route-parametrar men läser ett värde som kommer från en
  RPC hinner köra före värdet finns. Beror alltid på det som faktiskt styr.

## Personaliseringen har flera vägar som glider isär

`generate-outfit` anropas från **fem håll**: hemskärmens singel- och par-flöde,
`FamilyOutfits`, `child-outfit` och `pack-trip`. De byggdes vid olika tillfällen
och har upprepade gånger halkat efter varandra. Under en enda session hittades
fem fel som alla var samma fel:

- vuxnas köldkänslighet var hårdkodad till `3` i familjeflödet
- färganalysen saknades i par och familj
- stilreglerna och undvik-noteringen saknades i familj och packning
- gravidläget saknades helt i familj och packning – både den magvänliga prompten
  och filtret på `paused_pregnancy`
- `Stil` (`style_prefs`) sparades men lästes inte av någon generering alls

Det var inte fem buggar utan en: **samma person fick olika svar beroende på
vilken knapp hon tryckte.** Symptomen dök upp ett i taget under flera dagar, och
varje enskild fix dolde att mönstret fanns.

**Regel:** lägger du till något i en prompt, gör det i ALLA vägar samtidigt. En
snabb revision är att jämföra vad servern tar emot mot vad varje anropare skickar:

```bash
grep -n "clip(body\." api/generate-outfit.ts
```

och stämma av varje fält mot `components/home/FamilyOutfits.tsx`,
`app/child-outfit.tsx` och `app/(tabs)/my-outfit.tsx`. Partnerns värden går
alltid via `partner_profile` – den är enda vägen till en hushållsmedlems profil,
och `pregnant` exponeras medvetet inte där.

## Var koden bor och vad du bygger

Det finns (eller fanns) **två utcheckningar** av repot på maskinen. Bygget görs
från `~/kladkollen` via terminal + Xcode – inte via EAS. Innan du felsöker "det
fungerar inte": kontrollera att katalogen du ändrar i är den som byggs, och att
appen kör din kod. Ett snabbt facit är om postadressen syns i integritetspolicyns
avsnitt 1 – den kom sent och fungerar som markör för hela paketet.

**Kopiera inte filer mellan utcheckningarna.** Det frestar när man vill bygga en
snabb ändring, men lämnar ströfiler i fel kataloger – en gång skrevs `supabase.ts`
över med den genererade typfilen – och blockerar nästa `git pull` med "local
changes would be overwritten". Committa och pulla i stället.

Ändras `app.json` (plugins, behörighetstexter, `privacyManifests`) krävs
`npx expo prebuild` innan Xcode ser det. Ren JS kräver ingen prebuild.

## Kodstruktur & refaktorering
- Stora skärmar bryts ned i delkomponenter, samlade i `components/<skärm>/`.
  Två mönster används:
  - **Egen state (fetchar/sparar själv):** komponenten äger sin state och
    data-fetch, parent säger bara vad som ska visas och får en signal tillbaka.
  - **Presentation (parent äger data):** komponenten tar emot data + handlers
    som props och renderar bara.
- Redan uppdelat:
  - `components/wardrobe/` – `WishlistAddModals`, `SaleAddModal`, `ArchiveView`
    (egen state; parent skickar data + `onAdded`/`onRefresh`), samt
    presentationskomponenterna `WishlistTab`/`SaleTab`. (wardrobe.tsx 1626→985)
  - `components/profile/ColorAnalysis.tsx` – hela färganalysen; laddar egen
    profildata, äger input-/resultat-state, sparar själv, `onAnalyzed`-signal
    till profilraden. (profile.tsx 1138→779)
  - `components/home/GarmentPicker.tsx` (plagg-/set-väljaren, äger eget
    filter-/söktillstånd) + `SwapSheet.tsx` (byt-ut-arket, presentation –
    används för både singel- och par-outfit). (home.tsx 1800→1516)
  - `components/my-outfit/CreateOutfitView.tsx` – hela skapa/ändra-outfit-
    helskärmen; äger create-state, härleder filtrerad lista via `useMemo`,
    sparar själv. Parent styr bara `creating` + `editOutfit` (null = ny). (1335→1130)
  - `components/add-garment/DraftCard.tsx` – redigerbart plaggkort i
    granska-steget (presentation). `GarmentDraft`-typen exporteras från
    `app/add-garment.tsx`. (796→574)
  - `components/garment-detail/GarmentSetSection.tsx` – set-funktionen (välj/
    skapa/lämna set + väljarmodal); egen state, sparar via `utils/sets`,
    parent skickar `garmentId` + `initialSetId`. (924→822)
- `stats.tsx` lämnas medvetet odelad: sammanhållen dashboard där varje sektion
  är en unik visualisering knuten till många beroende beräknade värden – att
  dela den blir omflyttning med stor prop-yta utan att ta bort duplicering.
- Vid uppdelning: co-lokalisera modal-/vy-state i komponenten, håll data-fetch
  i skärmen (om inte komponenten äger hela delfunktionen), och rensa parentens
  nu oanvända imports/konstanter/stilar.
- **Verifiera refaktoreringar med `npx tsc --noEmit`.** Kör `npm ci
  --ignore-scripts` först om `node_modules` saknas i en färsk container.
  Baslinjen är helt ren (0 fel) – varje fel du ser är ditt eget att åtgärda.
  (`noUnusedLocals` är av, så oanvända imports/stilar fångas inte av tsc –
  rensa dem manuellt med grep.)

## Migrationsfilerna kan ha drivit ifrån produktion

`supabase/migrations/*.sql` är inte garanterat sanningen. Minst en funktion
(`effective_entitlement()`) hade fått nya kolumner och en extra sorteringsnyckel
applicerade direkt mot databasen, utan migrationsfil – repot var alltså flera
ändringar efter.

**Innan du skriver om en befintlig SQL-funktion: hämta den deployade
definitionen först**, annars raderar din `create or replace` funktionalitet som
bara finns i produktion:

```sql
select pg_get_functiondef(p.oid) from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'funktionsnamn';
```

Symtomet när man missar det är antingen `42P13: cannot change return type of
existing function` (om tur) eller en tyst funktionsförlust (om otur).

## Databastyper
- `types/supabase.ts` är **autogenererad** från prod-schemat (redigera inte för
  hand). Regenerera vid schemaändringar:
  `npx supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts`.
- `types/models.ts` är den enda källan för domäntyper: `Garment`, `Outfit`,
  `WishItem`, `Profile` m.fl. (tunna alias över `Tables<'…'>`). Importera dem
  därifrån i stället för att skriva `any` när du hanterar tabellrader.
- `supabase`-klienten är typad med `createClient<Database>` – alla `.from()`-
  frågor returnerar därför schema-typade rader och felstavade kolumnnamn/
  fältnamn (t.ex. `archive_reason`) fångas av `tsc` i stället för av testare.
  JSON-kolumner (`color_analysis`, `notif_prefs`, `outfit_context_notes`) är
  `Json` – casta vid gränsen (`as unknown as …`) när du läser/skriver dem.

## Data, cache & prestanda
- **Plagg hämtas via `utils/garmentsStore`.** `loadGarments()` (in-flight dedup +
  20 s TTL, cachar till `garments.all`) delas av hem/garderob/outfits/statistik i
  stället för egna `from('garments')`-queries. Varje skärm hämtar hela raderna
  och filtrerar själv (egna = `person_id == null`, arkiverade, till salu …).
  **Regel:** efter VARJE skrivning mot `garments` (tvätt/sälj/arkiv/redigera/nytt
  plagg/använd-räknare) måste `invalidateGarments()` anropas – annars ser andra
  flikar gammal data inom TTL:en. (Inspiration hämtar plagg on-demand i egna
  actions och går medvetet inte via storen.)
- **`utils/cache` är write-through mot AsyncStorage** och hydreras en gång i
  `app/_layout.tsx` (`hydrateCache()`) innan flikarna monteras – så en kallstart
  ritar senast kända data direkt. Skärmar seedar sin state från `cacheGet(...)`.
  `cacheClear()` (utloggning) tömmer även disk-cachen.

## Bakgrundsborttagning (Replicate)
- `api/remove-background.ts` + klienthjälparen `utils/removeBg.removeBackground()`
  kör som **kort START-anrop (skapar jobbet asynkront, returnerar `predictionId`)
  + korta POLL-anrop** (var 2 s, upp till ~80 s). En enda lång request fick
  mobilen att släppa anslutningen ("Network request failed") / plattforms-timeout.
  Alla flöden (add-garment, garment-detail, import-purchases/-email) går via
  hjälparen – anropa aldrig endpointen direkt. Vid fel sparas plagget med
  originalfotot.
- `requireUser(request, { rateLimit: false })` autentiserar utan att räkna mot
  AI-rate-limiten – används för POLL-anropen. Modell via `REPLICATE_MODEL`
  (default `cjwbw/rembg`). Servern (`api/`) deployas av Vercel; app-koden byggs
  separat med EAS/Xcode – en serverfix kräver alltså både Vercel-deploy och
  nytt appbygge. Native nätverksbeteende (timeouts) går inte att testa i Expo web.

## Reseplan (trips)
- Lokal resa speglas till `trips` via `utils/trip.mirrorLocalTripToDb()` (appstart
  + outfit-fokus) så en partner kan se den (läsläge via SECURITY DEFINER
  `partner_trip()`). **Gotcha:** supabase-js `.upsert()` behöver SELECT-rätt
  (RETURNING); SELECT hade revokerats i advisor-hardeningen och fick återges
  (`20260807_trips_grant_select.sql`), annars misslyckades synken tyst.
- Egna "glöm inte"-saker (extras) är redigerbara och sparas separat
  (`kladkollen_trip_extras`) – de läggs alltid överst när en ny resa planeras.

## Övrigt värt att minnas
- **Insikter** (tredje fliken i statistik): `components/stats/InsightsTab.tsx` +
  `utils/insights.ts` (deterministiskt, inga AI-anrop). Varje insikt visas bara
  med tillräcklig data; säsongsinsikten kräver ett års logg-historik.
- **Partner-/hushållsläge:** garderob och outfits kan visa en partners/barns data
  i läsläge; `components/PersonSwitcher.tsx` byter person i headern. Partnerdata
  hämtas via household-vaktade `partner_*`-RPC:er.
- **Dela-kollage** (`components/OutfitShareCard.tsx`): strukturerat flatlay –
  överdelar mitten upptill, underdelar under, resten på sidorna; smycken/
  accessoarer ritas alltid smått (väskor undantag). Roll avgörs av kategori,
  namn-gissning som reserv. Kräver att plaggen har `category` med i outfit-datan.
- **Auth-mejlmallar** (bekräftelsemejl m.m.) ligger som referens i
  `supabase/email-templates/` men redigeras/sparas i Supabase Dashboard.
- Inställningen `showDailySong` (Profil → Musik) döljer "Dagens låt"; lagras
  lokalt i `useSettings` (AsyncStorage), ingen DB.
- i18n är nycklad på svenska källsträngar: `tr('Svensk text')`. Övriga språk
  (en/de/es/fr) ligger i `utils/i18n.ts` (en via `enBySource`) och
  `utils/i18n.*.json`. Saknad nyckel faller tillbaka på svenskan.
- Tema via `useTheme()`/`theme/theme.ts`; inställningar via `useSettings()`.
- Info-/hjälpskärmar terms/privacy är svenska mallar. `how-it-works.tsx`
  ("Så funkar Skrud") är däremot översatt via `tr()` – GROUPS-datan är svensk
  källtext som wrappas i `tr()` vid render, med en\/de\/es\/fr-nycklar i i18n.
- Webb: `public/landing.html` (startsida) och `public/support.html`
  (Apple Support URL) – Skrud-branding, inga emojis.
- **Varumärke/wordmark:** Skrivs alltid **SKRUD** i versaler, med luftig
  teckenspärr (`letter-spacing` ~.22em på webben, `letterSpacing` ~6 i appen),
  i **Poppins** (700) och **mörkbrunt** (`var(--brand)` #402D21 på webben,
  `t.primary` i appen). Undantag: på mörk bakgrund (inloggningens hero) ritas
  ordmärket ljust (`C.ink`) för kontrast. Gäller logga/ordmärke – i löptext
  skrivs "Skrud" normalt (versal S, gemener). Ställen: landningssidans topp/
  sidfot, `support/terms/privacy.html`, samt `app/login.tsx` (referensstilen).
- **Gravidläge** (valfritt, privat – ingen hälsodata): togglas som en rad i
  "Min information" i profilen (bredvid Livssituation). Data: `profiles.pregnant`
  + `profiles.due_date`; `garments.maternity_friendly` + `garments.paused_pregnancy`
  (migration `20260806_pregnancy.sql`). Logik i `utils/pregnancy.ts`
  (`trimesterFromDueDate`, `pregnancyPromptContext`). När läget är på: pausade
  plagg utesluts ur outfit-genereringen, AI-prompten blir magvänlig, upplevd
  köldkänslighet sänks ett steg, och plaggvyn visar gravid-taggarna. Egen
  skärm `app/pregnancy-wardrobe.tsx` (essentials-checklista → köplista +
  återanvänd/låna ut). Par-flödet "Matcha" är inte gravidanpassat än.

## Barn, storlekar och kategorier

- **Två skalor, inte en.** Kläder mäts i `size_cm` (kroppslängd, `EU_CHILD_SIZES`),
  skor i `shoe_size` (EU-nummer, `EU_SHOE_SIZES`). Barnet har `current_size_cm`
  respektive `current_shoe_size`. Funktioner speglas med `Shoe`-suffix. Sätt
  aldrig `size_cm` på en sko.
- **`childSizeFits` är fönstret som styr allt** – outfitgenerering, familjeoutfits
  och resepackning. Default är nuvarande storlek och ett steg NER.
  `people.allow_larger_size` öppnar ett steg UPP, per barn. Påverkar medvetet
  **inte** storlekspåminnelserna: de handlar om när ett plagg börjar passa, vilket
  är en annan fråga än vad barnet får bära idag. Att blanda ihop dem var skälet
  till att fönstret en gång skärptes.
- **`categoryMap` i `buildGroupedGarmentList` bestämmer vad AI:n ens ser.**
  `Sovkläder`, `Underkläder` och `Badkläder` saknas där med flit. Följden är att
  ett plagg i fel kategori blir helt osynligt för genereringen – därför flyttas
  barnets body till `Toppar` (`categoryForChildGarment`), eftersom `Body` finns
  som underkategori under både `Toppar` och `Underkläder` och AI:n annars väljer
  olika från gång till gång.
- **`renderGarmentGroups` har en 7500-teckens budget** och klipper rundgångsvis
  med "… och N till i den här kategorin". Barn ryms lätt; en vuxen garderob på
  några hundra plagg gör det inte – då ser modellen bara en del.
- **Sovkläder läggs till deterministiskt** i barnets packlista, eftersom AI:n
  aldrig nämner dem (kategorin saknas i outfitgrupperna). Extras måste därför
  rensas mot packlistan (`extraAlreadyPacked`), annars står pyjamasen på två
  ställen.
- **`dedupOutfitItems` ska köras på ALLA outfitresultat.** Prompten säger "exakt
  EN överdel" men modellen bryter mot det. Barn-outfitskärmen dedupade,
  resepackningen gjorde det inte – samma modell gav då olika resultat beroende på
  var man frågade.

## Bildlagring & integritet (rör inte utan att läsa detta)

- **`garments`-bucketen är PRIVAT.** Den var publik en period av egress-skäl;
  det gav publika, osignerade URL:er till alla användares foton (inkl. barns
  avatarer) och policies vars enda villkor var `bucket_id` – dvs. vem som helst
  inloggad kunde radera eller skriva över andras bilder. Åtgärdat i
  `20260823_storage_owner_policies.sql` (ägar-scopad skrivning) och
  `20260824_storage_private_signed.sql` (privat + läspolicy för ägare och
  hushållsmedlemmar via `can_read_garment_object()`).
- **Egress-vinsten behålls via `utils/signedUrls.ts`:** signaturer med 30 dygns
  livslängd cachas write-through till disk och hydreras vid appstart, så URL:en
  är stabil mellan appstarter (samma cache-nyckel för CDN och `expo-image`).
  Nya bilder signeras batchat (`createSignedUrls`) i en tick. **Gå aldrig
  tillbaka till `getPublicUrl()`** – det öppnar hålet igen.
- **Bucketen har FYRA sökvägsmönster, inte ett** (mätt 2026-08-22):
  `{user_id}/…` (248, nuvarande), `public/…` (717), `moodboard/…` (12),
  `avatars/…` (2). Legacy-prefixen går inte att matcha på mappnamn – de
  attribueras via `storage.objects.owner`, som är verifierat pålitlig (owner
  stämmer med radens `user_id` i 100 % av de refererade fallen). Läspolicyn är
  därför skriven generellt ("äger du objektet får du läsa det") i stället för
  att räkna upp prefix. 266 legacy-objekt är oreferererade föräldralösa filer
  och bör städas i ett eget granskat steg.
- `uploadUserImage()` returnerar numera **sökvägen**, inte en URL. Äldre rader
  med full publik URL hanteras fortfarande av `storagePathFrom()`.
- `clearSignedUrls()` måste anropas tillsammans med `cacheClear()` vid
  utloggning/kontoradering (se `app/profile.tsx`).
- **Integritetspolicyn beskriver det här.** `app/privacy.tsx` och
  `public/privacy.html` innehåller samma text och måste ändras i SAMMA PR som
  bildlagring, tredjepartsleverantörer eller lagringstider ändras. Policyn
  påstod tidigare "private storage … time-limited signed links" medan bucketen
  var publik – ett osant påstående i policyn är i sig ett GDPR-brott.
- `api/delete-account.ts` sidindelar `storage.list()` (default är 100 poster)
  och raderar hushåll som blir tomma, annars överlever `people`-raderna
  (barnens namn/födelsedatum) raderingen.

- Bild-miniatyrer: `SignedImage` tar en `transform`-prop. **Gotcha (kostnad):**
  Supabase fakturerar per origin-bild som transformeras, och **varje storlek av
  samma bild är en egen transformation**. Avatarerna var länge undantagna med
  motiveringen "de är få" – men de begärdes i fem vystorlekar (96/120/160/220/
  240), så sju avatarer drog 14 % av månadskvoten vid elva användare, medan 648
  plaggbilder drog noll. Undantaget skalade alltså med *antalet vystorlekar*,
  inte med antalet användare. Sedan 2026-08-25 använder **alla** bilder
  `format:'origin'`: SignedImage hoppar då över server-transformen helt och låter
  `expo-image` skala ner till vyns storlek på enheten. Avatarer förlorar inget –
  `downscaleForUpload()` lagrar dem redan som 512 px WebP och beskärningen görs
  av `contentFit:'cover'` lokalt. Håll uppladdade plaggbilder rimligt små
  (`MAX_IMAGE_WIDTH` i add-garment = 1000) eftersom origin laddas direkt.
  **Lägg inte tillbaka en server-transform** utan att först räkna vystorlekar ×
  bilder mot kvoten – transformerade bilder signeras dessutom var för sig
  (batch-API:t stödjer inte `transform`) och får en egen cache-nyckel per storlek.
