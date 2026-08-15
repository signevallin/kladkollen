# Graph Report - kladkollen  (2026-08-15)

## Corpus Check
- 193 files · ~474,948 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1090 nodes · 2682 edges · 152 communities (75 shown, 77 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3195a0f2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- stats.tsx
- family.tsx
- expo
- Button.tsx
- useSettings
- scripts
- Skrud – Marknadsföringsplaybook
- my-outfit.tsx
- useTheme
- models.ts
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- CreateOutfitView.tsx
- expo-apple-authentication
- app/_layout.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- alert.ts
- include
- expo-camera
- manifest.json
- household_members
- CLAUDE.md — projektminne för Skrud (kladkollen)
- settings.tsx
- add-garment.tsx
- Skrud Premium – aktivera köpen
- Klädkollen 🍒
- 20260724b_partner_view.sql
- revenuecat-webhook.ts
- eslint.config.js
- vercel.json
- expo-audio
- expo-background-task
- wishlist
- constants.ts
- ArchiveView.tsx
- wardrobe-analysis.tsx
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- login.tsx
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
- pregnancy-wardrobe.tsx
- expo-constants
- OutfitShareCard.tsx
- SongCard.tsx
- BottomNav.tsx
- outfits
- Toast.tsx
- affiliate.ts
- expo-clipboard
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles

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
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts

## Import Cycles
- None detected.

## Communities (152 total, 77 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (67): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+59 more)

### Community 1 - "stats.tsx"
Cohesion: 0.11
Nodes (19): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+11 more)

### Community 2 - "family.tsx"
Cohesion: 0.09
Nodes (43): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+35 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

### Community 5 - "useSettings"
Cohesion: 0.10
Nodes (31): Group, GROUPS, HowItWorks(), Item, makeStyles(), makeStyles(), Member, Partner() (+23 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "my-outfit.tsx"
Cohesion: 0.05
Nodes (80): ChildOutfit(), makeStyles(), COLD_LEVELS, COLOR_PROFILES, GENDERS, LIFESTYLE, makeStyles(), Profile() (+72 more)

### Community 9 - "useTheme"
Cohesion: 0.27
Nodes (7): Index(), makeStyles(), ResetPassword(), CapsuleView(), makeStyles(), expo-router, useTheme()

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.23
Nodes (9): GarmentDetail(), makeStyles(), SIZES, BrandInput(), makeStyles(), brandSuggestions(), COMMON_BRANDS, parsePrice() (+1 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.15
Nodes (24): BENEFITS, makeStyles(), Paywall(), Ctx, EntitlementsCtx, EntitlementsProvider(), familyFeaturesEnabled(), FREE_AI_PER_WEEK (+16 more)

### Community 14 - "CreateOutfitView.tsx"
Cohesion: 0.16
Nodes (14): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), CATEGORIES, COLORS, CreateOutfitView() (+6 more)

### Community 16 - "app/_layout.tsx"
Cohesion: 0.05
Nodes (61): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, makeStyles() (+53 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-calendar, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.13
Nodes (18): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+10 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "alert.ts"
Cohesion: 0.18
Nodes (16): confirmDialog(), ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS, toast() (+8 more)

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
Cohesion: 0.14
Nodes (18): setApiLang(), Dict, en, enBySource, Lang, LANGS, LOCALES, sv (+10 more)

### Community 28 - "add-garment.tsx"
Cohesion: 0.13
Nodes (27): AddGarment(), FAMILY_STATUS_LABELS, FamilyStatus, makeStyles(), ImportEmail(), makeStyles(), Pending, ImportedItem (+19 more)

### Community 29 - "Skrud Premium – aktivera köpen"
Cohesion: 0.29
Nodes (6): Justera gränsen, Modell, Möjliga framtida Premium-grindar (ej gjorda än), Skrud Premium – aktivera köpen, Steg för att gå live, Vad som redan är byggt

### Community 31 - "Klädkollen 🍒"
Cohesion: 0.33
Nodes (5): Arkitektur, Bygga för butikerna, Klädkollen 🍒, Kom igång, Miljövariabler

### Community 33 - "revenuecat-webhook.ts"
Cohesion: 0.67
Nodes (3): config, handler(), jsonResponse()

### Community 40 - "constants.ts"
Cohesion: 0.16
Nodes (15): GarmentDraft, DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, COLOR_GROUPS, COLOR_OPTIONS (+7 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "wardrobe-analysis.tsx"
Cohesion: 0.29
Nodes (8): makeStyles(), Mode, MODES, WardrobeAnalysis(), makeStyles(), Props, SaleAddModal(), localeFor()

### Community 46 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

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

### Community 136 - "pregnancy-wardrobe.tsx"
Cohesion: 0.29
Nodes (7): Essential, ESSENTIALS, makeStyles(), MG, PregnancyWardrobe(), Wish, invalidateGarments()

### Community 138 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 139 - "SongCard.tsx"
Cohesion: 0.33
Nodes (6): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo()

### Community 140 - "BottomNav.tsx"
Cohesion: 0.36
Nodes (6): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs

### Community 143 - "Toast.tsx"
Cohesion: 0.50
Nodes (4): makeStyles(), ToastData, ToastHost(), ToastVariant

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
- **361 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `useTheme` to `stats.tsx`, `family.tsx`, `expo`, `useSettings`, `GarmentSetSection.tsx`, `my-outfit.tsx`, `pregnancy-wardrobe.tsx`, `constants.ts`, `ArchiveView.tsx`, `garment-detail.tsx`, `entitlements.tsx`, `login.tsx`, `BottomNav.tsx`, `app/_layout.tsx`, `wardrobe.tsx`, `alert.ts`, `add-garment.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `useTheme`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _361 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07359781121751026 - nodes in this community are weakly interconnected._
- **Should `stats.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08563134978229318 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._