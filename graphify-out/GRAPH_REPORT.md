# Graph Report - kladkollen  (2026-08-05)

## Corpus Check
- 172 files · ~436,801 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 943 nodes · 2225 edges · 145 communities (72 shown, 73 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c0e1adb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUser
- WishlistAddModals.tsx
- family.tsx
- expo
- notifications.tsx
- goBack
- scripts
- Skrud – Marknadsföringsplaybook
- entitlements.tsx
- ThemeProvider.tsx
- ColorAnalysis.tsx
- useSettings
- CreateOutfitView.tsx
- ArchiveView.tsx
- profile.tsx
- stats.tsx
- SongCard.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- supabase.ts
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- DraftCard.tsx
- Skrud Premium – aktivera köpen
- add-garment.tsx
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- expo-audio
- expo-background-task
- expo-calendar
- useTheme
- expo-clipboard
- expo-constants
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- expo-apple-authentication
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
- alert.ts
- trip.ts
- import-purchases.tsx
- SignedImage.tsx
- garment-detail.tsx
- home.tsx
- GarmentSetSection.tsx
- weather.ts
- SaleAddModal.tsx
- affiliate.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 99 edges
2. `useSettings()` - 81 edges
3. `Theme` - 45 edges
4. `requireUser()` - 35 edges
5. `supabase` - 35 edges
6. `goBack()` - 35 edges
7. `json()` - 33 edges
8. `expo-router` - 31 edges
9. `showAlert()` - 30 edges
10. `SignedImage()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Index()` --calls--> `useTheme()`  [EXTRACTED]
  app/index.tsx → theme/ThemeProvider.tsx
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (145 total, 73 thin omitted)

### Community 0 - "requireUser"
Cohesion: 0.08
Nodes (61): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+53 more)

### Community 1 - "WishlistAddModals.tsx"
Cohesion: 0.21
Nodes (13): config, handler(), SUBCATEGORY_HINT, makeStyles(), Props, makeStyles(), Props, CATEGORIES (+5 more)

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
Cohesion: 0.20
Nodes (12): makeStyles(), Privacy(), SECTIONS, makeStyles(), SECTIONS, Terms(), makeStyles(), Mode (+4 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "entitlements.tsx"
Cohesion: 0.21
Nodes (18): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, useEntitlements() (+10 more)

### Community 9 - "ThemeProvider.tsx"
Cohesion: 0.17
Nodes (12): makeStyles(), Props, WishlistTab(), darkColors, darkTheme, lightColors, lightTheme, radius (+4 more)

### Community 10 - "ColorAnalysis.tsx"
Cohesion: 0.24
Nodes (9): ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS, askSource(), CANCELED (+1 more)

### Community 11 - "useSettings"
Cohesion: 0.17
Nodes (15): Group, GROUPS, HowItWorks(), Item, makeStyles(), makeStyles(), ResetPassword(), CropModal() (+7 more)

### Community 12 - "CreateOutfitView.tsx"
Cohesion: 0.29
Nodes (6): CATEGORIES, COLORS, makeStyles(), Props, SEASONS, STYLE_TAGS

### Community 13 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 14 - "profile.tsx"
Cohesion: 0.14
Nodes (18): COLD_LEVELS, COLOR_PROFILES, GENDERS, LIFESTYLE, makeStyles(), Profile(), STIL_PROFIL, STYLES (+10 more)

### Community 15 - "stats.tsx"
Cohesion: 0.15
Nodes (12): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+4 more)

### Community 16 - "SongCard.tsx"
Cohesion: 0.36
Nodes (5): AppleMusicBadge(), makeStyles(), SongCard(), SongData, SpotifyFullLogo()

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-crypto, @expo-google-fonts/poppins, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.27
Nodes (11): buildNotif(), currentSeason(), daysSince(), describe(), Garment, getWeather(), handler(), Notif (+3 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.14
Nodes (17): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), NO_LAUNDRY_CATEGORIES, NO_LAUNDRY_SUBCATEGORIES, SEASONS, SORT_LABEL (+9 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "supabase.ts"
Cohesion: 0.17
Nodes (15): ImportEmail(), makeStyles(), Pending, Index(), Locations(), makeStyles(), supabase, apiPost() (+7 more)

### Community 22 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

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
Cohesion: 0.08
Nodes (27): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+19 more)

