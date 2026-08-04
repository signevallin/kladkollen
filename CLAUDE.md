# CLAUDE.md — projektminne för Skrud (kladkollen)

Skrud är en svensk React Native/Expo-app (SDK 54, expo-router, TypeScript
strict) – en digital garderob med AI-outfits, väder, set, tvätt, par/familj
och Premium (RevenueCat). Backend: Supabase (auth, Postgres/RLS, RPCs) +
edge-functions på Vercel.

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
