# Graph Report - kladkollen  (2026-08-15)

## Corpus Check
- 194 files · ~475,437 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1091 nodes · 2688 edges · 157 communities (80 shown, 77 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a23db94`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- stats.tsx
- sizeReminders.ts
- expo
- useSettings
- useTheme
- scripts
- Skrud – Marknadsföringsplaybook
- my-outfit.tsx
- add-garment.tsx
- ColorAnalysis.tsx
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- constants.ts
- SignedImage.tsx
- app/_layout.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- expo-calendar
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- import-purchases.tsx
- Skrud Premium – aktivera köpen
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- smartPush.ts
- expo-background-task
- wishlist
- BrandInput.tsx
- ArchiveView.tsx
- notifications.tsx
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- calendar.ts
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
- login.tsx
- expo-constants
- OutfitShareCard.tsx
- SongCard.tsx
- family.tsx
- outfits
- expo-audio
- CreateOutfitView.tsx
- expo-clipboard
- i18n.ts
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles
- wardrobe-analysis.tsx
- how-it-works.tsx
- onboarding.tsx
- Button.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 107 edges
2. `useSettings()` - 99 edges
3. `Theme` - 49 edges
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
- `Locations()` --indirect_call--> `fetchLocations()`  [INFERRED]
  app/locations.tsx → utils/locations.ts
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (157 total, 77 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (67): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+59 more)

### Community 1 - "stats.tsx"
Cohesion: 0.11
Nodes (19): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+11 more)

### Community 2 - "sizeReminders.ts"
Cohesion: 0.12
Nodes (29): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), child() (+21 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "useSettings"
Cohesion: 0.20
Nodes (15): ChildOutfit(), makeStyles(), Locations(), makeStyles(), makeStyles(), Member, Partner(), makeStyles() (+7 more)

### Community 5 - "useTheme"
Cohesion: 0.11
Nodes (29): Index(), makeStyles(), Privacy(), SECTIONS, makeStyles(), ResetPassword(), CapsuleView(), makeStyles() (+21 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "my-outfit.tsx"
Cohesion: 0.06
Nodes (70): COLD_LEVELS, GENDERS, LIFESTYLE, makeStyles(), Profile(), STIL_PROFIL, STYLES, THEME_OPTIONS (+62 more)

### Community 9 - "add-garment.tsx"
Cohesion: 0.16
Nodes (13): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, makeStyles(), DraftCard(), FAMILY_STATUS_LABELS, makeStyles() (+5 more)

### Community 10 - "ColorAnalysis.tsx"
Cohesion: 0.08
Nodes (28): ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS, styles, Toggle() (+20 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.15
Nodes (17): GarmentDetail(), makeStyles(), SIZES, confirmDialog(), makeStyles(), toast(), ToastData, ToastHost() (+9 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.15
Nodes (24): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), familyFeaturesEnabled(), FREE_AI_PER_WEEK (+16 more)

### Community 14 - "constants.ts"
Cohesion: 0.15
Nodes (19): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), makeStyles(), Props, makeStyles() (+11 more)

### Community 15 - "SignedImage.tsx"
Cohesion: 0.18
Nodes (10): Essential, ESSENTIALS, makeStyles(), MG, PregnancyWardrobe(), Wish, Props, RESIZE_TO_FIT (+2 more)

### Community 16 - "app/_layout.tsx"
Cohesion: 0.27
Nodes (9): PUBLIC_ROUTES, RootLayout(), ThemeProvider(), useThemeControl(), hydrateCache(), registerForPush(), initSentry(), wrapWithSentry() (+1 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-apple-authentication, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.12
Nodes (18): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+10 more)

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
Cohesion: 0.13
Nodes (16): create_partner_invite(), household_invites, household_members, households, join_by_invite(), leave_household(), my_household_ids(), auth (+8 more)

### Community 26 - "CLAUDE.md — projektminne för Skrud (kladkollen)"
Cohesion: 0.22
Nodes (8): Använd kunskapsgrafen först (spara tokens), Bakgrundsborttagning (Replicate), CLAUDE.md — projektminne för Skrud (kladkollen), Data, cache & prestanda, Databastyper, Kodstruktur & refaktorering, Reseplan (trips), Övrigt värt att minnas

### Community 27 - "settings.tsx"
Cohesion: 0.23
Nodes (12): setApiLang(), LANGS, Ctx, CURRENCIES, CurrencyCode, detectDeviceLang(), FALLBACK_RATES, formatWithCurrency() (+4 more)

### Community 28 - "import-purchases.tsx"
Cohesion: 0.19
Nodes (15): ImportEmail(), makeStyles(), Pending, ImportedItem, ImportPurchases(), makeStyles(), storeLogoUrl(), STORES (+7 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 37 - "smartPush.ts"
Cohesion: 0.24
Nodes (17): ensureCalendarPermission(), cancelLogReminder(), cancelSmartPush(), currentLang(), dayStr(), fill(), getSmartPushTime(), isLogReminderEnabled() (+9 more)

### Community 40 - "BrandInput.tsx"
Cohesion: 0.39
Nodes (6): BrandInput(), makeStyles(), brandSuggestions(), COMMON_BRANDS, normalizeBrand(), parsePrice()

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "notifications.tsx"
Cohesion: 0.24
Nodes (11): CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, coarse(), DEFAULT_PREFS, NotifPrefs (+3 more)

### Community 46 - "calendar.ts"
Cohesion: 0.24
Nodes (10): DATE_WORDS, DayPlan, EVENING, eventsForDay(), fill(), has(), planForDay(), SCHOOL (+2 more)

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
Cohesion: 0.35
Nodes (9): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), GarmentSet, setGarmentSet() (+1 more)

### Community 136 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 138 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 139 - "SongCard.tsx"
Cohesion: 0.33
Nodes (6): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo()

### Community 140 - "family.tsx"
Cohesion: 0.20
Nodes (15): Family(), loadChildren(), makeStyles(), reminderLabel(), makeStyles(), PersonSwitcher(), Props, EU_CHILD_SIZES (+7 more)

### Community 144 - "CreateOutfitView.tsx"
Cohesion: 0.17
Nodes (13): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs, CATEGORIES, COLORS (+5 more)

### Community 146 - "i18n.ts"
Cohesion: 0.19
Nodes (12): getApiLang(), Dict, en, enBySource, Lang, LOCALES, sv, translate() (+4 more)

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

### Community 153 - "wardrobe-analysis.tsx"
Cohesion: 0.25
Nodes (9): makeStyles(), Mode, MODES, WardrobeAnalysis(), makeStyles(), Props, SaleAddModal(), STYLE_RULES (+1 more)

### Community 154 - "how-it-works.tsx"
Cohesion: 0.40
Nodes (5): Group, GROUPS, HowItWorks(), Item, makeStyles()

### Community 155 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

### Community 156 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

## Knowledge Gaps
- **360 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `add-garment.tsx` to `stats.tsx`, `expo`, `useSettings`, `useTheme`, `GarmentSetSection.tsx`, `my-outfit.tsx`, `login.tsx`, `ArchiveView.tsx`, `family.tsx`, `garment-detail.tsx`, `entitlements.tsx`, `SignedImage.tsx`, `app/_layout.tsx`, `CreateOutfitView.tsx`, `constants.ts`, `wardrobe.tsx`, `onboarding.tsx`, `import-purchases.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `add-garment.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07359781121751026 - nodes in this community are weakly interconnected._
- **Should `stats.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11067193675889328 - nodes in this community are weakly interconnected._
- **Should `sizeReminders.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11587301587301588 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._