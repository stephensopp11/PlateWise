// ─── Google Places wrapper ────────────────────────────────────────────────────
// Set VITE_USE_MOCK_PLACES=true for dev (no API cost).
// Set VITE_GOOGLE_PLACES_KEY=<key> for production.
//
// NOTE: The Google Places API key is exposed in the browser bundle.
// Restrict it to your production domain in the Google Cloud Console.

const USE_MOCK = import.meta.env.VITE_USE_MOCK_PLACES === 'true'
const PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY ?? ''

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
}

// ── Filter types ──────────────────────────────────────────────────────────────

export type VibeFilter = 'Casual' | 'Formal' | 'Date Night'
export type CuisineFilter =
  | 'Italian' | 'Japanese' | 'Mexican' | 'American'
  | 'Thai' | 'Indian' | 'French' | 'Mediterranean'
  | 'Chinese' | 'Korean'
export type PriceFilter = 1 | 2 | 3

export interface PlacesQuery {
  query: string
  location?: string
  vibes?: VibeFilter[]
  cuisines?: CuisineFilter[]
  prices?: PriceFilter[]
  userLat?: number | null
  userLng?: number | null
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RESTAURANTS: PlaceResult[] = [
  { id: 'mock-1',  name: 'Ippudo Westside',  cuisine: 'Japanese',      priceLevel: 2, address: '321 W 51st St',    neighborhood: 'Midtown West', phoneNumber: null, websiteUri: null, lat: 40.7622, lng: -73.9900 },
  { id: 'mock-2',  name: 'Nobu Downtown',    cuisine: 'Japanese',      priceLevel: 4, address: '195 Broadway',     neighborhood: 'FiDi',         phoneNumber: null, websiteUri: null, lat: 40.7103, lng: -74.0104 },
  { id: 'mock-3',  name: 'Maialino',         cuisine: 'Italian',       priceLevel: 3, address: '2 Lexington Ave',  neighborhood: 'Gramercy',     phoneNumber: null, websiteUri: null, lat: 40.7394, lng: -73.9827 },
  { id: 'mock-4',  name: 'Spice Market',     cuisine: 'Thai',          priceLevel: 2, address: '403 W 13th St',   neighborhood: 'Meatpacking',  phoneNumber: null, websiteUri: null, lat: 40.7404, lng: -74.0063 },
  { id: 'mock-5',  name: 'Tacombi Nolita',   cuisine: 'Mexican',       priceLevel: 1, address: '267 Elizabeth St', neighborhood: 'Nolita',       phoneNumber: null, websiteUri: null, lat: 40.7237, lng: -73.9959 },
  { id: 'mock-6',  name: 'The Spotted Pig',  cuisine: 'American',      priceLevel: 2, address: '314 W 11th St',   neighborhood: 'West Village', phoneNumber: null, websiteUri: null, lat: 40.7347, lng: -74.0077 },
  { id: 'mock-7',  name: 'Le Bernardin',     cuisine: 'French',        priceLevel: 4, address: '155 W 51st St',   neighborhood: 'Midtown',      phoneNumber: null, websiteUri: null, lat: 40.7622, lng: -73.9837 },
  { id: 'mock-8',  name: 'Indian Accent',    cuisine: 'Indian',        priceLevel: 3, address: '123 W 56th St',   neighborhood: 'Midtown',      phoneNumber: null, websiteUri: null, lat: 40.7636, lng: -73.9766 },
  { id: 'mock-9',  name: 'Lilia',            cuisine: 'Italian',       priceLevel: 3, address: '567 Union Ave',   neighborhood: 'Williamsburg', phoneNumber: null, websiteUri: null, lat: 40.7128, lng: -73.9468 },
  { id: 'mock-10', name: 'Han Dynasty',      cuisine: 'Chinese',       priceLevel: 1, address: '90 3rd Ave',      neighborhood: 'East Village', phoneNumber: null, websiteUri: null, lat: 40.7317, lng: -73.9887 },
  { id: 'mock-11', name: 'Atomix',           cuisine: 'Korean',        priceLevel: 4, address: '104 E 30th St',   neighborhood: 'NoMad',        phoneNumber: null, websiteUri: null, lat: 40.7443, lng: -73.9840 },
  { id: 'mock-12', name: 'Barbounia',        cuisine: 'Mediterranean', priceLevel: 2, address: '250 Park Ave S',  neighborhood: 'Flatiron',     phoneNumber: null, websiteUri: null, lat: 40.7389, lng: -73.9866 },
]

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

  return results
}

// ── Real Google Places (New) API ──────────────────────────────────────────────

async function realSearch(q: PlacesQuery): Promise<PlaceResult[]> {
  const textQuery = [q.query, q.location].filter(Boolean).join(' near ')

  const body: Record<string, unknown> = {
    textQuery: textQuery || 'restaurants',
    includedType: 'restaurant',
    maxResultCount: 20,
  }

  if (q.userLat != null && q.userLng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: q.userLat, longitude: q.userLng },
        radius: 8000, // 8 km radius
      },
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.primaryTypeDisplayName,places.nationalPhoneNumber,places.websiteUri,places.addressComponents,places.location',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Places API error: ${res.status}`)

  const data = await res.json()
  const places = data.places ?? []

  return places.map((p: Record<string, unknown>) => {
    const display = p.displayName as { text: string } | undefined
    const priceMap: Record<string, PriceLevel> = {
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    }
    const rawPrice = p.priceLevel as string | undefined
    const typeDisplay = p.primaryTypeDisplayName as { text: string } | undefined

    // Extract neighborhood from address components
    const components = p.addressComponents as Array<{ longText: string; types: string[] }> | undefined
    const neighborhood = components?.find((c) => c.types.includes('neighborhood'))?.longText ?? ''

    const location = p.location as { latitude: number; longitude: number } | undefined

    return {
      id: p.id as string,
      name: display?.text ?? 'Unknown',
      cuisine: typeDisplay?.text ?? 'Restaurant',
      priceLevel: rawPrice ? (priceMap[rawPrice] ?? null) : null,
      address: p.formattedAddress as string ?? '',
      neighborhood,
      phoneNumber: p.nationalPhoneNumber as string | null ?? null,
      websiteUri: p.websiteUri as string | null ?? null,
      lat: location?.latitude ?? null,
      lng: location?.longitude ?? null,
    }
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchPlaces(query: PlacesQuery): Promise<PlaceResult[]> {
  if (USE_MOCK || !PLACES_KEY) return mockSearch(query)
  return realSearch(query)
}

export function priceLabel(level: PriceLevel | null): string {
  if (!level) return ''
  return '$'.repeat(level)
}

export function openTableUrl(restaurantName: string): string {
  return `https://www.opentable.com/s/?term=${encodeURIComponent(restaurantName)}&covers=2`
}
