# Graph Report - kladkollen  (2026-08-16)

## Corpus Check
- 195 files · ~477,280 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1095 nodes · 2696 edges · 150 communities (72 shown, 78 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `906ca1b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- stats.tsx
- family.tsx
- expo
- useTheme
- ThemeProvider.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- my-outfit.tsx
- affiliate.ts
- models.ts
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- constants.ts
- insights.ts
- expo-apple-authentication
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- expo-calendar
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- Skrud Premium – aktivera köpen
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- app/_layout.tsx
- profiles
- wishlist
- ArchiveView.tsx
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- expo-haptics
- expo-image
- expo-image-manipulator
- expo-image-picker
- expo-linking
- expo-location
- expo-notifications
- expo-router
- 20260804_premium.sql
- expo-splash-screen
- expo-status-bar
- expo-system-ui
- expo-task-manager
- @expo/vector-icons
- react
- react-dom
- react-native
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-purchases
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-svg
- react-native-view-shot
- react-native-web
- react-native-webview
- react-native-worklets
- @react-navigation/bottom-tabs
- @react-navigation/elements
- @react-navigation/native
- @sentry/react-native
- @supabase/supabase-js
- outfit_likes
- api_rate_limits
- pending_imports
- locations
- partner_profile
- garment_sets
- expo-sharing
- public.garments
- garments
- profiles
- garments
- outfits
- profiles
- profiles
- wishlist
- profiles
- garments
- profiles
- wishlist
- profiles
- profiles
- profiles
- garments
- wishlist
- garments
- profiles
- garments
- garments
- garments
- profiles
- GarmentSetSection.tsx
- login.tsx
- expo-constants
- OutfitShareCard.tsx
- SongCard.tsx
- outfits
- expo-audio
- CreateOutfitView.tsx
- expo-clipboard
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles
- how-it-works.tsx
- onboarding.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 107 edges
2. `useSettings()` - 99 edges
3. `Theme` - 49 edges
4. `supabase` - 39 edges
5. `json()` - 37 edges
6. `requireUser()` - 35 edges
7. `showAlert()` - 35 edges
8. `expo-router` - 34 edges
9. `goBack()` - 33 edges
10. `SignedImage()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts

## Import Cycles
- None detected.

## Communities (150 total, 78 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (69): config, config, handler(), handler(), buildPrompt(), handler(), config, config (+61 more)

### Community 1 - "stats.tsx"
Cohesion: 0.13
Nodes (15): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+7 more)

### Community 2 - "family.tsx"
Cohesion: 0.10
Nodes (38): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+30 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "useTheme"
Cohesion: 0.10
Nodes (28): Index(), BENEFITS, makeStyles(), Paywall(), makeStyles(), Privacy(), SECTIONS, makeStyles() (+20 more)

### Community 5 - "ThemeProvider.tsx"
Cohesion: 0.10
Nodes (28): makeStyles(), Member, Partner(), CapsuleView(), makeStyles(), DayToNightShareCard(), makeStyles(), Props (+20 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "my-outfit.tsx"
Cohesion: 0.06
Nodes (73): ChildOutfit(), makeStyles(), COLD_LEVELS, GENDERS, LIFESTYLE, makeStyles(), Profile(), STIL_PROFIL (+65 more)

### Community 9 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.06
Nodes (72): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), GarmentDetail(), makeStyles(), SIZES (+64 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.19
Nodes (21): Ctx, EntitlementsCtx, EntitlementsProvider(), familyFeaturesEnabled(), FREE_AI_PER_WEEK, REQUIRE_FAMILY_TIER, configurePurchases(), getCustomerInfo() (+13 more)

### Community 14 - "constants.ts"
Cohesion: 0.14
Nodes (21): config, SUBCATEGORY_HINT, DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, Props (+13 more)

### Community 15 - "insights.ts"
Cohesion: 0.50
Nodes (4): BuildArgs, buildInsights(), Insight, seasonOf()

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-background-task, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.11
Nodes (21): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+13 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 22 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 24 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "household_members"
Cohesion: 0.13
Nodes (16): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+8 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.22
Nodes (8): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Kodstruktur & refaktorering, Reseplan (trips), Övrigt värt att minnas

### Community 27 - "settings.tsx"
Cohesion: 0.26
Nodes (11): setApiLang(), LANGS, Ctx, CurrencyCode, detectDeviceLang(), FALLBACK_RATES, formatWithCurrency(), SettingsCtx (+3 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 37 - "app/_layout.tsx"
Cohesion: 0.05
Nodes (62): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, styles (+54 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 55 - "20260804_premium.sql"
Cohesion: 0.53
Nodes (5): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit()

### Community 81 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 82 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 135 - "GarmentSetSection.tsx"
Cohesion: 0.35
Nodes (9): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), GarmentSet, setGarmentSet() (+1 more)

### Community 136 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 138 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 139 - "SongCard.tsx"
Cohesion: 0.33
Nodes (6): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo()

### Community 144 - "CreateOutfitView.tsx"
Cohesion: 0.29
Nodes (7): CATEGORIES, COLORS, CreateOutfitView(), makeStyles(), Props, SEASONS, STYLE_TAGS

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

### Community 154 - "how-it-works.tsx"
Cohesion: 0.40
Nodes (5): Group, GROUPS, HowItWorks(), Item, makeStyles()

### Community 155 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

## Knowledge Gaps
- **361 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `wardrobe.tsx` to `stats.tsx`, `family.tsx`, `expo`, `useTheme`, `app/_layout.tsx`, `ThemeProvider.tsx`, `GarmentSetSection.tsx`, `my-outfit.tsx`, `login.tsx`, `ArchiveView.tsx`, `garment-detail.tsx`, `constants.ts`, `onboarding.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `wardrobe.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _361 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07079414838035528 - nodes in this community are weakly interconnected._
- **Should `stats.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09758454106280193 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._