# Graph Report - kladkollen  (2026-08-05)

## Corpus Check
- 166 files · ~428,646 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 915 nodes · 2093 edges · 139 communities (66 shown, 73 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `384b30f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUser
- garment-detail.tsx
- family.tsx
- expo
- notifications.tsx
- goBack
- scripts
- Skrud – Marknadsföringsplaybook
- entitlements.tsx
- ThemeProvider.tsx
- ArchiveView.tsx
- login.tsx
- expo-router
- pregnancy.ts
- home.tsx
- stats.tsx
- profile.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- useTheme
- include
- trip.ts
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- affiliate.ts
- Skrud Premium – aktivera köpen
- useSettings
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- expo-audio
- expo-background-task
- expo-calendar
- expo-camera
- expo-clipboard
- expo-constants
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- @expo-google-fonts/poppins
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
- cacheGet
- SongCard.tsx
- how-it-works.tsx
- Button.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 87 edges
2. `useSettings()` - 67 edges
3. `Theme` - 39 edges
4. `requireUser()` - 35 edges
5. `goBack()` - 35 edges
6. `json()` - 33 edges
7. `supabase` - 33 edges
8. `expo-router` - 29 edges
9. `showAlert()` - 27 edges
10. `clip()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `cacheGet()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/cache.ts

## Import Cycles
- None detected.

## Communities (139 total, 73 thin omitted)

### Community 0 - "requireUser"
Cohesion: 0.07
Nodes (65): config, config, handler(), handler(), config, handler(), SUBCATEGORY_HINT, config (+57 more)

### Community 1 - "garment-detail.tsx"
Cohesion: 0.06
Nodes (69): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), SIZES, makeStyles(), SIZES (+61 more)

### Community 2 - "family.tsx"
Cohesion: 0.10
Nodes (39): daysSince(), handler(), sendBatch(), today(), Family(), loadChildren(), makeStyles(), reminderLabel() (+31 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "notifications.tsx"
Cohesion: 0.07
Nodes (40): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, makeStyles() (+32 more)

### Community 5 - "goBack"
Cohesion: 0.15
Nodes (16): makeStyles(), Member, Partner(), Essential, ESSENTIALS, makeStyles(), MG, PregnancyWardrobe() (+8 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "entitlements.tsx"
Cohesion: 0.23
Nodes (17): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), useEntitlements(), configurePurchases() (+9 more)

### Community 9 - "ThemeProvider.tsx"
Cohesion: 0.14
Nodes (17): makeStyles(), ResetPassword(), CropModal(), makeStyles(), makeStyles(), Props, QueryState(), darkColors (+9 more)

### Community 10 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 11 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 12 - "expo-router"
Cohesion: 0.25
Nodes (7): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs, expo-router

### Community 13 - "pregnancy.ts"
Cohesion: 0.36
Nodes (6): dueInWeeks(), NOW, pregnancyPromptContext(), Trimester, trimesterFromDueDate(), trimesterLabel()

### Community 14 - "home.tsx"
Cohesion: 0.22
Nodes (11): Home(), INTENSITY_LABELS, makeStyles(), OUTFIT_CONTEXTS, STYLE_RULES, FREE_AI_PER_WEEK, fetchSets(), buildWeatherContext() (+3 more)

### Community 15 - "stats.tsx"
Cohesion: 0.15
Nodes (13): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+5 more)

### Community 16 - "profile.tsx"
Cohesion: 0.15
Nodes (15): COLD_LEVELS, COLOR_PROFILES, ColorAnalysis, ColorItem, GENDERS, LIFESTYLE, makeStyles(), Profile() (+7 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-apple-authentication, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.27
Nodes (11): buildNotif(), currentSeason(), daysSince(), describe(), Garment, getWeather(), handler(), Notif (+3 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.14
Nodes (16): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+8 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "useTheme"
Cohesion: 0.22
Nodes (12): Index(), CapsuleView(), makeStyles(), DayToNightShareCard(), makeStyles(), makeStyles(), OutfitShareCard(), Props (+4 more)

### Community 22 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 23 - "trip.ts"
Cohesion: 0.40
Nodes (5): fetchTripWeather(), geocodeDestination(), GeoResult, TripWeather, ymd()

### Community 24 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "household_members"
Cohesion: 0.20
Nodes (12): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+4 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.40
Nodes (4): Använd kunskapsgrafen först (spara tokens), CLAUDE.md — projektminne för Skrud (kladkollen), Kodstruktur & refaktorering, Övrigt värt att minnas

### Community 27 - "settings.tsx"
Cohesion: 0.14
Nodes (18): setApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+10 more)

### Community 28 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "useSettings"
Cohesion: 0.24
Nodes (12): GarmentDetail(), makeStyles(), PartnerCloset(), makeStyles(), Mode, MODES, WardrobeAnalysis(), makeStyles() (+4 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 55 - "20260804_premium.sql"
Cohesion: 0.53
Nodes (5): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit()

### Community 81 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 82 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 135 - "cacheGet"
Cohesion: 0.31
Nodes (8): Inspiration(), makeStyles(), cacheGet(), cacheSet(), store, Options, QueryResult, useQuery()

### Community 136 - "SongCard.tsx"
Cohesion: 0.36
Nodes (5): AppleMusicBadge(), makeStyles(), SongCard(), SongData, SpotifyFullLogo()

### Community 137 - "how-it-works.tsx"
Cohesion: 0.40
Nodes (5): Group, GROUPS, HowItWorks(), Item, makeStyles()

### Community 138 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

## Knowledge Gaps
- **316 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `expo-router` to `garment-detail.tsx`, `family.tsx`, `expo`, `notifications.tsx`, `goBack`, `entitlements.tsx`, `ThemeProvider.tsx`, `ArchiveView.tsx`, `login.tsx`, `home.tsx`, `stats.tsx`, `profile.tsx`, `wardrobe.tsx`, `useTheme`, `useSettings`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `expo-router`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _316 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUser` be split into smaller, more focused modules?**
  _Cohesion score 0.07487091222030981 - nodes in this community are weakly interconnected._
- **Should `garment-detail.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.061142217245240764 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09929078014184398 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._