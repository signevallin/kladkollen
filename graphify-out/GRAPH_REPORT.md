# Graph Report - kladkollen  (2026-08-15)

## Corpus Check
- 189 files · ~468,281 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1071 nodes · 2581 edges · 153 communities (78 shown, 75 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1f995c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- useSettings
- family.tsx
- expo
- notifications.tsx
- useTheme
- scripts
- Skrud – Marknadsföringsplaybook
- my-outfit.tsx
- ThemeProvider.tsx
- models.ts
- @expo-google-fonts/poppins
- CreateOutfitView.tsx
- entitlements.tsx
- profile.tsx
- stats.tsx
- add-garment.tsx
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
- alert.ts
- Skrud Premium – aktivera köpen
- app/_layout.tsx
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- expo-audio
- expo-background-task
- smartPush.ts
- garment-detail.tsx
- expo-clipboard
- ArchiveView.tsx
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- locations.tsx
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
- home.tsx
- calendar.ts
- import-purchases.tsx
- login.tsx
- expo-calendar
- expo-constants
- OutfitShareCard.tsx
- BrandInput.tsx
- SaleAddModal.tsx
- affiliate.ts
- onboarding.tsx
- Toast.tsx
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 105 edges
2. `useSettings()` - 97 edges
3. `Theme` - 48 edges
4. `supabase` - 38 edges
5. `json()` - 37 edges
6. `requireUser()` - 35 edges
7. `showAlert()` - 34 edges
8. `goBack()` - 33 edges
9. `expo-router` - 32 edges
10. `SignedImage()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Index()` --calls--> `useTheme()`  [EXTRACTED]
  app/index.tsx → theme/ThemeProvider.tsx
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (153 total, 75 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (73): config, config, handler(), handler(), buildPrompt(), config, handler(), SUBCATEGORY_HINT (+65 more)

### Community 1 - "useSettings"
Cohesion: 0.15
Nodes (17): Group, GROUPS, HowItWorks(), Item, makeStyles(), makeStyles(), Privacy(), SECTIONS (+9 more)

### Community 2 - "family.tsx"
Cohesion: 0.09
Nodes (41): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+33 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "notifications.tsx"
Cohesion: 0.20
Nodes (14): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, styles, Toggle(), coarse() (+6 more)

### Community 5 - "useTheme"
Cohesion: 0.14
Nodes (19): Button(), Props, styles, Variant, CapsuleView(), makeStyles(), DayToNightShareCard(), makeStyles() (+11 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "my-outfit.tsx"
Cohesion: 0.19
Nodes (21): Index(), Home(), Inspiration(), makeStyles(), makeStyles(), monthLabel(), MyOutfits(), STYLE_TAGS (+13 more)

### Community 9 - "ThemeProvider.tsx"
Cohesion: 0.16
Nodes (13): makeStyles(), Member, Partner(), darkColors, darkTheme, lightColors, lightTheme, radius (+5 more)

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "CreateOutfitView.tsx"
Cohesion: 0.18
Nodes (11): GarmentPicker(), makeStyles(), Props, CATEGORIES, COLORS, CreateOutfitView(), makeStyles(), Props (+3 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.16
Nodes (22): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, useEntitlements() (+14 more)

### Community 14 - "profile.tsx"
Cohesion: 0.14
Nodes (18): COLD_LEVELS, COLOR_PROFILES, GENDERS, LIFESTYLE, makeStyles(), Profile(), STIL_PROFIL, STYLES (+10 more)

### Community 15 - "stats.tsx"
Cohesion: 0.11
Nodes (19): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+11 more)

### Community 16 - "add-garment.tsx"
Cohesion: 0.15
Nodes (15): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), DraftCard(), FAMILY_STATUS_LABELS, makeStyles() (+7 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-apple-authentication, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.10
Nodes (23): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+15 more)

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
Cohesion: 0.17
Nodes (13): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+5 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.22
Nodes (8): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Kodstruktur & refaktorering, Reseplan (trips), Övrigt värt att minnas

### Community 27 - "settings.tsx"
Cohesion: 0.14
Nodes (18): setApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+10 more)

### Community 28 - "alert.ts"
Cohesion: 0.17
Nodes (15): ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS, toast(), makeStyles() (+7 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "app/_layout.tsx"
Cohesion: 0.13
Nodes (17): PUBLIC_ROUTES, RootLayout(), confirmDialog(), ConfirmHost(), ConfirmRequest, makeStyles(), ThemeProvider(), useThemeControl() (+9 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 39 - "smartPush.ts"
Cohesion: 0.23
Nodes (18): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+10 more)

### Community 40 - "garment-detail.tsx"
Cohesion: 0.24
Nodes (9): makeStyles(), SIZES, EU_CHILD_SIZES, newImageId(), ImageTransform, imageUrl(), resolveImageUrl(), storagePathFrom() (+1 more)

### Community 42 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 46 - "locations.tsx"
Cohesion: 0.26
Nodes (9): Locations(), makeStyles(), makeStyles(), Props, QueryState(), captureError(), Options, QueryResult (+1 more)

### Community 55 - "20260804_premium.sql"
Cohesion: 0.53
Nodes (5): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit()

### Community 81 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 82 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 135 - "home.tsx"
Cohesion: 0.07
Nodes (33): ChildOutfit(), makeStyles(), INTENSITY_LABELS, makeStyles(), AppleMusicBadge(), GarmentSetSection(), makeStyles(), Props (+25 more)

### Community 136 - "calendar.ts"
Cohesion: 0.23
Nodes (11): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+3 more)

### Community 137 - "import-purchases.tsx"
Cohesion: 0.16
Nodes (20): ImportEmail(), makeStyles(), Pending, ImportedItem, ImportPurchases(), makeStyles(), storeLogoUrl(), STORES (+12 more)

### Community 138 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 141 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 142 - "BrandInput.tsx"
Cohesion: 0.39
Nodes (5): BrandInput(), makeStyles(), brandSuggestions(), COMMON_BRANDS, parsePrice()

### Community 143 - "SaleAddModal.tsx"
Cohesion: 0.47
Nodes (5): GarmentDetail(), makeStyles(), Props, SaleAddModal(), localeFor()

### Community 144 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 145 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

### Community 146 - "Toast.tsx"
Cohesion: 0.50
Nodes (4): makeStyles(), ToastData, ToastHost(), ToastVariant

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

## Knowledge Gaps
- **359 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+354 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `wardrobe.tsx` to `useSettings`, `family.tsx`, `expo`, `useTheme`, `home.tsx`, `my-outfit.tsx`, `import-purchases.tsx`, `login.tsx`, `ThemeProvider.tsx`, `entitlements.tsx`, `profile.tsx`, `stats.tsx`, `add-garment.tsx`, `onboarding.tsx`, `pregnancy-wardrobe.tsx`, `alert.ts`, `app/_layout.tsx`, `garment-detail.tsx`, `ArchiveView.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `wardrobe.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _359 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.06615240766713418 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09142857142857143 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._