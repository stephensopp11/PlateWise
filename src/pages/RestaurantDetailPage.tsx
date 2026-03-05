import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { openTableUrl, priceLabel } from '@/lib/places'
import DishScoreCard from '@/components/DishScoreCard'
import type { DishScore, ScoreLabel } from '@/types'
import type { PlaceResult } from '@/lib/places'

const LABEL_ORDER: Record<ScoreLabel, number> = {
  'Best Match': 0,
  'Unique Potential Love': 1,
  'Likely Not a Match': 2,
}

interface ScoredDish extends DishScore {
  dish_name: string
}

export default function RestaurantDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const state = location.state as { place?: PlaceResult } | null
  const place = state?.place

  const restaurantName = place?.name ?? decodeURIComponent(slug ?? '')

  const [dishes, setDishes] = useState<DishScore[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !restaurantName) { setLoading(false); return }

    supabase
      .from('dish_scores')
      .select('score, label, explanation, menu_items(id, name, description, price, spice_level, richness_level, flavor_tags, restaurants(name))')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) { setLoading(false); return }

        const forThisRestaurant = data.filter((row) => {
          const mi = row.menu_items as { restaurants: { name: string } | null } | null
          return mi?.restaurants?.name?.toLowerCase() === restaurantName.toLowerCase()
        })

        const scored: DishScore[] = forThisRestaurant.map((row, i) => {
          const mi = row.menu_items as {
            id: string
            name: string
            description: string | null
            price: number | null
            spice_level: number | null
            richness_level: number | null
            flavor_tags: string[]
          } | null

          return {
            menu_item_id: mi?.id ?? `dish-${i}`,
            name: mi?.name ?? 'Unknown dish',
            description: mi?.description ?? null,
            score: row.score,
            label: row.label as ScoreLabel,
            explanation: row.explanation ?? '',
            flavor_tags: mi?.flavor_tags ?? [],
            spice_level: mi?.spice_level ?? null,
            richness_level: mi?.richness_level ?? null,
            price: mi?.price ?? null,
          }
        })

        scored.sort((a, b) => {
          const lo = LABEL_ORDER[a.label] - LABEL_ORDER[b.label]
          return lo !== 0 ? lo : b.score - a.score
        })

        setDishes(scored)
        setLoading(false)
      })
  }, [user, restaurantName])

  const best    = (dishes ?? []).filter((d) => d.label === 'Best Match')
  const unique  = (dishes ?? []).filter((d) => d.label === 'Unique Potential Love')
  const noMatch = (dishes ?? []).filter((d) => d.label === 'Likely Not a Match')

  const avgScore = dishes && dishes.length > 0
    ? Math.round(dishes.reduce((s, d) => s + d.score, 0) / dishes.length)
    : null

  const compatColor =
    avgScore === null ? '' :
    avgScore >= 75 ? 'text-green-600' :
    avgScore >= 50 ? 'text-amber-500' :
    'text-red-500'

  const compatBg =
    avgScore === null ? '' :
    avgScore >= 75 ? 'bg-green-50 border-green-200 text-green-800' :
    avgScore >= 50 ? 'bg-amber-50 border-amber-200 text-amber-800' :
    'bg-red-50 border-red-200 text-red-800'

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground hover:text-foreground transition"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{restaurantName}</h1>
            {place && (
              <p className="text-sm text-muted-foreground">
                {[place.cuisine, place.priceLevel ? priceLabel(place.priceLevel) : null, place.neighborhood]
                  .filter(Boolean).join(' · ')}
              </p>
            )}
            {place?.address && (
              <p className="text-xs text-muted-foreground">{place.address}</p>
            )}
          </div>
          {avgScore !== null && (
            <div className="text-right shrink-0">
              <p className={`text-2xl font-bold ${compatColor}`}>{avgScore}%</p>
              <p className="text-xs text-muted-foreground">menu match</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <a
            href={openTableUrl(restaurantName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-center hover:bg-muted transition"
          >
            🗓 Book a table
          </a>
          <button
            onClick={() => navigate('/scan', { state: { restaurantName } })}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            {dishes && dishes.length > 0 ? 'Re-scan menu' : 'Scan menu →'}
          </button>
        </div>
      </div>

      {/* Compatibility summary (if scanned) */}
      {avgScore !== null && dishes && dishes.length > 0 && (
        <div className={`border rounded-xl p-4 ${compatBg}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">{avgScore}% menu match</p>
            <p className="text-sm">{best.length} of {dishes.length} are a Best Match</p>
          </div>
          <div className="h-2 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-current rounded-full opacity-60"
              style={{ width: `${avgScore}%` }}
            />
          </div>
          {unique.length > 0 && (
            <p className="text-xs mt-2">{unique.length} dish{unique.length !== 1 ? 'es' : ''} worth stepping outside your comfort zone for</p>
          )}
        </div>
      )}

      {/* Phone / website */}
      {place && (place.phoneNumber || place.websiteUri) && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {place.phoneNumber && <span>📞 {place.phoneNumber}</span>}
          {place.websiteUri && (
            <a href={place.websiteUri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Website →
            </a>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-muted-foreground text-center py-6">Loading menu scores…</p>
      )}

      {/* Dishes */}
      {!loading && dishes !== null && dishes.length === 0 && (
        <div className="text-center py-10 space-y-3">
          <div className="text-4xl">🍽️</div>
          <p className="font-medium">No menu scored yet</p>
          <p className="text-sm text-muted-foreground">
            Scan the menu to see which dishes match your taste profile.
          </p>
        </div>
      )}

      {!loading && best.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm font-semibold text-green-700">✅ Best Matches ({best.length})</p>
          {best.map((d) => <DishScoreCard key={d.menu_item_id} dish={d} />)}
        </section>
      )}

      {!loading && unique.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm font-semibold text-amber-600">🌟 Unique Potential Love ({unique.length})</p>
          {unique.map((d) => <DishScoreCard key={d.menu_item_id} dish={d} />)}
        </section>
      )}

      {!loading && noMatch.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">❌ Likely Not a Match ({noMatch.length})</p>
          {noMatch.map((d) => <DishScoreCard key={d.menu_item_id} dish={d} />)}
        </section>
      )}
    </div>
  )
}
