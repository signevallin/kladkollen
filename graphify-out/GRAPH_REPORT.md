# Graph Report - kladkollen  (2026-08-15)

## Corpus Check
- 190 files · ~470,802 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1079 nodes · 2651 edges · 157 communities (82 shown, 75 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e98babb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- Theme
- family.tsx
- expo
- notifications.tsx
- useTheme
- scripts
- Skrud – Marknadsföringsplaybook
- my-outfit.tsx
- locations.tsx
- models.ts
- @expo-google-fonts/poppins
- profile.tsx
- entitlements.tsx
- GarmentPicker.tsx
- stats.tsx
- constants.ts
- dependencies
- send-notifications.ts
- ThemeProvider.tsx
- 1. App Privacy ("nutrition label")
- GarmentSetSection.tsx
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- i18n.ts
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
- OutfitShareCard.tsx
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
- settings.tsx
- login.tsx
- SongCard.tsx
- expo-constants
- InsightsTab.tsx
- pregnancy-wardrobe.tsx
- wardrobe-analysis.tsx
- affiliate.ts
- CreateOutfitView.tsx
- ColorAnalysis.tsx
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles
- trip.ts
- Button.tsx
- expo-calendar

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 107 edges
2. `useSettings()` - 99 edges
3. `Theme` - 49 edges
4. `supabase` - 39 edges
5. `json()` - 37 edges
6. `requireUser()` - 35 edges
7. `showAlert()` - 35 edges
8. `goBack()` - 35 edges
9. `expo-router` - 33 edges
10. `SignedImage()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `useEntitlements()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/entitlements.tsx

## Import Cycles
- None detected.

## Communities (157 total, 75 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (67): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+59 more)

### Community 1 - "Theme"
Cohesion: 0.17
Nodes (16): Group, GROUPS, HowItWorks(), Item, makeStyles(), makeStyles(), Member, Partner() (+8 more)

### Community 2 - "family.tsx"
Cohesion: 0.09
Nodes (43): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+35 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "notifications.tsx"
Cohesion: 0.18
Nodes (15): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, styles, Toggle(), coarse() (+7 more)

### Community 5 - "useTheme"
Cohesion: 0.14
Nodes (22): AddGarment(), makeStyles(), ImportEmail(), makeStyles(), Index(), BENEFITS, makeStyles(), Paywall() (+14 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "my-outfit.tsx"
Cohesion: 0.15
Nodes (24): Home(), Inspiration(), makeStyles(), makeStyles(), monthLabel(), MyOutfits(), STYLE_TAGS, weekdayLabels() (+16 more)

### Community 9 - "locations.tsx"
Cohesion: 0.23
Nodes (10): ImportPurchases(), makeStyles(), storeLogoUrl(), Locations(), makeStyles(), makeStyles(), Props, QueryState() (+2 more)

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "profile.tsx"
Cohesion: 0.15
Nodes (17): COLD_LEVELS, COLOR_PROFILES, GENDERS, LIFESTYLE, makeStyles(), Profile(), STIL_PROFIL, STYLES (+9 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.22
Nodes (18): Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, configurePurchases(), getCustomerInfo(), getPackages(), identifyPurchases() (+10 more)

### Community 14 - "GarmentPicker.tsx"
Cohesion: 0.20
Nodes (12): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), GarmentPicker(), makeStyles(), Props (+4 more)

### Community 15 - "stats.tsx"
Cohesion: 0.14
Nodes (14): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+6 more)

### Community 16 - "constants.ts"
Cohesion: 0.20
Nodes (12): GarmentDraft, DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, COLOR_GROUPS, COLOR_OPTIONS (+4 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-apple-authentication, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "ThemeProvider.tsx"
Cohesion: 0.09
Nodes (29): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+21 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "GarmentSetSection.tsx"
Cohesion: 0.35
Nodes (9): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), GarmentSet, setGarmentSet() (+1 more)

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

### Community 27 - "i18n.ts"
Cohesion: 0.14
Nodes (17): getApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+9 more)

### Community 28 - "garment-detail.tsx"
Cohesion: 0.14
Nodes (27): FAMILY_STATUS_LABELS, FamilyStatus, SIZES, Pending, ImportedItem, STORES, confirmDialog(), makeStyles() (+19 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "app/_layout.tsx"
Cohesion: 0.18
Nodes (13): PUBLIC_ROUTES, RootLayout(), makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES, ThemeProvider() (+5 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 39 - "smartPush.ts"
Cohesion: 0.26
Nodes (16): cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), isLogReminderEnabled(), isSmartPushEnabled(), markOutfitLoggedToday() (+8 more)

### Community 40 - "SignedImage.tsx"
Cohesion: 0.19
Nodes (10): makeStyles(), Props, SwapSheet(), Props, RESIZE_TO_FIT, ResizeMode, SignedImage(), ImageTransform (+2 more)

### Community 42 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 46 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

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
Cohesion: 0.14
Nodes (25): ChildOutfit(), makeStyles(), FamilyToday(), makeStyles(), Member, seasonalOrFull(), INTENSITY_LABELS, makeStyles() (+17 more)

### Community 136 - "calendar.ts"
Cohesion: 0.21
Nodes (11): DATE_WORDS, DayPlan, ensureCalendarPermission(), EVENING, eventsForDay(), fill(), has(), planForDay() (+3 more)

### Community 137 - "settings.tsx"
Cohesion: 0.19
Nodes (12): makeStyles(), ResetPassword(), CapsuleView(), makeStyles(), expo-router, supabase, setApiLang(), Ctx (+4 more)

### Community 138 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 139 - "SongCard.tsx"
Cohesion: 0.33
Nodes (6): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo()

### Community 141 - "InsightsTab.tsx"
Cohesion: 0.33
Nodes (7): InsightsTab(), makeStyles(), Props, BuildArgs, buildInsights(), Insight, seasonOf()

### Community 142 - "pregnancy-wardrobe.tsx"
Cohesion: 0.29
Nodes (7): Essential, ESSENTIALS, makeStyles(), MG, PregnancyWardrobe(), Wish, invalidateGarments()

### Community 143 - "wardrobe-analysis.tsx"
Cohesion: 0.23
Nodes (10): GarmentDetail(), makeStyles(), makeStyles(), Mode, MODES, WardrobeAnalysis(), makeStyles(), Props (+2 more)

### Community 144 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 145 - "CreateOutfitView.tsx"
Cohesion: 0.29
Nodes (7): CATEGORIES, COLORS, CreateOutfitView(), makeStyles(), Props, SEASONS, STYLE_TAGS

### Community 146 - "ColorAnalysis.tsx"
Cohesion: 0.33
Nodes (6): ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

### Community 153 - "trip.ts"
Cohesion: 0.40
Nodes (5): fetchTripWeather(), geocodeDestination(), GeoResult, TripWeather, ymd()

### Community 154 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

## Knowledge Gaps
- **360 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `settings.tsx` to `Theme`, `family.tsx`, `expo`, `useTheme`, `home.tsx`, `my-outfit.tsx`, `login.tsx`, `ArchiveView.tsx`, `profile.tsx`, `pregnancy-wardrobe.tsx`, `stats.tsx`, `constants.ts`, `ThemeProvider.tsx`, `GarmentSetSection.tsx`, `(tabs)/_layout.tsx`, `garment-detail.tsx`, `app/_layout.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `settings.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07359781121751026 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08563134978229318 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.13756613756613756 - nodes in this community are weakly interconnected._