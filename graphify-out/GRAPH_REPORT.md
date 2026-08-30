# Graph Report - kladkollen  (2026-08-30)

## Corpus Check
- 236 files · ~642,413 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1404 nodes · 3369 edges · 186 communities (105 shown, 81 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54b88eb8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUser
- profile.tsx
- childSize.ts
- expo
- dashboard.ts
- login.tsx
- devDependencies
- Skrud – Marknadsföringsplaybook
- supabase.ts
- useTheme
- models.ts
- @expo-google-fonts/poppins
- add-garment.tsx
- entitlements.tsx
- my-outfit.tsx
- smartPush.ts
- inspiration.tsx
- dependencies
- send-notifications.ts
- notifications.tsx
- 1. App Privacy ("nutrition label")
- DraftCard.tsx
- include
- expo-camera
- manifest.json
- signedUrls.ts
- CLAUDE.md — projektminne för Skrud (kladkollen)
- generate-basics.ts
- public.dashboard_stats
- Skrud Premium – aktivera köpen
- household_members
- Klädkollen 🍒
- public.dashboard_stats
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- cleanup-orphan-images.mjs
- effective_entitlement
- 20260724b_partner_view.sql
- expo-router
- ArchiveView.tsx
- ThemeProvider.tsx
- people
- expo-font
- @expo-google-fonts/lora
- scripts
- expo-haptics
- expo-image
- app/_layout.tsx
- calendar.ts
- garment-detail.tsx
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
- trip.ts
- react-native
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-purchases
- react-native-reanimated
- expo-crypto
- react-native-screens
- react-native-svg
- react-native-view-shot
- @expo/metro-runtime
- react-native-webview
- react-native-worklets
- expo-file-system
- @react-navigation/elements
- public.wishlist
- @sentry/react-native
- @supabase/supabase-js
- expo-location
- entitlements
- effective_entitlement
- Basplaggs-bilder (Snabbstart)
- goBack
- 20260822_auto_laundry.sql
- expo-sharing
- outfit_likes
- api_rate_limits
- pending_imports
- locations
- partner_profile
- garment_sets
- partner_profile
- partner_profile
- partner_profile
- @react-navigation/bottom-tabs
- 20260814_waitlist.sql
- public.garments
- public.profiles
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
- expo-constants
- garments
- profiles
- expo-clipboard
- screens/README.md
- reset-password.html — "Reset Password"
- garments
- garments
- garments
- profiles
- outfits
- profiles
- wishlist
- profiles
- garments
- profiles
- garments
- stats.tsx
- i18n.ts
- quick-start.tsx
- GarmentSetSection.tsx
- family.tsx
- settings.tsx
- wardrobe.tsx
- useSettings
- Theme
- expo-calendar

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 109 edges
2. `useSettings()` - 99 edges
3. `Theme` - 49 edges
4. `supabase` - 42 edges
5. `requireUser()` - 39 edges
6. `json()` - 37 edges
7. `showAlert()` - 36 edges
8. `goBack()` - 35 edges
9. `expo-router` - 34 edges
10. `SignedImage()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts

## Import Cycles
- None detected.

## Communities (186 total, 81 thin omitted)

### Community 0 - "requireUser"
Cohesion: 0.05
Nodes (86): config, config, handler(), handler(), buildPrompt(), config, handler(), SUBCATEGORY_HINT (+78 more)

### Community 1 - "profile.tsx"
Cohesion: 0.15
Nodes (31): GarmentDetail(), PregnancyWardrobe(), GENDERS, makeStyles(), Profile(), STYLES, THEME_OPTIONS, Home() (+23 more)

### Community 2 - "childSize.ts"
Cohesion: 0.08
Nodes (47): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), AGE_MONTH (+39 more)

### Community 3 - "expo"
Cohesion: 0.04
Nodes (47): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+39 more)

### Community 4 - "dashboard.ts"
Cohesion: 0.16
Nodes (24): aiCosts(), anthropicCost(), Card, cardHtml(), config, esc(), get(), handler() (+16 more)

### Community 5 - "login.tsx"
Cohesion: 0.16
Nodes (12): COL_LEFT, COL_RIGHT, DARK, LIGHT, Login(), makeStyles(), Method, Palette (+4 more)

### Community 6 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+7 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "supabase.ts"
Cohesion: 0.19
Nodes (12): Locations(), makeStyles(), Essential, ESSENTIALS, makeStyles(), MG, NEWBORN, Wish (+4 more)

### Community 9 - "useTheme"
Cohesion: 0.16
Nodes (14): Group, GROUPS, HowItWorks(), Item, makeStyles(), Index(), hasCodeVerifier(), makeStyles() (+6 more)

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "add-garment.tsx"
Cohesion: 0.13
Nodes (27): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), ImportEmail(), makeStyles(), Pending (+19 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.13
Nodes (32): makeStyles(), Paywall(), TIERS, Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, FREE_TRIPS_PER_WEEK (+24 more)

### Community 14 - "my-outfit.tsx"
Cohesion: 0.06
Nodes (65): ChildOutfit(), makeStyles(), INTENSITY_LABELS, STYLE_TAGS, AppleMusicBadge(), FamilyOutfits(), makeStyles(), Member (+57 more)

### Community 15 - "smartPush.ts"
Cohesion: 0.23
Nodes (18): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+10 more)

### Community 16 - "inspiration.tsx"
Cohesion: 0.15
Nodes (18): makeStyles(), confirmDialog(), ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS (+10 more)

### Community 17 - "dependencies"
Cohesion: 0.08
Nodes (25): expo, expo-apple-authentication, expo-audio, expo-image-manipulator, expo-image-picker, expo-linking, expo-symbols, expo-web-browser (+17 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.18
Nodes (17): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+9 more)

### Community 19 - "notifications.tsx"
Cohesion: 0.20
Nodes (14): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, styles, Toggle(), coarse() (+6 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.15
Nodes (12): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Manifest (PrivacyInfo.xcprivacy), Privacy Policy URL, Review Notes (klistra in i "Notes") (+4 more)

### Community 21 - "DraftCard.tsx"
Cohesion: 0.20
Nodes (11): DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, BrandInput(), makeStyles(), brandSuggestions() (+3 more)

### Community 22 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 24 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "signedUrls.ts"
Cohesion: 0.18
Nodes (17): absolute(), all(), cachedSignedUrl(), clearSignedUrls(), Entry, inflight, keyFor(), pending (+9 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.11
Nodes (18): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), Barn, storlekar och kategorier, Bildlagring & integritet (rör inte utan att läsa detta), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Kodstruktur & refaktorering (+10 more)

### Community 27 - "generate-basics.ts"
Cohesion: 0.10
Nodes (28): args, aspectFor(), COLOR_EN, CONCURRENCY, createPrediction(), DRY, fileExists(), FORCE (+20 more)

### Community 28 - "public.dashboard_stats"
Cohesion: 0.12
Nodes (16): fresh, real_users, public.dashboard_stats(), act, auth.users, cohort, cron, ent (+8 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "household_members"
Cohesion: 0.21
Nodes (11): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+3 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 32 - "public.dashboard_stats"
Cohesion: 0.13
Nodes (14): public.dashboard_stats(), act, auth.users, cohort, cron, ent, garments, outfits (+6 more)

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 37 - "cleanup-orphan-images.mjs"
Cohesion: 0.22
Nodes (13): args, AS_JSON, backupAll(), backupArg, collectRefs(), CONFIRMED, db, DO_DELETE (+5 more)

### Community 38 - "effective_entitlement"
Cohesion: 0.20
Nodes (7): effective_entitlement(), me, my_households, own, shared, sharers, tier_of

### Community 40 - "expo-router"
Cohesion: 0.14
Nodes (14): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs, CATEGORIES, COLORS (+6 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "ThemeProvider.tsx"
Cohesion: 0.14
Nodes (15): ConfirmHost(), ConfirmRequest, makeStyles(), makeStyles(), Props, QueryState(), darkColors, darkTheme (+7 more)

### Community 43 - "people"
Cohesion: 0.22
Nodes (6): ensure_household(), people, my_household_person_ids(), person_outfit_calendar, auth.users, outfits

### Community 46 - "scripts"
Cohesion: 0.13
Nodes (14): main, name, private, scripts, android, build:ios, ios, lint (+6 more)

### Community 49 - "app/_layout.tsx"
Cohesion: 0.25
Nodes (10): PUBLIC_ROUTES, RootLayout(), ThemeProvider(), useThemeControl(), pingActivity(), resetActivityPing(), hydrateCache(), initSentry() (+2 more)

### Community 50 - "calendar.ts"
Cohesion: 0.23
Nodes (11): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+3 more)

### Community 51 - "garment-detail.tsx"
Cohesion: 0.31
Nodes (6): makeStyles(), SIZES, PurchaseEval, base64ToBytes(), downscaleForUpload(), pngToWebp()

### Community 52 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 62 - "trip.ts"
Cohesion: 0.40
Nodes (5): fetchTripWeather(), geocodeDestination(), GeoResult, TripWeather, ymd()

### Community 82 - "entitlements"
Cohesion: 0.33
Nodes (7): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit(), ai_credits_left(), use_ai_credit()

### Community 83 - "effective_entitlement"
Cohesion: 0.22
Nodes (8): effective_entitlement(), me, my_households, own, profiles, shared, sharers, tier_of

### Community 84 - "Basplaggs-bilder (Snabbstart)"
Cohesion: 0.25
Nodes (7): Automatiskt via skript (rekommenderat), Basplaggs-bilder (Snabbstart), Filer att skapa (95 st), Generera bilderna – prompt-mall, Kvinna (women), Lagring, Man (men)

### Community 85 - "goBack"
Cohesion: 0.23
Nodes (9): C, Privacy(), SECTIONS, styles, C, SECTIONS, styles, Terms() (+1 more)

### Community 86 - "20260822_auto_laundry.sql"
Cohesion: 0.40
Nodes (5): settings, adjust_garment_wear(), reset_wears_on_wash(), profiles, trg_reset_wears_on_wash

### Community 88 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 89 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 147 - "reset-password.html — "Reset Password""
Cohesion: 0.22
Nodes (8): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mallen är byggd från confirm-signup.html med flit, Mejlmallar (Supabase Auth), Redirect – måste vara https, inte app-schemat, reset-password.html — "Reset Password", Språk (svenska/engelska), Två påståenden i mallen som måste stämma med inställningarna

### Community 177 - "stats.tsx"
Cohesion: 0.11
Nodes (19): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+11 more)

### Community 179 - "i18n.ts"
Cohesion: 0.15
Nodes (13): setApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+5 more)

### Community 180 - "quick-start.tsx"
Cohesion: 0.23
Nodes (14): makeStyles(), QuickStart(), BasicGender, basicImagePath(), BasicItem, basicsByCategory(), basicsFor(), COLOR_SLUG (+6 more)

### Community 182 - "GarmentSetSection.tsx"
Cohesion: 0.35
Nodes (9): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), GarmentSet, setGarmentSet() (+1 more)

### Community 186 - "family.tsx"
Cohesion: 0.15
Nodes (19): Family(), loadChildren(), makeStyles(), reminderLabel(), showPottyRow(), showWalksRow(), child(), deletePerson() (+11 more)

### Community 187 - "settings.tsx"
Cohesion: 0.17
Nodes (13): makeStyles(), Mode, MODES, WardrobeAnalysis(), makeStyles(), Props, SaleAddModal(), localeFor() (+5 more)

### Community 188 - "wardrobe.tsx"
Cohesion: 0.11
Nodes (26): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+18 more)

### Community 189 - "useSettings"
Cohesion: 0.18
Nodes (13): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES, CropModal(), makeStyles(), makeStyles() (+5 more)

### Community 190 - "Theme"
Cohesion: 0.15
Nodes (16): makeStyles(), Member, Partner(), CapsuleView(), makeStyles(), DayToNightShareCard(), makeStyles(), Props (+8 more)

## Knowledge Gaps
- **434 isolated node(s):** `vercel`, `sorted`, `pool`, `AuthedUser`, `hits` (+429 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **81 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `expo-router` to `profile.tsx`, `expo`, `login.tsx`, `supabase.ts`, `useTheme`, `add-garment.tsx`, `entitlements.tsx`, `my-outfit.tsx`, `inspiration.tsx`, `DraftCard.tsx`, `ArchiveView.tsx`, `app/_layout.tsx`, `stats.tsx`, `garment-detail.tsx`, `GarmentSetSection.tsx`, `family.tsx`, `wardrobe.tsx`, `useSettings`, `Theme`, `goBack`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `expo-router`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `vercel`, `sorted`, `pool` to the rest of the system?**
  _434 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUser` be split into smaller, more focused modules?**
  _Cohesion score 0.054840416152354084 - nodes in this community are weakly interconnected._
- **Should `profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1495798319327731 - nodes in this community are weakly interconnected._
- **Should `childSize.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08270676691729323 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._