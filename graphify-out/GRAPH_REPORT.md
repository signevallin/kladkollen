# Graph Report - kladkollen  (2026-08-04)

## Corpus Check
- 156 files · ~421,513 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 865 nodes · 1922 edges · 132 communities (61 shown, 71 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `515da6d1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUser
- garment-detail.tsx
- family.tsx
- expo
- notifications.tsx
- settings.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- entitlements.tsx
- inspiration.tsx
- goBack
- my-outfit.tsx
- wardrobe.tsx
- profile.tsx
- home.tsx
- stats.tsx
- cacheGet
- dependencies
- send-notifications.ts
- weather.ts
- 1. App Privacy ("nutrition label")
- useTheme
- include
- ThemeProvider.tsx
- manifest.json
- household_members
- useSettings
- expo-router
- SongCard.tsx
- Skrud Premium – aktivera köpen
- how-it-works.tsx
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
- expo-apple-authentication
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

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 75 edges
2. `useSettings()` - 55 edges
3. `requireUser()` - 35 edges
4. `json()` - 33 edges
5. `Theme` - 33 edges
6. `goBack()` - 33 edges
7. `supabase` - 29 edges
8. `clip()` - 24 edges
9. `expo-router` - 24 edges
10. `showAlert()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Index()` --calls--> `useTheme()`  [EXTRACTED]
  app/index.tsx → theme/ThemeProvider.tsx
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts

## Import Cycles
- None detected.

## Communities (132 total, 71 thin omitted)

### Community 0 - "requireUser"
Cohesion: 0.08
Nodes (61): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+53 more)

### Community 1 - "garment-detail.tsx"
Cohesion: 0.07
Nodes (51): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), SIZES, GarmentDetail(), makeStyles() (+43 more)

### Community 2 - "family.tsx"
Cohesion: 0.10
Nodes (39): daysSince(), handler(), sendBatch(), today(), Family(), loadChildren(), makeStyles(), reminderLabel() (+31 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "notifications.tsx"
Cohesion: 0.07
Nodes (40): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, makeStyles() (+32 more)

### Community 5 - "settings.tsx"
Cohesion: 0.08
Nodes (27): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+19 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "entitlements.tsx"
Cohesion: 0.21
Nodes (18): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, useEntitlements() (+10 more)

### Community 9 - "inspiration.tsx"
Cohesion: 0.20
Nodes (13): makeStyles(), Member, Partner(), DayToNightShareCard(), makeStyles(), makeStyles(), OutfitShareCard(), Props (+5 more)

### Community 10 - "goBack"
Cohesion: 0.19
Nodes (14): makeStyles(), PartnerCloset(), makeStyles(), Privacy(), SECTIONS, makeStyles(), SECTIONS, Terms() (+6 more)

### Community 11 - "my-outfit.tsx"
Cohesion: 0.17
Nodes (15): CATEGORIES, COLORS, makeStyles(), monthLabel(), MyOutfits(), SEASONS, STYLE_TAGS, weekdayLabels() (+7 more)

### Community 12 - "wardrobe.tsx"
Cohesion: 0.15
Nodes (15): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+7 more)

### Community 13 - "profile.tsx"
Cohesion: 0.16
Nodes (15): COLD_LEVELS, COLOR_PROFILES, ColorAnalysis, ColorItem, GENDERS, LIFESTYLE, makeStyles(), Profile() (+7 more)

### Community 14 - "home.tsx"
Cohesion: 0.26
Nodes (11): config, handler(), SUBCATEGORY_HINT, INTENSITY_LABELS, CATEGORIES, COLOR_HEX, COLOR_NAMES, OUTFIT_CONTEXTS (+3 more)

### Community 15 - "stats.tsx"
Cohesion: 0.15
Nodes (12): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+4 more)

### Community 16 - "cacheGet"
Cohesion: 0.21
Nodes (11): Home(), makeStyles(), DTN_TRANSITIONS, Inspiration(), makeStyles(), cacheClear(), cacheGet(), cacheSet() (+3 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-crypto, @expo/metro-runtime, expo-sharing, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.27
Nodes (11): buildNotif(), currentSeason(), daysSince(), describe(), Garment, getWeather(), handler(), Notif (+3 more)

### Community 19 - "weather.ts"
Cohesion: 0.53
Nodes (4): buildWeatherContext(), DayForecast, summarizeDayForecast(), WeatherInput

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "useTheme"
Cohesion: 0.31
Nodes (7): makeStyles(), ResetPassword(), Button(), Props, styles, Variant, useTheme()

### Community 22 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 23 - "ThemeProvider.tsx"
Cohesion: 0.19
Nodes (11): CapsuleView(), makeStyles(), darkColors, darkTheme, lightColors, lightTheme, radius, ThemeColors (+3 more)

### Community 24 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "household_members"
Cohesion: 0.20
Nodes (12): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+4 more)

### Community 26 - "useSettings"
Cohesion: 0.30
Nodes (9): Locations(), makeStyles(), CropModal(), makeStyles(), makeStyles(), Props, QueryState(), useSettings() (+1 more)

### Community 27 - "expo-router"
Cohesion: 0.25
Nodes (7): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs, expo-router

### Community 28 - "SongCard.tsx"
Cohesion: 0.36
Nodes (5): AppleMusicBadge(), makeStyles(), SongCard(), SongData, SpotifyFullLogo()

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "how-it-works.tsx"
Cohesion: 0.40
Nodes (5): Group, GROUPS, HowItWorks(), Item, makeStyles()

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

## Knowledge Gaps
- **296 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+291 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `expo-router` to `garment-detail.tsx`, `family.tsx`, `expo`, `notifications.tsx`, `settings.tsx`, `entitlements.tsx`, `inspiration.tsx`, `goBack`, `my-outfit.tsx`, `wardrobe.tsx`, `profile.tsx`, `home.tsx`, `stats.tsx`, `useTheme`, `ThemeProvider.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `expo-router`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _296 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUser` be split into smaller, more focused modules?**
  _Cohesion score 0.08179162609542356 - nodes in this community are weakly interconnected._
- **Should `garment-detail.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07082494969818913 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09929078014184398 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._