### Community 28 - "DraftCard.tsx"
Cohesion: 0.33
Nodes (6): DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, FITS

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "add-garment.tsx"
Cohesion: 0.16
Nodes (13): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), makeStyles(), toast(), ToastData (+5 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 40 - "useTheme"
Cohesion: 0.17
Nodes (17): makeStyles(), monthLabel(), MyOutfits(), STYLE_TAGS, weekdayLabels(), Button(), Props, styles (+9 more)

### Community 55 - "20260804_premium.sql"
Cohesion: 0.53
Nodes (5): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit()

### Community 81 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 82 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 135 - "alert.ts"
Cohesion: 0.17
Nodes (13): makeStyles(), Member, Partner(), Essential, ESSENTIALS, makeStyles(), MG, PregnancyWardrobe() (+5 more)

### Community 136 - "trip.ts"
Cohesion: 0.40
Nodes (5): fetchTripWeather(), geocodeDestination(), GeoResult, TripWeather, ymd()

### Community 137 - "import-purchases.tsx"
Cohesion: 0.23
Nodes (11): ImportedItem, ImportPurchases(), makeStyles(), storeLogoUrl(), STORES, newImageId(), ImageTransform, imageUrl() (+3 more)

### Community 138 - "SignedImage.tsx"
Cohesion: 0.19
Nodes (11): makeStyles(), PartnerCloset(), DayToNightShareCard(), makeStyles(), Props, RESIZE_TO_FIT, ResizeMode, SignedImage() (+3 more)

### Community 139 - "garment-detail.tsx"
Cohesion: 0.24
Nodes (9): makeStyles(), SIZES, BrandInput(), makeStyles(), brandSuggestions(), COMMON_BRANDS, normalizeBrand(), parsePrice() (+1 more)

### Community 140 - "home.tsx"
Cohesion: 0.33
Nodes (10): GarmentDetail(), Home(), INTENSITY_LABELS, makeStyles(), Inspiration(), makeStyles(), cacheGet(), cacheSet() (+2 more)

### Community 141 - "GarmentSetSection.tsx"
Cohesion: 0.35
Nodes (9): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), GarmentSet, setGarmentSet() (+1 more)

### Community 142 - "weather.ts"
Cohesion: 0.53
Nodes (4): buildWeatherContext(), DayForecast, summarizeDayForecast(), WeatherInput

### Community 143 - "SaleAddModal.tsx"
Cohesion: 0.60
Nodes (4): makeStyles(), Props, SaleAddModal(), localeFor()

### Community 144 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

## Knowledge Gaps
- **323 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+318 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `wardrobe.tsx` to `WishlistAddModals.tsx`, `family.tsx`, `expo`, `notifications.tsx`, `goBack`, `alert.ts`, `entitlements.tsx`, `import-purchases.tsx`, `SignedImage.tsx`, `garment-detail.tsx`, `useSettings`, `home.tsx`, `profile.tsx`, `stats.tsx`, `GarmentSetSection.tsx`, `ArchiveView.tsx`, `ThemeProvider.tsx`, `supabase.ts`, `settings.tsx`, `DraftCard.tsx`, `add-garment.tsx`, `useTheme`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `wardrobe.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `WishlistAddModals.tsx`, `family.tsx`, `notifications.tsx`, `goBack`, `alert.ts`, `entitlements.tsx`, `import-purchases.tsx`, `SignedImage.tsx`, `useSettings`, `garment-detail.tsx`, `home.tsx`, `profile.tsx`, `stats.tsx`, `GarmentSetSection.tsx`, `CreateOutfitView.tsx`, `ColorAnalysis.tsx`, `wardrobe.tsx`, `SongCard.tsx`, `supabase.ts`, `ArchiveView.tsx`, `SaleAddModal.tsx`, `DraftCard.tsx`, `add-garment.tsx`, `ThemeProvider.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _323 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUser` be split into smaller, more focused modules?**
  _Cohesion score 0.08179162609542356 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09929078014184398 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._