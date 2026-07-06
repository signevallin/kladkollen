# Klädkollen 🍒

Din digitala garderob med AI-stylist. Fotografera dina plagg, låt AI:n katalogisera dem och få kompletta outfits anpassade efter kontext (jobb/ledig/fest) och dagens väder.

Byggd med Expo (React Native + webb), Supabase (auth, databas, lagring) och serverless-funktioner på Vercel som proxar AI-anropen (OpenAI + Anthropic).

## Kom igång

```bash
npm install
npx expo start
```

## Miljövariabler

Klienten (`.env` lokalt / Vercel env):

| Variabel | Beskrivning |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase-projektets URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon-nyckel (publik) |
| `EXPO_PUBLIC_API_URL` | Bas-URL till API:t för native-byggen (tom på webben) |

Servern (endast Vercel env — får ALDRIG ha `EXPO_PUBLIC_`-prefix):

| Variabel | Beskrivning |
| --- | --- |
| `OPENAI_API_KEY` | Används av outfit-/inspo-/färganalys-endpoints |
| `ANTHROPIC_API_KEY` | Används av plagg-/färganalys-endpoints |
| `SUPABASE_SERVICE_ROLE_KEY` | Krävs av `/api/delete-account` |

## Arkitektur

- `app/` — skärmar (expo-router). Auth-guard ligger i `app/_layout.tsx`.
- `api/` — Vercel edge functions. Alla kräver inloggad användare (Supabase-JWT i `Authorization`-headern) via `api/_utils.ts`.
- `components/SignedImage.tsx` — visar bilder ur den privata storage-bucketen via signerade URL:er.
- `public/landing.html` — statisk landningssida, serveras på `/` via `vercel.json`.

## Bygga för butikerna

```bash
npx eas build --profile production --platform all
```

Bundle-id: `se.kladkollen.app`. Profiler finns i `eas.json`.
