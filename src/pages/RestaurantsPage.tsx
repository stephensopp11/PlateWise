import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface RestaurantSummary {
  name: string
  // From scanned menu (dish_scores → menu_items → restaurants)
  menuScored: boolean
  avgMenuScore: number | null   // 0–100
  bestMatchCount: number | null
  totalScoredItems: number | null
  // From meal history
  mealCount: number
  avgMealRating: number | null  // 1–10
  lastVisited: string | null
}

export default function RestaurantsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([loadScannedRestaurants(), loadVisitedRestaurants()])
      .then(([scanned, visited]) => {
        setRestaurants(mergeRestaurants(scanned, visited))
        setLoading(false)
      })
  }, [user])

  async function loadScannedRestaurants(): Promise<Map<string, Partial<RestaurantSummary>>> {
    // Query dish_scores → menu_items → restaurants for this user
    const { data } = await supabase
      .from('dish_scores')
      .select('score, label, menu_items(name, restaurants(name))')
      .eq('user_id', user!.id)

    if (!data) return new Map()

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

    const result = new Map<string, Partial<RestaurantSummary>>()
    for (const [name, { scores, bestCount }] of map.entries()) {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length
      result.set(name.toLowerCase(), {
        name,
        menuScored: true,
        avgMenuScore: Math.round(avg),
        bestMatchCount: bestCount,
        totalScoredItems: scores.length,
      })
    }
    return result
  }

  async function loadVisitedRestaurants(): Promise<Map<string, Partial<RestaurantSummary>>> {
    const { data } = await supabase
      .from('meals')
      .select('restaurant_name, rating, created_at')
      .eq('user_id', user!.id)
      .not('restaurant_name', 'is', null)
      .order('created_at', { ascending: false })

    if (!data) return new Map()

    const map = new Map<string, { name: string; ratings: number[]; lastVisited: string }>()
    for (const meal of data) {
      const name = meal.restaurant_name as string
      const key = name.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.ratings.push(meal.rating)
      } else {
        map.set(key, { name, ratings: [meal.rating], lastVisited: meal.created_at })
      }
    }

    const result = new Map<string, Partial<RestaurantSummary>>()
    for (const [key, { name, ratings, lastVisited }] of map.entries()) {
      result.set(key, {
        name,
        mealCount: ratings.length,
        avgMealRating: ratings.reduce((s, r) => s + r, 0) / ratings.length,
        lastVisited,
      })
    }
    return result
  }

  function mergeRestaurants(
    scanned: Map<string, Partial<RestaurantSummary>>,
    visited: Map<string, Partial<RestaurantSummary>>
  ): RestaurantSummary[] {
    const allKeys = new Set([...scanned.keys(), ...visited.keys()])
    const merged: RestaurantSummary[] = []

    for (const key of allKeys) {
      const s = scanned.get(key) ?? {}
      const v = visited.get(key) ?? {}
      merged.push({
        name: s.name ?? v.name ?? key,
        menuScored: s.menuScored ?? false,
        avgMenuScore: s.avgMenuScore ?? null,
        bestMatchCount: s.bestMatchCount ?? null,
        totalScoredItems: s.totalScoredItems ?? null,
        mealCount: v.mealCount ?? 0,
        avgMealRating: v.avgMealRating ?? null,
        lastVisited: v.lastVisited ?? null,
      })
    }

    // Sort: scanned (with real compatibility) first, then by score desc
    return merged.sort((a, b) => {
      if (a.menuScored && !b.menuScored) return -1
      if (!a.menuScored && b.menuScored) return 1
      const aScore = a.avgMenuScore ?? (a.avgMealRating ? a.avgMealRating * 10 : 0)
      const bScore = b.avgMenuScore ?? (b.avgMealRating ? b.avgMealRating * 10 : 0)
      return bScore - aScore
    })
  }

  const filtered = search.trim()
    ? restaurants.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : restaurants

  function compatInfo(r: RestaurantSummary): { pct: number; label: string; color: string; barColor: string } {
    if (r.menuScored && r.avgMenuScore !== null) {
      const pct = r.avgMenuScore
      return {
        pct,
        label: pct >= 75 ? 'Great fit' : pct >= 50 ? 'Good fit' : 'Mixed',
        color: pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500',
        barColor: pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400',
      }
    }
    // Fall back to meal rating proxy
    const pct = r.avgMealRating ? Math.round(r.avgMealRating * 10) : 0
    return {
      pct,
      label: pct >= 80 ? 'Great fit' : pct >= 60 ? 'Good fit' : 'Mixed',
      color: pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500',
      barColor: pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400',
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm text-center py-12">Loading restaurants…</div>
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <p className="text-muted-foreground text-sm">
          Places ranked by how well their menu fits your palate.
        </p>
      </div>

      {restaurants.length > 0 && (
        <input
          type="text"
          placeholder="Search restaurants…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}

      {filtered.length === 0 && restaurants.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">🏪</div>
          <p className="font-medium">No restaurants yet</p>
          <p className="text-muted-foreground text-sm">
            Scan a menu or log a meal with a restaurant name to see it ranked here.
          </p>
          <button
            onClick={() => navigate('/scan')}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Scan a menu →
          </button>
        </div>
      )}

      {filtered.length === 0 && restaurants.length > 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">No restaurants match "{search}"</p>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const { pct, label, color, barColor } = compatInfo(r)
          return (
            <div key={r.name} className="border rounded-xl p-4 bg-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{r.name}</p>
                    {r.menuScored && (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        Menu scored
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.menuScored && r.totalScoredItems !== null
                      ? `${r.bestMatchCount} of ${r.totalScoredItems} dishes are a Best Match`
                      : r.mealCount > 0
                      ? `${r.mealCount} meal${r.mealCount !== 1 ? 's' : ''} logged`
                      : ''}
                    {r.lastVisited && (
                      <> · Last visited {new Date(r.lastVisited).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold ${color}`}>{pct}%</p>
                  <p className={`text-xs ${color}`}>{label}</p>
                </div>
              </div>

              {/* Compatibility bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <button
                onClick={() => navigate('/scan', { state: { restaurantName: r.name } })}
                className="w-full border rounded-lg py-2 text-sm font-medium hover:bg-muted transition"
              >
                {r.menuScored ? 'Re-scan menu' : 'Score menu'} at {r.name} →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
