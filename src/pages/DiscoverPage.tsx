import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { searchPlaces, priceLabel, openTableUrl } from '@/lib/places'
import type { PlaceResult, VibeFilter, CuisineFilter, PriceFilter, DietaryFilter } from '@/lib/places'
import RestaurantMap from '@/components/RestaurantMap'
import { useGeolocation } from '@/hooks/useGeolocation'
import { qualityAdjustedScore } from '@/lib/scoring'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_PLACES === 'true'

interface ScannedRestaurant {
  name: string
  avgMenuScore: number
  bestMatchCount: number
  totalItems: number
}

const VIBES: VibeFilter[] = ['Casual', 'Formal', 'Date Night']
const CUISINES: CuisineFilter[] = [
  'Italian', 'Japanese', 'Mexican', 'American',
  'Thai', 'Indian', 'French', 'Mediterranean', 'Chinese', 'Korean',
]
const PRICES: { label: string; value: PriceFilter }[] = [
  { label: '$', value: 1 },
  { label: '$$', value: 2 },
  { label: '$$$', value: 3 },
]
const DIETARY: DietaryFilter[] = ['Vegetarian', 'Vegan', 'Gluten-Free']

const SUGGESTIONS = [
  'Sushi', 'Tacos', 'Pizza', 'Burgers', 'Brunch',
  'Ramen', 'Steakhouse', 'Indian', 'Thai', 'Italian',
]

function FilterChip({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`shrink-0 border-2 rounded-full px-3 py-1 text-xs font-medium transition-all ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border hover:border-primary/40 text-muted-foreground'
      }`}
    >
      {label}
    </button>
  )
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  )
}

