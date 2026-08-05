# CLAUDE.md — projektminne för Skrud (kladkollen)

Skrud är en svensk React Native/Expo-app (SDK 54, expo-router, TypeScript
strict) – en digital garderob med AI-outfits, väder, set, tvätt, par/familj,
gravidläge och Premium (RevenueCat). Backend: Supabase (auth, Postgres/RLS,
RPCs) + edge-functions på Vercel.

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

## Övrigt värt att minnas
- i18n är nycklad på svenska källsträngar: `tr('Svensk text')`. Övriga språk
  (en/de/es/fr) ligger i `utils/i18n.ts` (en via `enBySource`) och
  `utils/i18n.*.json`. Saknad nyckel faller tillbaka på svenskan.
- Tema via `useTheme()`/`theme/theme.ts`; inställningar via `useSettings()`.
- Info-/hjälpskärmar terms/privacy är svenska mallar. `how-it-works.tsx`
  ("Så funkar Skrud") är däremot översatt via `tr()` – GROUPS-datan är svensk
  källtext som wrappas i `tr()` vid render, med en\/de\/es\/fr-nycklar i i18n.
- Webb: `public/landing.html` (startsida) och `public/support.html`
  (Apple Support URL) – Skrud-branding, inga emojis.
- **Gravidläge** (valfritt, privat – ingen hälsodata): togglas som en rad i
  "Min information" i profilen (bredvid Livssituation). Data: `profiles.pregnant`
  + `profiles.due_date`; `garments.maternity_friendly` + `garments.paused_pregnancy`
  (migration `20260806_pregnancy.sql`). Logik i `utils/pregnancy.ts`
  (`trimesterFromDueDate`, `pregnancyPromptContext`). När läget är på: pausade
  plagg utesluts ur outfit-genereringen, AI-prompten blir magvänlig, upplevd
  köldkänslighet sänks ett steg, och plaggvyn visar gravid-taggarna. Egen
  skärm `app/pregnancy-wardrobe.tsx` (essentials-checklista → köplista +
  återanvänd/låna ut). Par-flödet "Matcha" är inte gravidanpassat än.
- Bild-miniatyrer: `SignedImage` tar en `transform`-prop (Supabase image
  transform, kräver betald plan). Plagg använder `resize:'contain'` +
  `format:'origin'` (bevarar transparens, beskär inte); avatarer `resize:'cover'`.
  Detaljvyn och dela-korten lämnas i full upplösning.
