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

## Övrigt värt att minnas
- i18n är nycklad på svenska källsträngar: `tr('Svensk text')`. Övriga språk
  (en/de/es/fr) ligger i `utils/i18n.ts` (en via `enBySource`) och
  `utils/i18n.*.json`. Saknad nyckel faller tillbaka på svenskan.
- Tema via `useTheme()`/`theme/theme.ts`; inställningar via `useSettings()`.
- Info-/hjälpskärmar (terms, privacy, how-it-works) är svenska mallar.
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
