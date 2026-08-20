# Graph Report - kladkollen  (2026-08-20)

## Corpus Check
- 196 files · ~585,072 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1102 nodes · 2730 edges · 154 communities (75 shown, 79 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a7306bb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- home.tsx
- family.tsx
- expo
- useTheme
- cache.ts
- scripts
- Skrud – Marknadsföringsplaybook
- SongCard.tsx
- affiliate.ts
- models.ts
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- login.tsx
- app/_layout.tsx
- my-outfit.tsx
- dependencies
- send-notifications.ts
- wardrobe.tsx
- 1. App Privacy ("nutrition label")
- PersonSwitcher.tsx
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
- SignedImage.tsx
- ArchiveView.tsx
- OutfitShareCard.tsx
- expo-file-system
- expo-font
- @expo-google-fonts/lora
- pregnancy.ts
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
- pregnancy-wardrobe.tsx
- expo-constants
- Button.tsx
- CreateOutfitView.tsx
- constants.ts
- outfits
- expo-calendar
- GarmentSetSection.tsx
- expo-clipboard
- screens/README.md
- confirm-signup.html — "Confirm signup"
- waitlist-list.ts
- 20260814_waitlist.sql
- profiles
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
- `Login()` --calls--> `useSettings()`  [EXTRACTED]
  app/login.tsx → utils/settings.tsx
- `Button()` --calls--> `useTheme()`  [EXTRACTED]
  components/Button.tsx → theme/ThemeProvider.tsx
- `handler()` --references--> `COLOR_NAMES`  [EXTRACTED]
  api/inbound-email.ts → utils/constants.ts
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (154 total, 79 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (66): config, config, handler(), handler(), config, config, dedupeItems(), handler() (+58 more)

### Community 1 - "home.tsx"
Cohesion: 0.16
Nodes (22): ChildOutfit(), makeStyles(), INTENSITY_LABELS, makeStyles(), makeStyles(), Member, seasonalOrFull(), OUTFIT_CONTEXTS (+14 more)

### Community 2 - "family.tsx"
Cohesion: 0.08
Nodes (43): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+35 more)

### Community 3 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+34 more)

### Community 4 - "useTheme"
Cohesion: 0.12
Nodes (26): Index(), Paywall(), makeStyles(), ResetPassword(), AddGarmentChooser(), makeStyles(), addOptions, BottomNav() (+18 more)

### Community 5 - "cache.ts"
Cohesion: 0.29
Nodes (6): cacheClear(), store, captureError(), Options, QueryResult, useQuery()

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

### Community 12 - "garment-detail.tsx"
Cohesion: 0.05
Nodes (88): FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, SIZES, ImportEmail(), makeStyles(), Pending, ImportedItem (+80 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.16
Nodes (23): BENEFITS, makeStyles(), Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, REQUIRE_FAMILY_TIER, REQUIRE_PARTNER_TIER (+15 more)

### Community 14 - "login.tsx"
Cohesion: 0.20
Nodes (9): C, COL_LEFT, COL_RIGHT, Login(), Method, styles, TILES, { width: SCREEN_W } (+1 more)

### Community 15 - "app/_layout.tsx"
Cohesion: 0.05
Nodes (64): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, makeStyles() (+56 more)

### Community 16 - "my-outfit.tsx"
Cohesion: 0.22
Nodes (9): makeStyles(), monthLabel(), MyOutfits(), STYLE_TAGS, weekdayLabels(), CreateOutfitView(), styles, Toggle() (+1 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-apple-authentication, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.21
Nodes (15): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+7 more)

### Community 19 - "wardrobe.tsx"
Cohesion: 0.16
Nodes (15): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, Wardrobe() (+7 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.17
Nodes (11): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Policy URL, Review Notes (klistra in i "Notes"), Sign-In krävs (+3 more)

### Community 21 - "PersonSwitcher.tsx"
Cohesion: 0.16
Nodes (27): AddGarment(), makeStyles(), GarmentDetail(), makeStyles(), makeStyles(), Partner(), PregnancyWardrobe(), COLD_LEVELS (+19 more)

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
Cohesion: 0.11
Nodes (20): COLOR_EMOJIS, ColorInsight, CTX_META, makeStyles(), MoodROI, MoodStat, PIE_PALETTE, PowerPiece (+12 more)

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
Nodes (30): Group, GROUPS, HowItWorks(), Item, makeStyles(), makeStyles(), WardrobeAnalysis(), makeStyles() (+22 more)

### Community 40 - "SignedImage.tsx"
Cohesion: 0.24
Nodes (9): makeStyles(), Props, SwapSheet(), Props, RESIZE_TO_FIT, ResizeMode, SignedImage(), ImageTransform (+1 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 46 - "pregnancy.ts"
Cohesion: 0.31
Nodes (7): dueInWeeks(), NOW, nursingPromptContext(), pregnancyPromptContext(), Trimester, trimesterFromDueDate(), trimesterLabel()

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
Cohesion: 0.25
Nodes (7): Essential, ESSENTIALS, makeStyles(), MG, NEWBORN, Wish, Person

### Community 138 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button(), Props, styles, Variant

### Community 139 - "CreateOutfitView.tsx"
Cohesion: 0.25
Nodes (7): CATEGORIES, COLORS, makeStyles(), Props, SEASONS, STYLE_TAGS, CATEGORIES

### Community 140 - "constants.ts"
Cohesion: 0.22
Nodes (12): buildPrompt(), config, handler(), SUBCATEGORY_HINT, langName(), COLOR_NAMES, isWashable(), MUSIC_GENRES (+4 more)

### Community 144 - "GarmentSetSection.tsx"
Cohesion: 0.35
Nodes (9): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), GarmentSet, setGarmentSet() (+1 more)

### Community 147 - "confirm-signup.html — "Confirm signup""
Cohesion: 0.40
Nodes (4): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mejlmallar (Supabase Auth), Språk (svenska/engelska)

### Community 148 - "waitlist-list.ts"
Cohesion: 0.67
Nodes (3): config, esc(), handler()

## Knowledge Gaps
- **367 isolated node(s):** `AuthedUser`, `hits`, `FREE_AI_PER_WEEK`, `LANG_NAMES`, `config` (+362 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `garment-detail.tsx` to `home.tsx`, `family.tsx`, `expo`, `useTheme`, `pregnancy-wardrobe.tsx`, `ArchiveView.tsx`, `entitlements.tsx`, `login.tsx`, `app/_layout.tsx`, `my-outfit.tsx`, `GarmentSetSection.tsx`, `wardrobe.tsx`, `PersonSwitcher.tsx`, `stats.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `garment-detail.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `AuthedUser`, `hits`, `FREE_AI_PER_WEEK` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07478991596638655 - nodes in this community are weakly interconnected._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08490566037735849 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.12043010752688173 - nodes in this community are weakly interconnected._