function RestaurantCard({
  place,
  scanned,
  onView,
}: {
  place: PlaceResult
  scanned?: ScannedRestaurant
  onView: () => void
}) {
  const compatColor =
    !scanned ? '' :
    scanned.avgMenuScore >= 75 ? 'text-green-600' :
    scanned.avgMenuScore >= 50 ? 'text-amber-500' :
    'text-red-500'

  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{place.name}</p>
            {scanned && (
              <span className="shrink-0 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                Menu scored
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {place.cuisine}
            {place.priceLevel ? ` · ${priceLabel(place.priceLevel)}` : ''}
            {place.neighborhood ? ` · ${place.neighborhood}` : ''}
            {place.rating != null
              ? ` · ⭐ ${place.rating.toFixed(1)}${place.reviewCount != null ? ` (${place.reviewCount >= 1000 ? `${Math.floor(place.reviewCount / 1000)}k+` : place.reviewCount})` : ''}`
              : ''}
          </p>
          {place.address && (
            <p className="text-xs text-muted-foreground truncate">{place.address}</p>
          )}
        </div>
        {scanned && (
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold ${compatColor}`}>{scanned.avgMenuScore}%</p>
            <p className={`text-xs ${compatColor}`}>match</p>
          </div>
        )}
      </div>

      {scanned && (
        <p className="text-xs text-muted-foreground">
          {scanned.bestMatchCount} of {scanned.totalItems} dishes are a Best Match
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition"
        >
          {scanned ? 'View menu scores' : 'Scan menu'}
        </button>
        <a
          href={openTableUrl(place.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 border rounded-lg py-2 text-sm font-medium text-center hover:bg-muted transition"
        >
          Book a table
        </a>
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Scanned restaurants from DB
  const [scannedMap, setScannedMap] = useState<Map<string, ScannedRestaurant>>(new Map())

  // Search state
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [activeVibes, setActiveVibes] = useState<Set<VibeFilter>>(new Set())
  const [activeCuisines, setActiveCuisines] = useState<Set<CuisineFilter>>(new Set())
  const [activePrices, setActivePrices] = useState<Set<PriceFilter>>(new Set())
  const [activeDietary, setActiveDietary] = useState<Set<DietaryFilter>>(new Set())
  const [activeExperiences] = useState(new Set<string>())
  const [minRating, setMinRating] = useState(0)

  const [searchResults, setSearchResults] = useState<PlaceResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [radiusMiles, setRadiusMiles] = useState(10)

  // Search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const geo = useGeolocation()

  // Load previously scanned restaurants
  useEffect(() => {
    if (!user) return
    supabase
      .from('dish_scores')
      .select('score, label, menu_items(name, restaurants(name))')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return
        const map = new Map<string, { scores: number[]; bestCount: number }>()
        for (const row of data) {
          const mi = row.menu_items as { name: string; restaurants: { name: string } | null } | null
          const rName = mi?.restaurants?.name
          if (!rName) continue
          const existing = map.get(rName)
          if (existing) {
            existing.scores.push(row.score)
            if (row.label === 'Best Match') existing.bestCount++
          } else {
            map.set(rName, { scores: [row.score], bestCount: row.label === 'Best Match' ? 1 : 0 })
          }
        }
        const result = new Map<string, ScannedRestaurant>()
        for (const [name, { scores, bestCount }] of map.entries()) {
          result.set(name.toLowerCase(), {
            name,
            avgMenuScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
            bestMatchCount: bestCount,
            totalItems: scores.length,
          })
        }
        setScannedMap(result)
      })
  }, [user])

  const toggleSet = useCallback(<T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }, [])

  async function handleSearch(e?: { preventDefault(): void }) {
    e?.preventDefault()
    setShowSuggestions(false)
    setSearching(true)
    setSearchError('')
    try {
      const results = await searchPlaces({
        query,
        location,
        vibes: [...activeVibes],
        cuisines: [...activeCuisines],
        prices: [...activePrices],
        dietary: [...activeDietary],
        experiences: [],
        userLat: geo.lat,
        userLng: geo.lng,
        radiusMiles: geo.status === 'granted' ? radiusMiles : undefined,
      })
      setSearchResults(results)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed. Please try again.')
    }
    setSearching(false)
  }

  // Auto-search when filters change (if a search has already been run)
  useEffect(() => {
    if (searchResults !== null) handleSearch()
  }, [activeVibes, activeCuisines, activePrices, activeDietary, activeExperiences, radiusMiles])

  function navigateToDetail(place: PlaceResult) {
    navigate(`/restaurants/${encodeURIComponent(place.name)}`, { state: { place } })
  }

  function selectSuggestion(s: string) {
    setQuery(s)
    setShowSuggestions(false)
    // Submit after state update
    setTimeout(() => {
      setSearching(true)
      setSearchError('')
      searchPlaces({
        query: s,
        location,
        vibes: [...activeVibes],
        cuisines: [...activeCuisines],
        prices: [...activePrices],
        dietary: [...activeDietary],
        experiences: [],
        userLat: geo.lat,
        userLng: geo.lng,
        radiusMiles: geo.status === 'granted' ? radiusMiles : undefined,
      }).then((results) => {
        setSearchResults(results)
        setSearching(false)
      }).catch((err: unknown) => {
        setSearchError(err instanceof Error ? err.message : 'Search failed. Please try again.')
        setSearching(false)
      })
    }, 0)
  }

  const scannedList = [...scannedMap.values()].sort(
    (a, b) => qualityAdjustedScore(b.avgMenuScore, null) - qualityAdjustedScore(a.avgMenuScore, null)
  )

  // Client-side rating filter applied at render time
  function applyFilters(results: PlaceResult[]): PlaceResult[] {
    if (minRating === 0) return results
    return results.filter((r) => r.rating === null || r.rating >= minRating)
  }

  // Active filter count for badge
  const activeFilterCount =
    activeVibes.size +
    activeCuisines.size +
    activePrices.size +
    activeDietary.size +
    activeExperiences.size +
    (minRating > 0 ? 1 : 0)

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-muted-foreground text-sm">Find restaurants that match your taste profile.</p>
      </div>

      {USE_MOCK && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Mock mode — showing sample NYC restaurants, not your real location.
        </div>
      )}

      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">

        {/* Search bar with suggestions */}
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cuisine, dish, or restaurant name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (!query) setShowSuggestions(true) }}
              onBlur={() => {
                suggestionTimeout.current = setTimeout(() => setShowSuggestions(false), 150)
              }}
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>

          {showSuggestions && (
            <div className="absolute z-10 top-full left-0 right-16 mt-1 bg-white border rounded-xl shadow-lg overflow-hidden">
              <p className="text-xs text-muted-foreground px-3 pt-2 pb-1 font-medium">Try searching for</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
                    if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current)
                    selectSuggestion(s)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location — "Near me" is the primary path */}
        {geo.status === 'granted' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-primary">My location</span>
              </div>
              <button
                type="button"
                onClick={geo.clear}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Change location
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Within {radiusMiles} mi
              </span>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={geo.status === 'requesting' || geo.status === 'unavailable'}
              onClick={geo.request}
              className="w-full flex items-center justify-center gap-2 border-2 border-primary/40 text-primary rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/5 disabled:opacity-40 transition"
              title={geo.status === 'unavailable' ? 'Geolocation not supported by your browser' : undefined}
            >
              {geo.status === 'requesting' ? '…' : '📍 Use my current location'}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or enter a location</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <input
              type="text"
              placeholder="City or neighborhood…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
        {geo.error && (
          <p className="text-xs text-destructive">{geo.error}</p>
        )}

        {/* Collapsible filters */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium border rounded-xl px-4 py-2 hover:bg-muted transition w-full justify-between"
        >
          <span>
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount} active` : ''}
          </span>
          <span className="text-muted-foreground">{filtersOpen ? '▲' : '▼'}</span>
        </button>

        {filtersOpen && (
          <div className="space-y-4 border rounded-xl p-4">
            <FilterSection label="Vibe">
              {VIBES.map((v) => (
                <FilterChip
                  key={v}
                  label={v}
                  active={activeVibes.has(v)}
                  onToggle={() => setActiveVibes(toggleSet(activeVibes, v))}
                />
              ))}
            </FilterSection>

            <FilterSection label="Cuisine">
              {CUISINES.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  active={activeCuisines.has(c)}
                  onToggle={() => setActiveCuisines(toggleSet(activeCuisines, c))}
                />
              ))}
            </FilterSection>

            <FilterSection label="Price">
              {PRICES.map(({ label, value }) => (
                <FilterChip
                  key={value}
                  label={label}
                  active={activePrices.has(value)}
                  onToggle={() => setActivePrices(toggleSet(activePrices, value))}
                />
              ))}
            </FilterSection>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Min Rating</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap w-14">
                  {minRating === 0 ? 'Any' : `⭐ ${minRating}+`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </div>
            </div>

            <FilterSection label="Dietary">
              {DIETARY.map((d) => (
                <FilterChip
                  key={d}
                  label={d}
                  active={activeDietary.has(d)}
                  onToggle={() => setActiveDietary(toggleSet(activeDietary, d))}
                />
              ))}
            </FilterSection>

            {/* Experience filters (Good for Groups, Outdoor Seating, etc.) are
                reserved for future Google Places migration — not in Foursquare free tier */}
          </div>
        )}

      </form>

      {searchError && <p className="text-destructive text-sm">{searchError}</p>}

      {/* Search results */}
      {searchResults !== null && (() => {
        const displayResults = applyFilters(searchResults)
        return (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {displayResults.length === 0
                  ? 'No restaurants found — try adjusting your filters'
                  : `${displayResults.length} restaurant${displayResults.length !== 1 ? 's' : ''} found`}
              </p>
              {displayResults.length > 0 && (
                <div className="flex border rounded-lg overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1.5 transition-colors ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    Map
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'map' ? (
              <RestaurantMap
                places={displayResults}
                scannedMap={scannedMap}
                onView={navigateToDetail}
                userLat={geo.lat}
                userLng={geo.lng}
              />
            ) : (
              displayResults.map((place) => (
                <RestaurantCard
                  key={place.id}
                  place={place}
                  scanned={scannedMap.get(place.name.toLowerCase())}
                  onView={() => navigateToDetail(place)}
                />
              ))
            )}
          </section>
        )
      })()}

      {/* Your previously scanned matches */}
      {scannedList.length > 0 && searchResults === null && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Your scored restaurants</p>
              <p className="text-xs text-muted-foreground">Menus you've scanned, ranked by fit.</p>
            </div>
            <div className="flex border rounded-lg overflow-hidden text-xs font-medium">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 transition-colors ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Map
              </button>
            </div>
          </div>

          {viewMode === 'map' ? (
            <RestaurantMap
              userLat={geo.lat}
              userLng={geo.lng}
              places={scannedList.map((r) => ({
                id: r.name,
                name: r.name,
                cuisine: '',
                priceLevel: null,
                address: '',
                neighborhood: '',
                phoneNumber: null,
                websiteUri: null,
                lat: null,
                lng: null,
                rating: null,
                reviewCount: null,
              }))}
              scannedMap={scannedMap}
              onView={(place) => navigate(`/restaurants/${encodeURIComponent(place.name)}`, { state: { place } })}
            />
          ) : (
            scannedList.map((r) => {
              const place: PlaceResult = {
                id: r.name,
                name: r.name,
                cuisine: '',
                priceLevel: null,
                address: '',
                neighborhood: '',
                phoneNumber: null,
                websiteUri: null,
                lat: null,
                lng: null,
                rating: null,
                reviewCount: null,
              }
              return (
                <RestaurantCard
                  key={r.name}
                  place={place}
                  scanned={r}
                  onView={() => navigate(`/restaurants/${encodeURIComponent(r.name)}`, { state: { place, scanned: r } })}
                />
              )
            })
          )}
        </section>
      )}

      {/* Empty state */}
      {scannedList.length === 0 && searchResults === null && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">🔍</div>
          <p className="font-medium">Search to find restaurants</p>
          <p className="text-muted-foreground text-sm">
            Search above, or scan a menu to start building your restaurant rankings.
          </p>
        </div>
      )}
    </div>
  )
}
