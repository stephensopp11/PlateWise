import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Meal } from '@/types'

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? 'bg-green-100 text-green-800' :
    rating >= 5 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {rating}/10
    </span>
  )
}

export default function MealHistoryPage() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMeals(data ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return <div className="text-muted-foreground text-sm text-center py-12">Loading meals…</div>
  }

  if (meals.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <div className="text-4xl">🍽️</div>
        <p className="font-medium">No meals logged yet</p>
        <p className="text-muted-foreground text-sm">Start by logging a meal to build your taste profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meal history</h1>
      <div className="space-y-3">
        {meals.map((meal) => (
          <div key={meal.id} className="border rounded-xl p-4 bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{meal.name}</p>
                {meal.restaurant_name && (
                  <p className="text-sm text-muted-foreground">{meal.restaurant_name}</p>
                )}
              </div>
              <RatingBadge rating={meal.rating} />
            </div>

            {meal.notes && (
              <p className="text-sm text-muted-foreground">{meal.notes}</p>
            )}

            {meal.flavor_notes && (() => {
              const POSITIVE = new Set(['loved_richness','loved_spice','loved_acidity','loved_umami_depth','perfectly_balanced','would_order_again'])
              const EXECUTION = new Set(['overcooked','undercooked','wrong_temperature','poor_quality'])
              const LABELS: Record<string, string> = {
                loved_richness: '🧈 Loved richness', loved_spice: '🌶️ Loved spice',
                loved_acidity: '🍋 Loved acidity', loved_umami_depth: '🍄 Loved depth',
                perfectly_balanced: '✨ Perfectly balanced', would_order_again: '🔁 Would order again',
                too_salty: '🧂 Too salty', too_rich: '🥴 Too rich', too_spicy: '🔥 Too spicy',
                too_bland: '😶 Too bland', too_acidic: '😬 Too acidic', too_sweet: '🍬 Too sweet',
                too_fishy_gamey: '🐟 Too fishy/gamey', too_bitter: '☕ Too bitter',
                flavors_clashed: "💥 Flavors didn't go together", missing_depth: '🕳️ Missing depth',
                overcooked: '♨️ Overcooked', undercooked: '🩸 Undercooked',
                wrong_temperature: '🌡️ Wrong temp', poor_quality: '👎 Poor quality',
              }

              const active = Object.entries(meal.flavor_notes)
                .filter(([k, v]) => k !== 'texture_notes' && v === true)

              if (active.length === 0 && !meal.flavor_notes.texture_notes) return null

              return (
                <div className="flex flex-wrap gap-1">
                  {active.map(([key]) => {
                    const color = POSITIVE.has(key)
                      ? 'bg-green-50 text-green-800'
                      : EXECUTION.has(key)
                      ? 'bg-orange-50 text-orange-800'
                      : 'bg-red-50 text-red-800'
                    return (
                      <span key={key} className={`text-xs rounded-full px-2 py-0.5 ${color}`}>
                        {LABELS[key] ?? key.replace(/_/g, ' ')}
                      </span>
                    )
                  })}
                  {meal.flavor_notes.texture_notes && (
                    <span className="text-xs bg-muted rounded-full px-2 py-0.5">
                      {meal.flavor_notes.texture_notes}
                    </span>
                  )}
                </div>
              )
            })()}

            <p className="text-xs text-muted-foreground">
              {meal.meal_date
                ? new Date(`${meal.meal_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date(meal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
