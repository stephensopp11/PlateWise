# PlateWise — Claude Code Context

## What This App Does
PlateWise is a taste-profile-driven restaurant and menu discovery app. Users complete a palate quiz, log meals, and get personalized restaurant and dish recommendations. Friends can compare taste profiles and plan group dining experiences together.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Maps**: pigeon-maps (lightweight, no API key)
- **Restaurant data**: Foursquare Places API v3 (free tier, 1,000 calls/day)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — optional, used for menu scoring and recipe generation
- **State**: React Query (server state), Zustand (client state), React hooks
- **Router**: react-router-dom v7

## Dev Commands
```bash
npm run dev      # start dev server at localhost:5173
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
```

## Environment Variables (`.env.local`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Restaurant discovery — Foursquare v3 (free, no billing required)
VITE_FOURSQUARE_API_KEY=...
VITE_USE_MOCK_PLACES=false        # true = 12 hardcoded NYC restaurants

# AI menu scoring — Anthropic (optional)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_USE_MOCK_AI=false            # true = rule-based scorer (zero API cost)
VITE_AI_MODEL=claude-sonnet-4-6   # model used when mock AI is off
```

**IMPORTANT**: After changing `.env.local`, restart the dev server (`Ctrl+C` then `npm run dev`). Reloading the browser tab alone does NOT pick up env var changes.

## Key Source Files

### Pages (`src/pages/`)
| File | Route | Purpose |
|------|-------|---------|
| `LoginPage.tsx` | `/login` | Auth |
| `SignupPage.tsx` | `/signup` | Auth |
| `OnboardingPage.tsx` | `/onboarding` | First-time setup |
| `DiscoverPage.tsx` | `/` | Main restaurant search with filters |
| `RestaurantDetailPage.tsx` | `/restaurants/:slug` | Detail + menu scan |
| `MenuScanPage.tsx` | `/scan` | Camera/upload menu → AI scoring |
| `RestaurantsPage.tsx` | `/restaurants` | Saved restaurants |
| `MealLogPage.tsx` | `/log` | Log a meal |
| `MealHistoryPage.tsx` | `/history` | Past meals |
| `FriendsPage.tsx` | `/friends` | Friend requests, Taste Twin scores, group creation |
| `GroupDiningPage.tsx` | `/groups/:id` | Group dining — blended profile + restaurant recs |
| `ProfilePage.tsx` | `/profile` | User profile + taste profile |

### Core Libraries (`src/lib/`)
| File | Purpose |
|------|---------|
| `claude.ts` | Menu scoring (enhanced rule-based or Claude API) + recipe generation |
| `dishProfiles.ts` | 450+ static dish flavor profiles, 20 cuisine signals, 120 keyword signals |
| `places.ts` | Foursquare v3 API wrapper + mock fallback + filter logic |
| `groupScoring.ts` | `blendGroupProfiles()` (min-per-axis), `groupCuisineSuggestions()`, `FLAVOR_AXIS_LABELS` |
| `scoring.ts` | `qualityAdjustedScore()` — adjusts restaurant compatibility from meal feedback |
| `palateQuiz.ts` | Quiz questions and profile calculation logic |
| `supabase.ts` | Supabase client singleton |

### Hooks (`src/hooks/`)
- `useAuth.ts` — Supabase session, user object
- `useTasteProfile.ts` — fetch/update TasteProfile for current user
- `useGeolocation.ts` — 5-state machine: idle → requesting → granted/denied/unavailable

### Types (`src/types/index.ts`)
Core interfaces: `TasteProfile`, `UserProfile`, `Restaurant`, `MenuItem`, `DishScore`, `Meal`, `FlavorNotes`, `Friendship`

### Flavor Axes (0–10 scale)
All 10 axes on `TasteProfile`: `umami`, `richness`, `spice`, `bitter_char`, `bright_acid`, `sweet`, `crispy`, `silky`, `chewy`, `creamy`

## Database (Supabase)

### Applied Migrations (in order)
1. `001_initial_schema.sql` — core tables
2. `002_menu_items_unique.sql` — unique constraint on menu items
3. `003_meal_date.sql` — adds `meal_date` column
4. `004_dining_groups.sql` — `dining_groups` + `dining_group_members` tables
5. `005_fix_dining_group_rls.sql` — fixes RLS infinite recursion with `security definer` helper functions

### Key Tables
- `user_profiles` — display name, dietary restrictions
- `taste_profiles` — 10 flavor axes + quiz_completed + meal_count
- `restaurants` — saved restaurants
- `menu_items` — dishes with flavor metadata
- `dish_scores` — cached AI scores per user+dish
- `meals` — meal log with ratings and FlavorNotes
- `friendships` — taste_twin_score (cosine similarity 0–100), status
- `dining_groups` + `dining_group_members` — group dining sessions

### RLS Note
`dining_groups` and `dining_group_members` had a recursive RLS policy bug (fixed in migration 005). Never add cross-table RLS policies between these two tables directly — use `security definer` functions instead.

## Menu Scoring Architecture

### Rule-Based Scorer (default, `VITE_USE_MOCK_AI=true` or no key)
Three signals applied in order:
1. **Dish dictionary** (`dishProfiles.ts`) — fuzzy name match against 450+ dishes; longest match wins
2. **Cuisine signal** — additive nudge per axis based on restaurant cuisine type
3. **Keyword scan** — ~120 ingredient/method/texture terms nudge relevant axes

Scoring: weighted signed correlation between normalized dish and user profile axes. Thresholds: ≥65 = Best Match, 42–64 = Unique Potential Love, <42 = Likely Not a Match.

### Claude API Scorer (when `VITE_USE_MOCK_AI=false` + key set)
Sends item list + profile summary to Claude, returns scored JSON. Same `DishScore[]` interface.

`scoreMenu(items, profile, cuisineType?)` — `cuisineType` is optional; pass it when known for better cuisine-signal application.

## Group Dining Flow
1. User creates group from accepted friends (FriendsPage)
2. Invited friends join via in-app invite banner (GroupDiningPage)
3. Joined members' taste profiles are blended: `Math.min()` per axis (conservative — no one gets something that conflicts with their palate)
4. `groupCuisineSuggestions()` scores 10 cuisines against blended profile → top 3 passed to `searchPlaces`
5. Google Places returns nearby restaurants matching those cuisines

## Google Places API Notes
- Architecture: browser → Supabase Edge Function (`supabase/functions/places-search/`) → Google Places API (New)
- API key (`GOOGLE_PLACES_API_KEY`) stored as a Supabase secret — never in the client bundle
- Endpoint inside edge function: `POST https://places.googleapis.com/v1/places:searchText`
- Field mask: `places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.priceLevel,places.rating,places.userRatingCount,places.internationalPhoneNumber,places.websiteUri`
- `priceLevel` returned as enum string (e.g. `PRICE_LEVEL_MODERATE`), mapped to 1–3 in the edge function
- Rating on 1.0–5.0 scale
- `goodForGroups`, `outdoorSeating`, `reservable`, `liveMusic` not requested — those fields return null
- Experience filter chips in DiscoverPage are hidden; filter state kept for future use
- Monthly call limit: 500 calls/month hardcoded in edge function (safeguard against runaway cost)
- Call counter stored in `api_usage` Supabase table (month TEXT primary key, call_count INT)
- Migration path: update `supabase/functions/places-search/index.ts` to change provider

## Path Aliases
`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`)
