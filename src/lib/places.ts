// ─── Places wrapper (Google Places API New) ───────────────────────────────────
// Set VITE_USE_MOCK_PLACES=true to use mock data (no API cost).
// Real searches go through the Supabase Edge Function (supabase/functions/places-search)
// which holds the Google API key server-side and enforces a monthly call limit.

const USE_MOCK      = import.meta.env.VITE_USE_MOCK_PLACES === 'true'
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export type PriceLevel = 1 | 2 | 3 | 4

export interface PlaceResult {
  id: string
  name: string
  cuisine: string       // primary cuisine/category label
  priceLevel: PriceLevel | null
  address: string
  neighborhood: string
  phoneNumber: string | null
  websiteUri: string | null
  lat: number | null
  lng: number | null
  rating: number | null       // Google rating 1.0–5.0
  reviewCount: number | null  // number of Google reviews
  // Experience attributes (may be null if Places API doesn't return them)
  servesVegetarianFood?: boolean | null
  outdoorSeating?: boolean | null
  reservable?: boolean | null
  goodForGroups?: boolean | null
  liveMusic?: boolean | null
}

// ── Filter types ──────────────────────────────────────────────────────────────

export type VibeFilter = 'Casual' | 'Formal' | 'Date Night'
export type CuisineFilter =
  | 'Italian' | 'Japanese' | 'Mexican' | 'American'
  | 'Thai' | 'Indian' | 'French' | 'Mediterranean'
  | 'Chinese' | 'Korean'
export type PriceFilter = 1 | 2 | 3
export type DietaryFilter = 'Vegetarian' | 'Vegan' | 'Gluten-Free'
export type ExperienceFilter = 'Outdoor Seating' | 'Reservable' | 'Good for Groups' | 'Live Music'

