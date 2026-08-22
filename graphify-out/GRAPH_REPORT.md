# Graph Report - kladkollen  (2026-08-22)

## Corpus Check
- 209 files · ~608,285 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1035 nodes · 2842 edges · 92 communities (46 shown, 46 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `93b4cf08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- profile.tsx
- family.tsx
- expo
- my-outfit.tsx
- settings.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- home.tsx
- useSettings
- models.ts
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- login.tsx
- smartPush.ts
- inspiration.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- insights.ts
- include
- expo-camera
- manifest.json
- signedUrls.ts
- CLAUDE.md — projektminne för Skrud (kladkollen)
- stats.tsx
- GarmentSetSection.tsx
- Skrud Premium – aktivera köpen
- notifications.tsx
- Klädkollen 🍒
- calendar.ts
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- i18n.ts
- app/_layout.tsx
- useTheme
- SignedImage.tsx
- ArchiveView.tsx
- OutfitShareCard.tsx
- onboarding.tsx
- expo-font
- @expo-google-fonts/lora
- expo-apple-authentication
- expo-haptics
- expo-image
- expo-image-manipulator
- expo-image-picker
- expo-linking
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
- expo-file-system
- @react-navigation/elements
- @react-navigation/native
- @sentry/react-native
- @supabase/supabase-js
- expo-location
- expo-sharing
- expo-audio
- expo-constants
- Button.tsx
- constants.ts
- expo-calendar
- expo-clipboard
- screens/README.md
- reset-password.html — "Reset Password"
- waitlist-list.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 105 edges
2. `useSettings()` - 95 edges
3. `Theme` - 47 edges
4. `supabase` - 40 edges
5. `json()` - 37 edges
6. `requireUser()` - 35 edges
7. `showAlert()` - 35 edges
8. `expo-router` - 34 edges
9. `goBack()` - 33 edges
10. `SignedImage()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Family()` --indirect_call--> `child()`  [INFERRED]
  app/family.tsx → __tests__/sizeReminders.test.ts
- `Index()` --calls--> `useTheme()`  [EXTRACTED]
  app/index.tsx → theme/ThemeProvider.tsx
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts

## Import Cycles
- None detected.

## Communities (92 total, 46 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (67): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+59 more)

### Community 1 - "profile.tsx"
Cohesion: 0.08
Nodes (50): AddGarment(), makeStyles(), GarmentDetail(), makeStyles(), makeStyles(), Partner(), Essential, ESSENTIALS (+42 more)

### Community 2 - "family.tsx"
Cohesion: 0.08
Nodes (45): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+37 more)

### Community 3 - "expo"
Cohesion: 0.04
Nodes (46): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+38 more)

### Community 4 - "my-outfit.tsx"
Cohesion: 0.10
Nodes (33): ChildOutfit(), makeStyles(), makeStyles(), monthLabel(), STYLE_TAGS, weekdayLabels(), seasonalOrFull(), ageMonths() (+25 more)

### Community 5 - "settings.tsx"
Cohesion: 0.13
Nodes (20): Index(), hasCodeVerifier(), makeStyles(), ResetPassword(), makeStyles(), Mode, MODES, WardrobeAnalysis() (+12 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "home.tsx"
Cohesion: 0.14
Nodes (19): INTENSITY_LABELS, AppleMusicBadge(), Member, makeStyles(), Props, SwapSheet(), makeStyles(), openLink() (+11 more)

### Community 9 - "useSettings"
Cohesion: 0.13
Nodes (23): Locations(), makeStyles(), BrandInput(), makeStyles(), ConfirmHost(), ConfirmRequest, makeStyles(), CropModal() (+15 more)

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.07
Nodes (52): FAMILY_STATUS_LABELS, FamilyStatus, SIZES, Group, GROUPS, HowItWorks(), Item, makeStyles() (+44 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.12
Nodes (33): makeStyles(), Paywall(), TIERS, Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, FREE_TRIPS_PER_WEEK (+25 more)

### Community 14 - "login.tsx"
Cohesion: 0.16
Nodes (12): COL_LEFT, COL_RIGHT, DARK, LIGHT, Login(), makeStyles(), Method, Palette (+4 more)

### Community 15 - "smartPush.ts"
Cohesion: 0.23
Nodes (18): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+10 more)

### Community 16 - "inspiration.tsx"
Cohesion: 0.27
Nodes (10): Member, confirmDialog(), makeStyles(), Props, WishlistAddModals(), showAlert(), showConfirm(), askSource() (+2 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo, expo-crypto (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.11
Nodes (22): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+14 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.15
Nodes (12): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Manifest (PrivacyInfo.xcprivacy), Privacy Policy URL, Review Notes (klistra in i "Notes") (+4 more)

### Community 21 - "insights.ts"
Cohesion: 0.50
Nodes (4): BuildArgs, buildInsights(), Insight, seasonOf()

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
Cohesion: 0.20
Nodes (9): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), Bildlagring & integritet (rör inte utan att läsa detta), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Kodstruktur & refaktorering, Reseplan (trips) (+1 more)

### Community 27 - "stats.tsx"
Cohesion: 0.14
Nodes (14): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+6 more)

### Community 28 - "GarmentSetSection.tsx"
Cohesion: 0.24
Nodes (12): GarmentSetSection(), makeStyles(), Props, GarmentPicker(), makeStyles(), Props, createSet(), fetchSetMembers() (+4 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 30 - "notifications.tsx"
Cohesion: 0.25
Nodes (12): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, coarse(), DEFAULT_PREFS, NotifPrefs (+4 more)

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 32 - "calendar.ts"
Cohesion: 0.23
Nodes (11): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+3 more)

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 37 - "i18n.ts"
Cohesion: 0.15
Nodes (13): setApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+5 more)

### Community 38 - "app/_layout.tsx"
Cohesion: 0.29
Nodes (8): PUBLIC_ROUTES, RootLayout(), ThemeProvider(), useThemeControl(), hydrateCache(), initSentry(), wrapWithSentry(), mirrorLocalTripToDb()

### Community 39 - "useTheme"
Cohesion: 0.27
Nodes (9): ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS, styles, Toggle() (+1 more)

### Community 40 - "SignedImage.tsx"
Cohesion: 0.13
Nodes (16): DayToNightShareCard(), makeStyles(), CATEGORIES, COLORS, CreateOutfitView(), makeStyles(), Props, SEASONS (+8 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.22
Nodes (9): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+1 more)

### Community 42 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 43 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

### Community 52 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

### Community 138 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

### Community 140 - "constants.ts"
Cohesion: 0.12
Nodes (23): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), GarmentDraft, DraftCard(), FAMILY_STATUS_LABELS (+15 more)

### Community 147 - "reset-password.html — "Reset Password""
Cohesion: 0.22
Nodes (8): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mallen är byggd från confirm-signup.html med flit, Mejlmallar (Supabase Auth), Redirect – måste vara https, inte app-schemat, reset-password.html — "Reset Password", Språk (svenska/engelska), Två påståenden i mallen som måste stämma med inställningarna

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

## Knowledge Gaps
- **378 isolated node(s):** `AuthedUser`, `hits`, `FREE_TRIPS_PER_WEEK`, `LANG_NAMES`, `config` (+373 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `wardrobe.tsx` to `profile.tsx`, `family.tsx`, `expo`, `my-outfit.tsx`, `settings.tsx`, `app/_layout.tsx`, `home.tsx`, `ArchiveView.tsx`, `SignedImage.tsx`, `onboarding.tsx`, `garment-detail.tsx`, `entitlements.tsx`, `login.tsx`, `constants.ts`, `inspiration.tsx`, `stats.tsx`, `GarmentSetSection.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `wardrobe.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_TRIPS_PER_WEEK` to the rest of the system?**
  _378 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07414500683994528 - nodes in this community are weakly interconnected._
- **Should `profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08469449485783424 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08455625436757512 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._