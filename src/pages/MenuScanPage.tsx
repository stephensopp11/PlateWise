import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTasteProfile } from '@/hooks/useTasteProfile'
import { scoreMenu } from '@/lib/claude'
import DishScoreCard from '@/components/DishScoreCard'
import type { DishScore, ScoreLabel } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AI === 'true'

const LABEL_ORDER: Record<ScoreLabel, number> = {
  'Best Match': 0,
  'Unique Potential Love': 1,
  'Likely Not a Match': 2,
}

function sortScores(scores: DishScore[]): DishScore[] {
  return [...scores].sort((a, b) => {
    const lo = LABEL_ORDER[a.label] - LABEL_ORDER[b.label]
    return lo !== 0 ? lo : b.score - a.score
  })
}

interface DishEntry {
  id: number
  name: string
  description: string
  price: string
}

let nextId = 1
function newEntry(): DishEntry {
  return { id: nextId++, name: '', description: '', price: '' }
}

// ── Save scanned menu to DB (find/create restaurant → upsert menu_items → save dish_scores)
async function persistScanResults(
  restaurantName: string,
  userId: string,
  items: { name: string; description?: string; price?: number }[],
  scores: DishScore[]
): Promise<void> {
  // 1. Find or create restaurant
  let restaurantId: string

  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .ilike('name', restaurantName)
    .maybeSingle()

  if (existing) {
    restaurantId = existing.id
  } else {
    const { data: created, error } = await supabase
      .from('restaurants')
      .insert({ name: restaurantName })
      .select('id')
      .single()
    if (error || !created) return
    restaurantId = created.id
  }

  // 2. Upsert menu_items and collect their real UUIDs
  const menuRows = items.map((item, i) => ({
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description ?? null,
    price: item.price ?? null,
    spice_level: scores[i]?.spice_level ?? null,
    richness_level: scores[i]?.richness_level ?? null,
    flavor_tags: scores[i]?.flavor_tags ?? [],
  }))

  const { data: upsertedItems, error: itemError } = await supabase
    .from('menu_items')
    .upsert(menuRows, { onConflict: 'restaurant_id,name' })
    .select('id, name')

  if (itemError || !upsertedItems) return

  // Build name → UUID map
  const itemIdMap = new Map(upsertedItems.map((row) => [row.name, row.id]))

  // 3. Save dish_scores with real menu_item UUIDs
  const scoreRows = scores
    .map((s, i) => {
      const menuItemId = itemIdMap.get(items[i]?.name ?? '')
      if (!menuItemId) return null
      return {
        user_id: userId,
        menu_item_id: menuItemId,
        score: s.score,
        label: s.label,
        explanation: s.explanation,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (scoreRows.length > 0) {
    await supabase
      .from('dish_scores')
      .upsert(scoreRows, { onConflict: 'user_id,menu_item_id' })
  }
}

export default function MenuScanPage() {
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const location = useLocation()
  const prefill = (location.state as { restaurantName?: string } | null)?.restaurantName ?? ''

  const [restaurantName, setRestaurantName] = useState(prefill)
  const [dishes, setDishes] = useState<DishEntry[]>([newEntry()])
  const [results, setResults] = useState<DishScore[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  function updateDish(id: number, field: keyof Omit<DishEntry, 'id'>, value: string) {
    setDishes((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d))
  }

  function addDish() {
    setDishes((prev) => [...prev, newEntry()])
  }

  function removeDish(id: number) {
    setDishes((prev) => prev.length > 1 ? prev.filter((d) => d.id !== id) : prev)
  }

  function handleReset() {
    setResults(null)
    setDishes([newEntry()])
    setRestaurantName('')
    setError('')
  }

  async function handleScan(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!profile) return

    const items = dishes
      .filter((d) => d.name.trim().length > 0)
      .map((d) => ({
        name: d.name.trim(),
        description: d.description.trim() || undefined,
        price: d.price ? parseFloat(d.price) : undefined,
      }))

    if (items.length === 0) {
      setError('Add at least one dish name to score.')
      return
    }

    setScanning(true)
    setError('')
    setResults(null)

    try {
      const scores = await scoreMenu(items, profile)
      const sorted = sortScores(scores)

      // Persist to DB whenever a restaurant name is provided (mock or real mode)
      if (restaurantName.trim() && user) {
        persistScanResults(restaurantName.trim(), user.id, items, scores).catch(console.error)
      }

      setResults(sorted)
    } catch (err) {
      console.error(err)
      setError('Something went wrong while scoring. Please try again.')
    }

    setScanning(false)
  }

  // ── Results view ─────────────────────────────────────────────────────────────
  if (results) {
    const best    = results.filter((d) => d.label === 'Best Match')
    const unique  = results.filter((d) => d.label === 'Unique Potential Love')
    const noMatch = results.filter((d) => d.label === 'Likely Not a Match')

    const avgScore = Math.round(results.reduce((s, d) => s + d.score, 0) / results.length)
    const compatColor =
      avgScore >= 75 ? 'bg-green-50 border-green-200 text-green-800' :
      avgScore >= 50 ? 'bg-amber-50 border-amber-200 text-amber-800' :
      'bg-red-50 border-red-200 text-red-800'
    const compatLabel =
      avgScore >= 75 ? 'Great fit for your palate' :
      avgScore >= 50 ? 'Good fit with some misses' :
      'Mostly outside your profile'

    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Menu scored</h1>
            {restaurantName && (
              <p className="text-sm text-muted-foreground">{restaurantName}</p>
            )}
          </div>
          <button onClick={handleReset} className="text-sm text-primary hover:underline">
            Scan another →
          </button>
        </div>

        {/* Restaurant compatibility summary */}
        <div className={`border rounded-xl p-4 ${compatColor}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-lg">{avgScore}% menu match</p>
            <p className="text-sm font-medium">{compatLabel}</p>
          </div>
          <div className="h-2 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-current rounded-full transition-all opacity-60"
              style={{ width: `${avgScore}%` }}
            />
          </div>
          <p className="text-sm mt-2">
            You'd love <strong>{best.length}</strong> of {results.length} dishes here
            {unique.length > 0 && ` · ${unique.length} worth trying`}
          </p>
        </div>

        {USE_MOCK && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Mock mode — scores are estimates, not AI-generated.
          </div>
        )}

        {best.length > 0 && (
          <section className="space-y-3">
            <p className="text-sm font-semibold text-green-700">✅ Best Matches ({best.length})</p>
            {best.map((d) => <DishScoreCard key={d.menu_item_id} dish={d} />)}
          </section>
        )}
        {unique.length > 0 && (
          <section className="space-y-3">
            <p className="text-sm font-semibold text-amber-600">🌟 Unique Potential Love ({unique.length})</p>
            {unique.map((d) => <DishScoreCard key={d.menu_item_id} dish={d} />)}
          </section>
        )}
        {noMatch.length > 0 && (
          <section className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">❌ Likely Not a Match ({noMatch.length})</p>
            {noMatch.map((d) => <DishScoreCard key={d.menu_item_id} dish={d} />)}
          </section>
        )}
      </div>
    )
  }

  // ── Input view ───────────────────────────────────────────────────────────────
  const filledCount = dishes.filter((d) => d.name.trim().length > 0).length

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Score a Menu</h1>
        <p className="text-muted-foreground text-sm">
          Enter dishes and we'll rank each one against your taste profile.
        </p>
      </div>

      {USE_MOCK && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Mock mode active — no API calls will be made.
        </div>
      )}

      <form onSubmit={handleScan} className="space-y-5">
        {/* Restaurant name */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Restaurant <span className="text-muted-foreground font-normal">(optional — saves results for discovery)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Ippudo NYC"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Dish entries */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Dishes</label>
          {dishes.map((dish, index) => (
            <div key={dish.id} className="border rounded-xl p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Dish {index + 1}</span>
                {dishes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDish(dish.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Dish name *"
                value={dish.name}
                onChange={(e) => updateDish(dish.id, 'name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={dish.description}
                onChange={(e) => updateDish(dish.id, 'description', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                placeholder="Price (optional)"
                min="0"
                step="0.01"
                value={dish.price}
                onChange={(e) => updateDish(dish.id, 'price', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}

          {dishes.length < 15 && (
            <button
              type="button"
              onClick={addDish}
              className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
            >
              + Add another dish
            </button>
          )}
          {dishes.length >= 15 && (
            <p className="text-xs text-muted-foreground text-center">Maximum 15 dishes per scan</p>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <button
          type="submit"
          disabled={scanning || !profile || filledCount === 0}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {scanning ? 'Scoring…' : `Score ${filledCount > 0 ? filledCount : ''} dish${filledCount !== 1 ? 'es' : ''} →`}
        </button>

        {!profile && (
          <p className="text-xs text-muted-foreground text-center">
            Complete your taste profile to unlock menu scoring.
          </p>
        )}
      </form>
    </div>
  )
}