export interface PlacesQuery {
  query: string
  location?: string
  vibes?: VibeFilter[]
  cuisines?: CuisineFilter[]
  prices?: PriceFilter[]
  dietary?: DietaryFilter[]
  experiences?: ExperienceFilter[]
  minRating?: number
  userLat?: number | null
  userLng?: number | null
  radiusMiles?: number
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RESTAURANTS: PlaceResult[] = [
  { id: 'mock-1',  name: 'Ippudo Westside',  cuisine: 'Japanese',      priceLevel: 2, address: '321 W 51st St',    neighborhood: 'Midtown West', phoneNumber: null, websiteUri: null, lat: 40.7622, lng: -73.9900, rating: 4.4, reviewCount: 2841, servesVegetarianFood: true,  outdoorSeating: false, reservable: true,  goodForGroups: true,  liveMusic: false },
  { id: 'mock-2',  name: 'Nobu Downtown',    cuisine: 'Japanese',      priceLevel: 4, address: '195 Broadway',     neighborhood: 'FiDi',         phoneNumber: null, websiteUri: null, lat: 40.7103, lng: -74.0104, rating: 4.6, reviewCount: 5120, servesVegetarianFood: true,  outdoorSeating: false, reservable: true,  goodForGroups: false, liveMusic: false },
  { id: 'mock-3',  name: 'Maialino',         cuisine: 'Italian',       priceLevel: 3, address: '2 Lexington Ave',  neighborhood: 'Gramercy',     phoneNumber: null, websiteUri: null, lat: 40.7394, lng: -73.9827, rating: 4.5, reviewCount: 1893, servesVegetarianFood: true,  outdoorSeating: true,  reservable: true,  goodForGroups: true,  liveMusic: false },
  { id: 'mock-4',  name: 'Spice Market',     cuisine: 'Thai',          priceLevel: 2, address: '403 W 13th St',   neighborhood: 'Meatpacking',  phoneNumber: null, websiteUri: null, lat: 40.7404, lng: -74.0063, rating: 3.9, reviewCount:  742, servesVegetarianFood: true,  outdoorSeating: true,  reservable: false, goodForGroups: true,  liveMusic: true  },
  { id: 'mock-5',  name: 'Tacombi Nolita',   cuisine: 'Mexican',       priceLevel: 1, address: '267 Elizabeth St', neighborhood: 'Nolita',       phoneNumber: null, websiteUri: null, lat: 40.7237, lng: -73.9959, rating: 4.3, reviewCount: 3204, servesVegetarianFood: true,  outdoorSeating: true,  reservable: false, goodForGroups: true,  liveMusic: false },
  { id: 'mock-6',  name: 'The Spotted Pig',  cuisine: 'American',      priceLevel: 2, address: '314 W 11th St',   neighborhood: 'West Village', phoneNumber: null, websiteUri: null, lat: 40.7347, lng: -74.0077, rating: 3.2, reviewCount:  580, servesVegetarianFood: false, outdoorSeating: false, reservable: false, goodForGroups: false, liveMusic: true  },
  { id: 'mock-7',  name: 'Le Bernardin',     cuisine: 'French',        priceLevel: 4, address: '155 W 51st St',   neighborhood: 'Midtown',      phoneNumber: null, websiteUri: null, lat: 40.7622, lng: -73.9837, rating: 4.8, reviewCount: 4417, servesVegetarianFood: true,  outdoorSeating: false, reservable: true,  goodForGroups: false, liveMusic: false },
  { id: 'mock-8',  name: 'Indian Accent',    cuisine: 'Indian',        priceLevel: 3, address: '123 W 56th St',   neighborhood: 'Midtown',      phoneNumber: null, websiteUri: null, lat: 40.7636, lng: -73.9766, rating: 4.5, reviewCount: 1102, servesVegetarianFood: true,  outdoorSeating: false, reservable: true,  goodForGroups: true,  liveMusic: false },
  { id: 'mock-9',  name: 'Lilia',            cuisine: 'Italian',       priceLevel: 3, address: '567 Union Ave',   neighborhood: 'Williamsburg', phoneNumber: null, websiteUri: null, lat: 40.7128, lng: -73.9468, rating: 4.7, reviewCount: 6038, servesVegetarianFood: true,  outdoorSeating: true,  reservable: true,  goodForGroups: false, liveMusic: false },
  { id: 'mock-10', name: 'Han Dynasty',      cuisine: 'Chinese',       priceLevel: 1, address: '90 3rd Ave',      neighborhood: 'East Village', phoneNumber: null, websiteUri: null, lat: 40.7317, lng: -73.9887, rating: 4.1, reviewCount: 1455, servesVegetarianFood: true,  outdoorSeating: false, reservable: false, goodForGroups: true,  liveMusic: false },
  { id: 'mock-11', name: 'Atomix',           cuisine: 'Korean',        priceLevel: 4, address: '104 E 30th St',   neighborhood: 'NoMad',        phoneNumber: null, websiteUri: null, lat: 40.7443, lng: -73.9840, rating: 4.8, reviewCount:  923, servesVegetarianFood: false, outdoorSeating: false, reservable: true,  goodForGroups: false, liveMusic: false },
  { id: 'mock-12', name: 'Barbounia',        cuisine: 'Mediterranean', priceLevel: 2, address: '250 Park Ave S',  neighborhood: 'Flatiron',     phoneNumber: null, websiteUri: null, lat: 40.7389, lng: -73.9866, rating: 3.6, reviewCount:  388, servesVegetarianFood: true,  outdoorSeating: true,  reservable: true,  goodForGroups: true,  liveMusic: true  },
]

const EXPERIENCE_FIELD_MAP: Record<ExperienceFilter, keyof PlaceResult> = {
  'Outdoor Seating': 'outdoorSeating',
  'Reservable':      'reservable',
  'Good for Groups': 'goodForGroups',
  'Live Music':      'liveMusic',
}

const VIBE_PRICE_MAP: Record<VibeFilter, PriceLevel[]> = {
  'Casual':    [1, 2],
  'Formal':    [3, 4],
  'Date Night': [3, 4],
}

function mockSearch(q: PlacesQuery): PlaceResult[] {
  let results = [...MOCK_RESTAURANTS]

  // Text filter
  if (q.query.trim()) {
    const lower = q.query.toLowerCase()
    results = results.filter(
      (r) => r.name.toLowerCase().includes(lower) || r.cuisine.toLowerCase().includes(lower)
    )
  }

  // Cuisine filter
  if (q.cuisines && q.cuisines.length > 0) {
    results = results.filter((r) => q.cuisines!.includes(r.cuisine as CuisineFilter))
  }

  // Vibe → price level
  if (q.vibes && q.vibes.length > 0) {
    const allowedPrices = new Set(q.vibes.flatMap((v) => VIBE_PRICE_MAP[v]))
    results = results.filter((r) => r.priceLevel !== null && allowedPrices.has(r.priceLevel))
  }

  // Explicit price filter
  if (q.prices && q.prices.length > 0) {
    results = results.filter((r) => r.priceLevel !== null && q.prices!.includes(r.priceLevel as PriceFilter))
  }

  // Dietary filter (mock: use servesVegetarianFood for Vegetarian/Vegan)
  if (q.dietary && q.dietary.length > 0) {
    if (q.dietary.includes('Vegetarian') || q.dietary.includes('Vegan')) {
      results = results.filter((r) => r.servesVegetarianFood === true)
    }
    // Gluten-Free: no dedicated field in mock data — pass through (real API uses query augmentation)
  }

  // Experience filters
  if (q.experiences && q.experiences.length > 0) {
    for (const exp of q.experiences) {
      const field = EXPERIENCE_FIELD_MAP[exp]
      results = results.filter((r) => (r[field] as boolean | null | undefined) === true)
    }
  }

  return results
}

// ── Google Places API (New) via Supabase Edge Function ────────────────────────
// The edge function holds the API key and enforces the monthly call limit.
// To migrate to a different provider: update supabase/functions/places-search/index.ts

async function realSearch(q: PlacesQuery): Promise<PlaceResult[]> {
  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/places-search`

  const res = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({
      query: [q.query, ...(q.cuisines ?? []), ...(q.dietary ?? [])].filter(Boolean).join(' '),
      userLat: q.userLat,
      userLng: q.userLng,
      radiusMiles: q.radiusMiles,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Search error: ${res.status}`)
  }

  const data = await res.json() as { results: PlaceResult[] }
  const raw = data.results ?? []

  // Client-side post-filters
  let filtered = raw

  if (q.cuisines && q.cuisines.length > 0) {
    filtered = filtered.filter((r) =>
      q.cuisines!.some((c) => r.cuisine.toLowerCase().includes(c.toLowerCase()))
    )
  }

  if (q.prices && q.prices.length > 0) {
    filtered = filtered.filter(
      (r) => r.priceLevel !== null && q.prices!.includes(r.priceLevel as PriceFilter)
    )
  }

  if (q.vibes && q.vibes.length > 0) {
    const allowedPrices = new Set(q.vibes.flatMap((v) => VIBE_PRICE_MAP[v]))
    filtered = filtered.filter(
      (r) => r.priceLevel !== null && allowedPrices.has(r.priceLevel)
    )
  }

  return filtered
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchPlaces(query: PlacesQuery): Promise<PlaceResult[]> {
  if (USE_MOCK) return mockSearch(query)
  return realSearch(query)
}

export function priceLabel(level: PriceLevel | null): string {
  if (!level) return ''
  return '$'.repeat(level)
}

export function openTableUrl(restaurantName: string): string {
  return `https://www.opentable.com/s/?term=${encodeURIComponent(restaurantName)}&covers=2`
}
