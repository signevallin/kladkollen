# Graph Report - kladkollen  (2026-10-24)

## Corpus Check
- 247 files · ~650,716 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1249 nodes · 3331 edges · 103 communities (54 shown, 49 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c877735`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUser
- my-outfit.tsx
- family.tsx
- expo
- dashboard.ts
- settings.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- home.tsx
- inspiration.tsx
- models.ts
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- CreateOutfitView.tsx
- smartPush.ts
- notifications.tsx
- dependencies
- send-notifications.ts
- profile.tsx
- 1. App Privacy ("nutrition label")
- calendar.ts
- include
- expo-camera
- manifest.json
- SignedImage.tsx
- CLAUDE.md — projektminne för Skrud (kladkollen)
- generate-basics.ts
- detect-garments.ts
- Skrud Premium – aktivera köpen
- evaluate-purchase.ts
- Klädkollen 🍒
- trip.ts
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- cleanup-orphan-images.mjs
- restore-test.sh
- optimize-storage-images.py
- BottomNav.tsx
- ArchiveView.tsx
- ThemeProvider.tsx
- Backup av Skrud
- expo-font
- @expo-google-fonts/lora
- WishlistAddModals.tsx
- expo-haptics
- expo-image
- quick-start.tsx
- backup-db.sh
- cache.ts
- affiliate.ts
- expo-notifications
- expo-router
- expo-background-task
- expo-splash-screen
- expo-status-bar
- expo-system-ui
- expo-task-manager
- @expo/vector-icons
- react
- app/_layout.tsx
- react-native
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-purchases
- react-native-reanimated
- wardrobe.tsx
- react-native-screens
- react-native-svg
- react-native-view-shot
- expo-audio
- react-native-webview
- react-native-worklets
- mirror-storage.mjs
- @react-navigation/elements
- expo-apple-authentication
- @sentry/react-native
- @supabase/supabase-js
- expo-image-manipulator
- expo-crypto
- @expo/metro-runtime
- Basplaggs-bilder (Snabbstart)
- expo-image-picker
- @react-native-google-signin/google-signin
- expo-sharing
- @react-navigation/bottom-tabs
- expo-constants
- expo-linking
- expo-clipboard
- screens/README.md
- reset-password.html — "Reset Password"
- stats.tsx
- react-dom
- react-native-safe-area-context
- react-native-web
- @react-navigation/native
- onboarding.tsx
- goBack
- constants.ts
- useTheme

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 111 edges
2. `useSettings()` - 101 edges
3. `Theme` - 50 edges
4. `requireUser()` - 43 edges
5. `supabase` - 43 edges
6. `json()` - 41 edges
7. `showAlert()` - 38 edges
8. `goBack()` - 35 edges
9. `expo-router` - 34 edges
10. `SignedImage()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts
- `Home()` --calls--> `useSettings()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/settings.tsx

## Import Cycles
- None detected.

## Communities (103 total, 49 thin omitted)

### Community 0 - "requireUser"
Cohesion: 0.06
Nodes (80): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+72 more)

### Community 1 - "my-outfit.tsx"
Cohesion: 0.17
Nodes (30): AddGarment(), makeStyles(), GarmentDetail(), makeStyles(), PregnancyWardrobe(), makeStyles(), Profile(), THEME_OPTIONS (+22 more)

### Community 2 - "family.tsx"
Cohesion: 0.06
Nodes (64): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+56 more)

### Community 3 - "expo"
Cohesion: 0.04
Nodes (48): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+40 more)

### Community 4 - "dashboard.ts"
Cohesion: 0.16
Nodes (24): aiCosts(), anthropicCost(), Card, cardHtml(), config, esc(), get(), handler() (+16 more)

### Community 5 - "settings.tsx"
Cohesion: 0.06
Nodes (39): COL_LEFT, COL_RIGHT, DARK, LIGHT, Login(), makeStyles(), Method, Palette (+31 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "home.tsx"
Cohesion: 0.06
Nodes (54): makeStyles(), INTENSITY_LABELS, makeStyles(), AppleMusicBadge(), makeStyles(), Member, NO_WEATHER, seasonalOrFull() (+46 more)

### Community 9 - "inspiration.tsx"
Cohesion: 0.17
Nodes (17): Member, confirmDialog(), makeStyles(), Pin, PinterestPicker(), Props, ColorAnalysisData, ColorItem (+9 more)

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.15
Nodes (26): FAMILY_STATUS_LABELS, FamilyStatus, SIZES, Pending, ImportedItem, ImportPurchases(), makeStyles(), NO_FAVICON (+18 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.13
Nodes (32): makeStyles(), Paywall(), TIERS, Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_TRIPS_PER_WEEK, REQUIRE_FAMILY_TIER (+24 more)

### Community 14 - "CreateOutfitView.tsx"
Cohesion: 0.16
Nodes (12): buildPrompt(), config, handler(), SUBCATEGORY_HINT, CATEGORIES, COLORS, makeStyles(), Props (+4 more)

### Community 15 - "smartPush.ts"
Cohesion: 0.23
Nodes (18): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+10 more)

### Community 16 - "notifications.tsx"
Cohesion: 0.25
Nodes (12): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, coarse(), DEFAULT_PREFS, NotifPrefs (+4 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-calendar, expo-file-system, expo-location, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.18
Nodes (17): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+9 more)

### Community 19 - "profile.tsx"
Cohesion: 0.14
Nodes (15): Essential, ESSENTIALS, makeStyles(), MG, NEWBORN, Wish, GENDERS, STYLES (+7 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.15
Nodes (12): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Manifest (PrivacyInfo.xcprivacy), Privacy Policy URL, Review Notes (klistra in i "Notes") (+4 more)

### Community 21 - "calendar.ts"
Cohesion: 0.23
Nodes (11): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+3 more)

### Community 22 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 24 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "SignedImage.tsx"
Cohesion: 0.07
Nodes (44): DayToNightShareCard(), makeStyles(), GarmentSetSection(), makeStyles(), Props, GarmentPicker(), makeStyles(), Props (+36 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.09
Nodes (21): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), Barn, storlekar och kategorier, Bildlagring & integritet (rör inte utan att läsa detta), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Egen backup (Supabase-gratisplanen har ingen) (+13 more)

### Community 27 - "generate-basics.ts"
Cohesion: 0.10
Nodes (28): args, aspectFor(), COLOR_EN, CONCURRENCY, createPrediction(), DRY, fileExists(), FORCE (+20 more)

### Community 28 - "detect-garments.ts"
Cohesion: 0.38
Nodes (6): buildPrompt(), clampBox(), config, handler(), RawBox, SUBCATEGORY_HINT

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "evaluate-purchase.ts"
Cohesion: 0.38
Nodes (6): buildPrompt(), config, handler(), SUBCATEGORY_HINT, WardrobeItem, langName()

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 32 - "trip.ts"
Cohesion: 0.33
Nodes (6): fetchTripWeather(), geocodeDestination(), GeoResult, mirrorLocalTripToDb(), TripWeather, ymd()

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 37 - "cleanup-orphan-images.mjs"
Cohesion: 0.22
Nodes (13): args, AS_JSON, backupAll(), backupArg, collectRefs(), CONFIRMED, db, DO_DELETE (+5 more)

### Community 38 - "restore-test.sh"
Cohesion: 0.40
Nodes (4): LANG, LC_ALL, psqlx(), restore-test.sh script

### Community 39 - "optimize-storage-images.py"
Cohesion: 0.53
Nodes (4): api(), lista(), main(), Alla objekt under prefixet, rekursivt. Storage-API:t listar bara EN nivå och…

### Community 40 - "BottomNav.tsx"
Cohesion: 0.29
Nodes (7): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs, SCAN_MULTIPLE_ENABLED

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.19
Nodes (11): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL, SORT_OPTIONS (+3 more)

### Community 42 - "ThemeProvider.tsx"
Cohesion: 0.13
Nodes (19): hasCodeVerifier(), makeStyles(), ResetPassword(), makeStyles(), PurchaseEval, PurchaseEvalResult(), ToastData, ToastVariant (+11 more)

### Community 43 - "Backup av Skrud"
Cohesion: 0.40
Nodes (4): Backup av Skrud, Gotchas, Installera (en gång), Återställa

### Community 49 - "quick-start.tsx"
Cohesion: 0.24
Nodes (13): makeStyles(), QuickStart(), BasicGender, basicImagePath(), BasicItem, basicsByCategory(), basicsFor(), COLOR_SLUG (+5 more)

### Community 50 - "backup-db.sh"
Cohesion: 0.50
Nodes (3): LANG, PATH, backup-db.sh script

### Community 51 - "cache.ts"
Cohesion: 0.22
Nodes (8): Locations(), makeStyles(), cacheClear(), store, captureError(), Options, QueryResult, useQuery()

### Community 52 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 62 - "app/_layout.tsx"
Cohesion: 0.17
Nodes (14): PUBLIC_ROUTES, RootLayout(), ConfirmHost(), ConfirmRequest, makeStyles(), makeStyles(), ToastHost(), ThemeProvider() (+6 more)

### Community 68 - "wardrobe.tsx"
Cohesion: 0.15
Nodes (16): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+8 more)

### Community 84 - "Basplaggs-bilder (Snabbstart)"
Cohesion: 0.25
Nodes (7): Automatiskt via skript (rekommenderat), Basplaggs-bilder (Snabbstart), Filer att skapa (95 st), Generera bilderna – prompt-mall, Kvinna (women), Lagring, Man (men)

### Community 147 - "reset-password.html — "Reset Password""
Cohesion: 0.22
Nodes (8): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mallen är byggd från confirm-signup.html med flit, Mejlmallar (Supabase Auth), Redirect – måste vara https, inte app-schemat, reset-password.html — "Reset Password", Språk (svenska/engelska), Två påståenden i mallen som måste stämma med inställningarna

### Community 177 - "stats.tsx"
Cohesion: 0.13
Nodes (16): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+8 more)

### Community 185 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

### Community 186 - "goBack"
Cohesion: 0.09
Nodes (22): ChildOutfit(), Group, GROUPS, HowItWorks(), Item, makeStyles(), ImportEmail(), makeStyles() (+14 more)

### Community 188 - "constants.ts"
Cohesion: 0.17
Nodes (14): GarmentDraft, DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, COLOR_GROUPS, COLOR_OPTIONS (+6 more)

### Community 190 - "useTheme"
Cohesion: 0.10
Nodes (26): Index(), Button(), Props, styles, Variant, CapsuleView(), makeStyles(), CropModal() (+18 more)

## Knowledge Gaps
- **451 isolated node(s):** `vercel`, `sorted`, `pool`, `AuthedUser`, `hits` (+446 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `profile.tsx` to `my-outfit.tsx`, `family.tsx`, `expo`, `settings.tsx`, `home.tsx`, `inspiration.tsx`, `garment-detail.tsx`, `entitlements.tsx`, `SignedImage.tsx`, `BottomNav.tsx`, `ArchiveView.tsx`, `ThemeProvider.tsx`, `WishlistAddModals.tsx`, `stats.tsx`, `onboarding.tsx`, `constants.ts`, `useTheme`, `app/_layout.tsx`, `wardrobe.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `profile.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `vercel`, `sorted`, `pool` to the rest of the system?**
  _451 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUser` be split into smaller, more focused modules?**
  _Cohesion score 0.06101010101010101 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06151742993848257 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `settings.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06161616161616162 - nodes in this community are weakly interconnected._