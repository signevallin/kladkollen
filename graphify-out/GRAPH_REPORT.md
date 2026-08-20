# Graph Report - kladkollen  (2026-08-20)

## Corpus Check
- 196 files · ~585,634 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1105 nodes · 2734 edges · 153 communities (73 shown, 80 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f7a5365`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- useTheme
- family.tsx
- expo
- CreateOutfitView.tsx
- DraftCard.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- SongCard.tsx
- ThemeProvider.tsx
- ColorAnalysis.tsx
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- login.tsx
- app/_layout.tsx
- alert.ts
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- InsightsTab.tsx
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
- Theme
- ArchiveView.tsx
- OutfitShareCard.tsx
- Toast.tsx
- expo-font
- @expo-google-fonts/lora
- expo-apple-authentication
- expo-haptics
- expo-image
- expo-image-manipulator
- expo-image-picker
- expo-linking
- expo-crypto
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
- pregnancy-wardrobe.tsx
- expo-constants
- Button.tsx
- @expo/metro-runtime
- constants.ts
- outfits
- expo-calendar
- react-native-purchases-ui
- expo-clipboard
- screens/README.md
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles

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
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts

## Import Cycles
- None detected.

## Communities (153 total, 80 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (66): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+58 more)

### Community 1 - "useTheme"
Cohesion: 0.05
Nodes (95): AddGarment(), ChildOutfit(), makeStyles(), GarmentDetail(), makeStyles(), Partner(), Paywall(), PregnancyWardrobe() (+87 more)

### Community 2 - "family.tsx"
Cohesion: 0.08
Nodes (44): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+36 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "CreateOutfitView.tsx"
Cohesion: 0.17
Nodes (12): AddGarmentChooser(), makeStyles(), addOptions, BottomNav(), makeStyles(), tabs, CATEGORIES, COLORS (+4 more)

### Community 5 - "DraftCard.tsx"
Cohesion: 0.21
Nodes (11): GarmentDraft, DraftCard(), FAMILY_STATUS_LABELS, makeStyles(), Props, SIZES, BrandInput(), makeStyles() (+3 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "SongCard.tsx"
Cohesion: 0.33
Nodes (6): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo()

### Community 9 - "ThemeProvider.tsx"
Cohesion: 0.19
Nodes (10): ConfirmRequest, darkColors, darkTheme, lightColors, lightTheme, radius, ThemeColors, ThemeContext (+2 more)

### Community 10 - "ColorAnalysis.tsx"
Cohesion: 0.09
Nodes (26): ColorAnalysis(), ColorAnalysisData, ColorItem, makeStyles(), Props, STRATEGY_LABELS, CalendarEntry, Garment (+18 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.07
Nodes (57): FAMILY_STATUS_LABELS, FamilyStatus, makeStyles(), makeStyles(), SIZES, ImportEmail(), makeStyles(), Pending (+49 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.15
Nodes (24): BENEFITS, makeStyles(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, REQUIRE_FAMILY_TIER, REQUIRE_PARTNER_TIER (+16 more)

### Community 14 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 15 - "app/_layout.tsx"
Cohesion: 0.06
Nodes (59): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, makeStyles() (+51 more)

### Community 16 - "alert.ts"
Cohesion: 0.35
Nodes (7): confirmDialog(), Props, showAlert(), showConfirm(), askSource(), CANCELED, pickImageSmart()

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-background-task, expo-file-system, expo-location, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.13
Nodes (16): CATEGORIES, COLOR_ORDER, COLORS, SEASONS, SORT_LABEL, SORT_OPTIONS, ListFilterBar(), makeStyles() (+8 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "InsightsTab.tsx"
Cohesion: 0.33
Nodes (7): InsightsTab(), makeStyles(), Props, BuildArgs, buildInsights(), Insight, seasonOf()

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
Cohesion: 0.16
Nodes (12): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+4 more)

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
Nodes (33): Group, GROUPS, HowItWorks(), Item, makeStyles(), GarmentSetSection(), makeStyles(), Props (+25 more)

### Community 40 - "Theme"
Cohesion: 0.21
Nodes (9): Member, Props, RESIZE_TO_FIT, ResizeMode, SignedImage(), Props, Props, expo-router (+1 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 43 - "Toast.tsx"
Cohesion: 0.50
Nodes (4): makeStyles(), ToastData, ToastHost(), ToastVariant

### Community 55 - "20260804_premium.sql"
Cohesion: 0.53
Nodes (5): ai_credits_left(), ai_quota, entitlements, auth, use_ai_credit()

### Community 81 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 82 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 136 - "pregnancy-wardrobe.tsx"
Cohesion: 0.29
Nodes (6): Essential, ESSENTIALS, makeStyles(), MG, NEWBORN, Wish

### Community 138 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

### Community 140 - "constants.ts"
Cohesion: 0.18
Nodes (16): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), makeStyles(), Props, CATEGORIES (+8 more)

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

## Knowledge Gaps
- **368 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+363 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `Theme` to `useTheme`, `family.tsx`, `expo`, `CreateOutfitView.tsx`, `DraftCard.tsx`, `settings.tsx`, `pregnancy-wardrobe.tsx`, `ArchiveView.tsx`, `garment-detail.tsx`, `entitlements.tsx`, `login.tsx`, `app/_layout.tsx`, `alert.ts`, `wardrobe.tsx`, `stats.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `Theme`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _368 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07478991596638655 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.0517162471395881 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08315863032844165 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._