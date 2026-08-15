# Graph Report - kladkollen  (2026-08-15)

## Corpus Check
- 189 files · ~468,571 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1073 nodes · 2584 edges · 146 communities (71 shown, 75 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2ef4e1e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- goBack
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
- child-outfit.tsx
- entitlements.tsx
- BottomNav.tsx
- stats.tsx
- expo-apple-authentication
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- garment-detail.tsx
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
- SignedImage.tsx
- expo-clipboard
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
- home.tsx
- calendar.ts
- useSettings
- login.tsx
- expo-constants
- wardrobe-analysis.tsx
- affiliate.ts
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
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `cacheGet()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/cache.ts

## Import Cycles
- None detected.

## Communities (146 total, 75 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (67): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+59 more)

### Community 1 - "goBack"
Cohesion: 0.13
Nodes (19): Group, GROUPS, HowItWorks(), Item, makeStyles(), ImportEmail(), makeStyles(), Locations() (+11 more)

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
Cohesion: 0.20
Nodes (11): Index(), Button(), Props, styles, Variant, ConfirmHost(), ConfirmRequest, makeStyles() (+3 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "my-outfit.tsx"
Cohesion: 0.08
Nodes (39): COLD_LEVELS, makeStyles(), Profile(), THEME_OPTIONS, Inspiration(), makeStyles(), makeStyles(), monthLabel() (+31 more)

### Community 9 - "ThemeProvider.tsx"
Cohesion: 0.14
Nodes (15): makeStyles(), Props, SwapSheet(), makeStyles(), Props, QueryState(), darkColors, darkTheme (+7 more)

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "child-outfit.tsx"
Cohesion: 0.28
Nodes (4): ageMonths(), ChildOutfit(), isBabyChild(), makeStyles()

### Community 13 - "entitlements.tsx"
Cohesion: 0.17
Nodes (21): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), useEntitlements(), configurePurchases() (+13 more)

### Community 14 - "BottomNav.tsx"
Cohesion: 0.36
Nodes (6): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs

### Community 15 - "stats.tsx"
Cohesion: 0.12
Nodes (18): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+10 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-calendar, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.14
Nodes (17): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+9 more)

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
Cohesion: 0.17
Nodes (13): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+5 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.22
Nodes (8): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Kodstruktur & refaktorering, Reseplan (trips), Övrigt värt att minnas

### Community 27 - "settings.tsx"
Cohesion: 0.14
Nodes (18): setApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+10 more)

### Community 28 - "garment-detail.tsx"
Cohesion: 0.06
Nodes (71): FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, SIZES, Pending, ImportedItem, STORES, Essential (+63 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "app/_layout.tsx"
Cohesion: 0.21
Nodes (11): PUBLIC_ROUTES, RootLayout(), makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES, ThemeProvider() (+3 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 39 - "smartPush.ts"
Cohesion: 0.23
Nodes (18): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+10 more)

### Community 40 - "SignedImage.tsx"
Cohesion: 0.25
Nodes (7): Props, RESIZE_TO_FIT, ResizeMode, makeStyles(), Props, SaleTab(), ImageTransform

### Community 42 - "ArchiveView.tsx"
Cohesion: 0.07
Nodes (36): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), GarmentPicker(), makeStyles(), Props (+28 more)

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
Cohesion: 0.08
Nodes (36): Home(), INTENSITY_LABELS, makeStyles(), AppleMusicBadge(), GarmentSetSection(), makeStyles(), Props, IMG_TRANSFORM (+28 more)

### Community 136 - "calendar.ts"
Cohesion: 0.23
Nodes (11): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+3 more)

### Community 137 - "useSettings"
Cohesion: 0.15
Nodes (14): AddGarment(), makeStyles(), ImportPurchases(), makeStyles(), storeLogoUrl(), makeStyles(), PregnancyWardrobe(), makeStyles() (+6 more)

### Community 138 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 143 - "wardrobe-analysis.tsx"
Cohesion: 0.23
Nodes (10): GarmentDetail(), makeStyles(), makeStyles(), Mode, MODES, WardrobeAnalysis(), makeStyles(), Props (+2 more)

### Community 144 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

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

- **Why does `expo-router` connect `garment-detail.tsx` to `goBack`, `family.tsx`, `expo`, `home.tsx`, `my-outfit.tsx`, `SignedImage.tsx`, `login.tsx`, `ArchiveView.tsx`, `child-outfit.tsx`, `entitlements.tsx`, `BottomNav.tsx`, `stats.tsx`, `wardrobe.tsx`, `app/_layout.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `garment-detail.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _359 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07359781121751026 - nodes in this community are weakly interconnected._
- **Should `goBack` be split into smaller, more focused modules?**
  _Cohesion score 0.12681159420289856 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09224489795918367 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._