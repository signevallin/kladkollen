# Graph Report - kladkollen  (2026-08-05)

## Corpus Check
- 174 files · ~445,482 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 956 nodes · 2268 edges · 138 communities (65 shown, 73 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c47ca5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUser
- useSettings
- family.tsx
- expo
- notifications.tsx
- useTheme
- scripts
- Skrud – Marknadsföringsplaybook
- home.tsx
- ThemeProvider.tsx
- pregnancy.ts
- @expo-google-fonts/poppins
- CreateOutfitView.tsx
- entitlements.tsx
- Theme
- stats.tsx
- SongCard.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- pregnancy-wardrobe.tsx
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- weather.ts
- Skrud Premium – aktivera köpen
- trip.ts
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- expo-audio
- expo-background-task
- SignedImage.tsx
- expo-clipboard
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
- garment-detail.tsx
- expo-calendar
- expo-constants
- WishlistTab.tsx
- affiliate.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 101 edges
2. `useSettings()` - 89 edges
3. `Theme` - 46 edges
4. `requireUser()` - 35 edges
5. `supabase` - 35 edges
6. `json()` - 33 edges
7. `goBack()` - 33 edges
8. `expo-router` - 31 edges
9. `showAlert()` - 30 edges
10. `SignedImage()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `useEntitlements()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/entitlements.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts

## Import Cycles
- None detected.

## Communities (138 total, 73 thin omitted)

### Community 0 - "requireUser"
Cohesion: 0.08
Nodes (62): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+54 more)

### Community 1 - "useSettings"
Cohesion: 0.19
Nodes (12): makeStyles(), Onboarding(), Slide, SLIDES, makeStyles(), ResetPassword(), makeStyles(), SECTIONS (+4 more)

### Community 2 - "family.tsx"
Cohesion: 0.10
Nodes (39): daysSince(), handler(), sendBatch(), today(), Family(), loadChildren(), makeStyles(), reminderLabel() (+31 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "notifications.tsx"
Cohesion: 0.07
Nodes (41): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, ONBOARDING_DONE_KEY (+33 more)

### Community 5 - "useTheme"
Cohesion: 0.19
Nodes (11): Index(), makeStyles(), Privacy(), SECTIONS, Button(), Props, styles, Variant (+3 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "home.tsx"
Cohesion: 0.15
Nodes (18): INTENSITY_LABELS, makeStyles(), monthLabel(), MyOutfits(), STYLE_TAGS, weekdayLabels(), GarmentPicker(), makeStyles() (+10 more)

### Community 9 - "ThemeProvider.tsx"
Cohesion: 0.17
Nodes (12): makeStyles(), Props, QueryState(), darkColors, darkTheme, lightColors, lightTheme, radius (+4 more)

### Community 10 - "pregnancy.ts"
Cohesion: 0.36
Nodes (6): dueInWeeks(), NOW, pregnancyPromptContext(), Trimester, trimesterFromDueDate(), trimesterLabel()

### Community 12 - "CreateOutfitView.tsx"
Cohesion: 0.29
Nodes (7): CATEGORIES, COLORS, CreateOutfitView(), makeStyles(), Props, SEASONS, STYLE_TAGS

### Community 13 - "entitlements.tsx"
Cohesion: 0.21
Nodes (18): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, useEntitlements() (+10 more)

### Community 14 - "Theme"
Cohesion: 0.33
Nodes (6): Group, GROUPS, HowItWorks(), Item, makeStyles(), Theme

### Community 15 - "stats.tsx"
Cohesion: 0.05
Nodes (46): config, handler(), SUBCATEGORY_HINT, GarmentDraft, COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles() (+38 more)

### Community 16 - "SongCard.tsx"
Cohesion: 0.36
Nodes (5): AppleMusicBadge(), makeStyles(), SongCard(), SongData, SpotifyFullLogo()

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-apple-authentication, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.27
Nodes (11): buildNotif(), currentSeason(), daysSince(), describe(), Garment, getWeather(), handler(), Notif (+3 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.13
Nodes (18): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+10 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "pregnancy-wardrobe.tsx"
Cohesion: 0.33
Nodes (6): Essential, ESSENTIALS, makeStyles(), MG, PregnancyWardrobe(), Wish

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

### Community 28 - "weather.ts"
Cohesion: 0.53
Nodes (4): buildWeatherContext(), DayForecast, summarizeDayForecast(), WeatherInput

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "trip.ts"
Cohesion: 0.40
Nodes (5): fetchTripWeather(), geocodeDestination(), GeoResult, TripWeather, ymd()

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 39 - "SignedImage.tsx"
Cohesion: 0.16
Nodes (12): makeStyles(), PartnerCloset(), makeStyles(), Member, Partner(), CapsuleView(), makeStyles(), Props (+4 more)

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
Cohesion: 0.38
Nodes (8): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), setGarmentSet(), SetMember

### Community 137 - "garment-detail.tsx"
Cohesion: 0.06
Nodes (81): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, makeStyles(), GarmentDetail(), makeStyles(), SIZES, ImportEmail() (+73 more)

### Community 141 - "WishlistTab.tsx"
Cohesion: 0.23
Nodes (10): ListFilterBar(), makeStyles(), Props, makeStyles(), Props, SaleTab(), makeStyles(), Props (+2 more)

### Community 144 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

## Knowledge Gaps
- **327 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `SignedImage.tsx` to `useSettings`, `family.tsx`, `expo`, `notifications.tsx`, `useTheme`, `GarmentSetSection.tsx`, `home.tsx`, `garment-detail.tsx`, `entitlements.tsx`, `WishlistTab.tsx`, `stats.tsx`, `wardrobe.tsx`, `pregnancy-wardrobe.tsx`, `settings.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `SignedImage.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUser` be split into smaller, more focused modules?**
  _Cohesion score 0.08037974683544304 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09929078014184398 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `notifications.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06938775510204082 - nodes in this community are weakly interconnected._