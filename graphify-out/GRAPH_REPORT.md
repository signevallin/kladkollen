# Graph Report - kladkollen  (2026-08-30)

## Corpus Check
- 234 files · ~641,264 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1398 nodes · 3353 edges · 195 communities (109 shown, 86 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2763929b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- clip
- PersonSwitcher.tsx
- family.tsx
- expo
- dashboard.ts
- login.tsx
- scripts
- Skrud – Marknadsföringsplaybook
- pregnancy-wardrobe.tsx
- how-it-works.tsx
- models.ts
- @expo-google-fonts/poppins
- garment-detail.tsx
- entitlements.tsx
- my-outfit.tsx
- app/_layout.tsx
- OutfitShareCard.tsx
- dependencies
- send-notifications.ts
- SongCard.tsx
- 1. App Privacy ("nutrition label")
- home.tsx
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
- wardrobe.tsx
- ArchiveView.tsx
- useTheme
- people
- expo-font
- @expo-google-fonts/lora
- detect-garments.ts
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
- CreateOutfitView.tsx
- profiles
- expo-audio
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
- InsightsTab.tsx
- requireUser
- i18n.ts
- basics.ts
- parse-url.ts
- GarmentSetSection.tsx
- _utils.ts
- FamilyOutfits.tsx
- song-preview.ts
- useQuery.ts
- settings.tsx
- constants.ts
- onboarding.tsx
- SignedImage.tsx
- analyze-inspo-couple.ts
- SaleTab.tsx
- WishlistTab.tsx
- expo-apple-authentication

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 107 edges
2. `useSettings()` - 97 edges
3. `Theme` - 48 edges
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
- `Home()` --calls--> `useTheme()`  [EXTRACTED]
  app/(tabs)/home.tsx → theme/ThemeProvider.tsx
- `Home()` --calls--> `fetchSets()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/sets.ts
- `Home()` --calls--> `useSettings()`  [EXTRACTED]
  app/(tabs)/home.tsx → utils/settings.tsx

## Import Cycles
- None detected.

## Communities (195 total, 86 thin omitted)

### Community 0 - "clip"
Cohesion: 0.17
Nodes (25): config, config, handler(), handler(), config, handler(), slotOf(), config (+17 more)

### Community 1 - "PersonSwitcher.tsx"
Cohesion: 0.16
Nodes (27): AddGarment(), makeStyles(), GarmentDetail(), makeStyles(), makeStyles(), Profile(), THEME_OPTIONS, Home() (+19 more)

### Community 2 - "family.tsx"
Cohesion: 0.07
Nodes (62): config, daysSince(), handler(), MSG, sendBatch(), t(), today(), Family() (+54 more)

### Community 3 - "expo"
Cohesion: 0.04
Nodes (47): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+39 more)

### Community 4 - "dashboard.ts"
Cohesion: 0.16
Nodes (24): aiCosts(), anthropicCost(), Card, cardHtml(), config, esc(), get(), handler() (+16 more)

### Community 5 - "login.tsx"
Cohesion: 0.16
Nodes (12): COL_LEFT, COL_RIGHT, DARK, LIGHT, Login(), makeStyles(), Method, Palette (+4 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-expo, jest, devDependencies, eslint, eslint-config-expo, jest, ts-jest (+21 more)

### Community 7 - "Skrud – Marknadsföringsplaybook"
Cohesion: 0.08
Nodes (25): 10. Vad vi mäter (och varför), 11. Prioriterad att-göra-lista, 1. Positionering i en mening, 2.1 Sälj lugnet – inte AI:n, 2.2 Ta bort tröskeln – led med import, inte kameran, 2.3 En app för alla faser i livet, 2. Den strategiska kärnan (läs detta först), 3. Produkten i korthet (fakta att luta budskapet mot) (+17 more)

### Community 8 - "pregnancy-wardrobe.tsx"
Cohesion: 0.29
Nodes (7): Essential, ESSENTIALS, makeStyles(), MG, NEWBORN, PregnancyWardrobe(), Wish

### Community 9 - "how-it-works.tsx"
Cohesion: 0.40
Nodes (5): Group, GROUPS, HowItWorks(), Item, makeStyles()

### Community 10 - "models.ts"
Cohesion: 0.11
Nodes (20): CalendarEntry, Garment, GarmentInsert, GarmentUpdate, Outfit, Profile, ProfileUpdate, Trip (+12 more)

### Community 12 - "garment-detail.tsx"
Cohesion: 0.05
Nodes (87): FAMILY_STATUS_LABELS, FamilyStatus, GarmentDraft, SIZES, Pending, ImportedItem, NO_FAVICON, storeLogoUrl() (+79 more)

### Community 13 - "entitlements.tsx"
Cohesion: 0.12
Nodes (33): makeStyles(), Paywall(), TIERS, Ctx, EntitlementsCtx, EntitlementsProvider(), FREE_AI_PER_WEEK, FREE_TRIPS_PER_WEEK (+25 more)

### Community 14 - "my-outfit.tsx"
Cohesion: 0.13
Nodes (25): STYLE_TAGS, seasonalOrFull(), pool, sizeIndex(), CHILD_CONTEXTS, OUTFIT_CONTEXTS, ageMonths(), buildGroupedGarmentList() (+17 more)

### Community 15 - "app/_layout.tsx"
Cohesion: 0.06
Nodes (58): PUBLIC_ROUTES, RootLayout(), CATEGORIES, makeStyles(), NotificationsSettings(), pad(), TIME_PRESETS, styles (+50 more)

### Community 16 - "OutfitShareCard.tsx"
Cohesion: 0.36
Nodes (9): IMG_TRANSFORM, isSmall(), LOWER, OutfitShareCard(), rankOf(), roleOf(), SMALL_CATS, styles (+1 more)

### Community 17 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-calendar, expo-crypto, @expo/metro-runtime, expo-symbols, expo-web-browser, dependencies, expo (+5 more)

### Community 18 - "send-notifications.ts"
Cohesion: 0.18
Nodes (17): buildNotif(), chunk(), config, currentSeason(), daysSince(), describe(), Garment, getWeather() (+9 more)

### Community 19 - "SongCard.tsx"
Cohesion: 0.22
Nodes (9): AppleMusicBadge(), makeStyles(), openLink(), SongCard(), SongData, SpotifyFullLogo(), RawSong, resolveSong() (+1 more)

### Community 20 - "1. App Privacy ("nutrition label")"
Cohesion: 0.15
Nodes (12): 1. App Privacy ("nutrition label"), 2. App Review Information, 3. Checklista före inlämning, Data som samlas in, Data Used to Track You, Privacy Manifest (PrivacyInfo.xcprivacy), Privacy Policy URL, Review Notes (klistra in i "Notes") (+4 more)

### Community 21 - "home.tsx"
Cohesion: 0.23
Nodes (9): INTENSITY_LABELS, cacheClear(), store, buildWeatherContext(), childHeadwearRule(), DayForecast, headwearThreshold(), summarizeDayForecast() (+1 more)

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

### Community 40 - "wardrobe.tsx"
Cohesion: 0.17
Nodes (13): CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), SEASONS, SORT_LABEL, SORT_OPTIONS, AddGarmentChooser() (+5 more)

### Community 41 - "ArchiveView.tsx"
Cohesion: 0.20
Nodes (12): ArchiveView(), CATEGORIES, COLOR_ORDER, COLORS, makeStyles(), Props, SEASONS, SORT_LABEL (+4 more)

### Community 42 - "useTheme"
Cohesion: 0.11
Nodes (27): Index(), Wardrobe(), Button(), Props, styles, Variant, CapsuleView(), makeStyles() (+19 more)

### Community 43 - "people"
Cohesion: 0.22
Nodes (6): ensure_household(), people, my_household_person_ids(), person_outfit_calendar, auth.users, outfits

### Community 46 - "detect-garments.ts"
Cohesion: 0.13
Nodes (23): buildPrompt(), config, handler(), SUBCATEGORY_HINT, buildPrompt(), clampBox(), config, handler() (+15 more)

### Community 52 - "affiliate.ts"
Cohesion: 0.50
Nodes (3): affiliateConfigured, affiliateUrl(), NETWORK

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
Cohesion: 0.09
Nodes (22): ChildOutfit(), makeStyles(), ImportEmail(), makeStyles(), ImportPurchases(), makeStyles(), makeStyles(), Partner() (+14 more)

### Community 86 - "20260822_auto_laundry.sql"
Cohesion: 0.40
Nodes (5): settings, adjust_garment_wear(), reset_wears_on_wash(), profiles, trg_reset_wears_on_wash

### Community 88 - "outfit_likes"
Cohesion: 0.60
Nodes (4): outfit_likes, auth, outfits, toggle_outfit_like()

### Community 89 - "api_rate_limits"
Cohesion: 0.67
Nodes (3): api_rate_limits, bump_rate_limit(), auth

### Community 140 - "CreateOutfitView.tsx"
Cohesion: 0.29
Nodes (7): CATEGORIES, COLORS, CreateOutfitView(), makeStyles(), Props, SEASONS, STYLE_TAGS

### Community 147 - "reset-password.html — "Reset Password""
Cohesion: 0.22
Nodes (8): Att tänka på inför lansering, confirm-signup.html — "Confirm signup", Mallen är byggd från confirm-signup.html med flit, Mejlmallar (Supabase Auth), Redirect – måste vara https, inte app-schemat, reset-password.html — "Reset Password", Språk (svenska/engelska), Två påståenden i mallen som måste stämma med inställningarna

### Community 177 - "InsightsTab.tsx"
Cohesion: 0.33
Nodes (7): InsightsTab(), makeStyles(), Props, BuildArgs, buildInsights(), Insight, seasonOf()

### Community 178 - "requireUser"
Cohesion: 0.23
Nodes (16): config, handler(), listAllPaths(), config, handler(), isBlockedHost(), arrayBufferToBase64(), config (+8 more)

### Community 179 - "i18n.ts"
Cohesion: 0.19
Nodes (11): makeStyles(), Props, SaleAddModal(), Dict, en, enBySource, Lang, localeFor() (+3 more)

### Community 180 - "basics.ts"
Cohesion: 0.22
Nodes (10): BasicGender, basicImagePath(), BasicItem, basicsByCategory(), basicsFor(), COLOR_SLUG, colorSlug(), EXTRA_HEX (+2 more)

### Community 181 - "parse-url.ts"
Cohesion: 0.38
Nodes (9): absoluteUrl(), config, decodeEntities(), findProduct(), firstImage(), handler(), ldPrice(), meta() (+1 more)

### Community 182 - "GarmentSetSection.tsx"
Cohesion: 0.38
Nodes (8): GarmentSetSection(), makeStyles(), Props, createSet(), fetchSetMembers(), fetchSets(), setGarmentSet(), SetMember

### Community 183 - "_utils.ts"
Cohesion: 0.29
Nodes (6): AuthedUser, FREE_TRIPS_PER_WEEK, hits, isReasoningModel(), LANG_NAMES, rateLimited()

### Community 184 - "FamilyOutfits.tsx"
Cohesion: 0.21
Nodes (12): FamilyOutfits(), makeStyles(), Member, NO_WEATHER, dueInWeeks(), NOW, colorPalettePrompt(), loadGarments() (+4 more)

### Community 185 - "song-preview.ts"
Cohesion: 0.48
Nodes (6): CACHE, CacheEntry, cacheGet(), cacheSet(), config, handler()

### Community 186 - "useQuery.ts"
Cohesion: 0.33
Nodes (6): Locations(), makeStyles(), captureError(), Options, QueryResult, useQuery()

### Community 187 - "settings.tsx"
Cohesion: 0.23
Nodes (12): setApiLang(), LANGS, Ctx, CURRENCIES, CurrencyCode, detectDeviceLang(), FALLBACK_RATES, formatWithCurrency() (+4 more)

### Community 188 - "constants.ts"
Cohesion: 0.22
Nodes (11): GarmentPicker(), makeStyles(), Props, COLOR_HEX, isWashable(), MUSIC_GENRES, NO_LAUNDRY_CATEGORIES, STYLE_RULES (+3 more)

### Community 189 - "onboarding.tsx"
Cohesion: 0.40
Nodes (5): makeStyles(), Onboarding(), ONBOARDING_DONE_KEY, Slide, SLIDES

### Community 190 - "SignedImage.tsx"
Cohesion: 0.28
Nodes (7): makeStyles(), Props, SwapSheet(), Props, RESIZE_TO_FIT, ResizeMode, SignedImage()

### Community 191 - "analyze-inspo-couple.ts"
Cohesion: 0.60
Nodes (4): config, dedupeItems(), handler(), slotOf()

### Community 192 - "SaleTab.tsx"
Cohesion: 0.67
Nodes (3): makeStyles(), Props, SaleTab()

### Community 193 - "WishlistTab.tsx"
Cohesion: 0.67
Nodes (3): makeStyles(), Props, WishlistTab()

## Knowledge Gaps
- **434 isolated node(s):** `vercel`, `sorted`, `pool`, `AuthedUser`, `hits` (+429 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **86 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `garment-detail.tsx` to `SaleTab.tsx`, `PersonSwitcher.tsx`, `family.tsx`, `expo`, `WishlistTab.tsx`, `login.tsx`, `pregnancy-wardrobe.tsx`, `wardrobe.tsx`, `ArchiveView.tsx`, `entitlements.tsx`, `my-outfit.tsx`, `app/_layout.tsx`, `home.tsx`, `GarmentSetSection.tsx`, `FamilyOutfits.tsx`, `onboarding.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `garment-detail.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `vercel`, `sorted`, `pool` to the rest of the system?**
  _434 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `family.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06516105146242132 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Skrud – Marknadsföringsplaybook` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._