# Graph Report - kladkollen  (2026-08-16)

## Corpus Check
- 195 files · ~503,818 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1100 nodes · 2729 edges · 157 communities (79 shown, 78 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3ad12d62`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- useTheme
- family.tsx
- expo
- Theme
- app/_layout.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- SongCard.tsx
- affiliate.ts
- models.ts
- @expo-google-fonts/poppins
- alert.ts
- entitlements.tsx
- login.tsx
- smartPush.ts
- DraftCard.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- garment-detail.tsx
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- stats.tsx
- Skrud Premium – aktivera köpen
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- settings.tsx
- profiles
- wishlist
- notifications.tsx
- ArchiveView.tsx
- import-email.tsx
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- import-purchases.tsx
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
- expo-audio
- goBack
- expo-constants
- calendar.ts
- CreateOutfitView.tsx
- analyze-garment.ts
- outfits
- constants.ts
- ThemeProvider.tsx
- expo-clipboard
- onboarding.tsx
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles
- trip.ts
- SaleTab.tsx
- expo-apple-authentication
- expo-background-task

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 103 edges
2. `useSettings()` - 95 edges
3. `Theme` - 47 edges
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
- `Index()` --calls--> `useTheme()`  [EXTRACTED]
  app/index.tsx → theme/ThemeProvider.tsx
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts

## Import Cycles
- None detected.

## Communities (157 total, 78 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (67): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+59 more)

### Community 1 - "useTheme"
Cohesion: 0.06
Nodes (89): AddGarment(), ChildOutfit(), makeStyles(), GarmentDetail(), Partner(), Paywall(), Essential, ESSENTIALS (+81 more)

### Community 2 - "family.tsx"
Cohesion: 0.09
Nodes (40): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+32 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "Theme"
Cohesion: 0.16
Nodes (14): Index(), makeStyles(), Member, makeStyles(), ResetPassword(), CapsuleView(), makeStyles(), makeStyles() (+6 more)

### Community 5 - "app/_layout.tsx"
Cohesion: 0.14
Nodes (15): PUBLIC_ROUTES, RootLayout(), ConfirmHost(), ConfirmRequest, makeStyles(), makeStyles(), ToastHost(), ThemeProvider() (+7 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "SongCard.tsx"
Cohesion: 0.33
Nodes (6): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo()

### Community 9 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "alert.ts"
Cohesion: 0.17
Nodes (16): makeStyles(), confirmDialog(), ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS (+8 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.16
Nodes (23): BENEFITS, makeStyles(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, REQUIRE_FAMILY_TIER, REQUIRE_PARTNER_TIER (+15 more)

### Community 14 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 15 - "smartPush.ts"
Cohesion: 0.23
Nodes (18): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+10 more)

### Community 16 - "DraftCard.tsx"
Cohesion: 0.21
Nodes (11): GarmentDraft, DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, BrandInput(), makeStyles() (+3 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-calendar, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.16
Nodes (15): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+7 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "garment-detail.tsx"
Cohesion: 0.17
Nodes (14): FAMILY_STATUS_LABELS, FamilyStatus, makeStyles(), makeStyles(), SIZES, newImageId(), base64ToBytes(), downscaleForUpload() (+6 more)

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

### Community 27 - "stats.tsx"
Cohesion: 0.14
Nodes (14): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+6 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 37 - "settings.tsx"
Cohesion: 0.08
Nodes (36): makeStyles(), Mode, MODES, WardrobeAnalysis(), IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard() (+28 more)

### Community 40 - "notifications.tsx"
Cohesion: 0.25
Nodes (12): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, coarse(), DEFAULT_PREFS, NotifPrefs (+4 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "import-email.tsx"
Cohesion: 0.21
Nodes (14): ImportEmail(), makeStyles(), Pending, Locations(), makeStyles(), getApiLang(), getAllGarments(), invalidateGarments() (+6 more)

### Community 46 - "import-purchases.tsx"
Cohesion: 0.29
Nodes (9): ImportedItem, ImportPurchases(), makeStyles(), NO_FAVICON, storeLogoUrl(), STORES, apiPost(), removeBackground() (+1 more)

### Community 55 - "20260804_premium.sql"
Cohesion: 0.53
Nodes (5): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit()

### Community 81 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 82 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 136 - "goBack"
Cohesion: 0.23
Nodes (9): C, Privacy(), SECTIONS, styles, C, SECTIONS, styles, Terms() (+1 more)

### Community 138 - "calendar.ts"
Cohesion: 0.23
Nodes (11): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+3 more)

### Community 139 - "CreateOutfitView.tsx"
Cohesion: 0.25
Nodes (7): CATEGORIES, COLORS, makeStyles(), Props, SEASONS, STYLE_TAGS, CATEGORIES

### Community 140 - "analyze-garment.ts"
Cohesion: 0.38
Nodes (6): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), SUBCATEGORIES

### Community 143 - "constants.ts"
Cohesion: 0.38
Nodes (6): COLOR_GROUPS, isWashable(), MUSIC_GENRES, NO_LAUNDRY_CATEGORIES, STYLE_RULES, WASHABLE_SUBCATEGORIES

### Community 144 - "ThemeProvider.tsx"
Cohesion: 0.05
Nodes (44): Group, GROUPS, HowItWorks(), Item, makeStyles(), AddGarmentChooser(), makeStyles(), addOptions (+36 more)

### Community 146 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

### Community 153 - "trip.ts"
Cohesion: 0.40
Nodes (5): fetchTripWeather(), geocodeDestination(), GeoResult, TripWeather, ymd()

### Community 154 - "SaleTab.tsx"
Cohesion: 0.67
Nodes (3): makeStyles(), Props, SaleTab()

## Knowledge Gaps
- **366 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+361 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `Theme` to `useTheme`, `family.tsx`, `expo`, `app/_layout.tsx`, `goBack`, `ArchiveView.tsx`, `import-email.tsx`, `alert.ts`, `entitlements.tsx`, `import-purchases.tsx`, `login.tsx`, `DraftCard.tsx`, `ThemeProvider.tsx`, `onboarding.tsx`, `wardrobe.tsx`, `garment-detail.tsx`, `SaleTab.tsx`, `stats.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `Theme`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _366 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07359781121751026 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.059202059202059204 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09438775510204081 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._