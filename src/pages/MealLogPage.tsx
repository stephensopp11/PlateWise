import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTasteProfile } from '@/hooks/useTasteProfile'
import { updateTasteProfile } from '@/lib/scoring'
import type { FlavorNotes } from '@/types'

type Step = 'info' | 'flavor' | 'done'

interface MealInfo {
  name: string
  restaurant_name: string
  rating: number
  notes: string
  privacy: 'public' | 'friends' | 'private'
  meal_date: string
}

const DEFAULT_INFO: MealInfo = {
  name: '',
  restaurant_name: '',
  rating: 7,
  notes: '',
  privacy: 'friends',
  meal_date: new Date().toISOString().slice(0, 10),
}

const DEFAULT_FLAVOR: FlavorNotes = {
  loved_richness: false,
  loved_spice: false,
  loved_acidity: false,
  loved_umami_depth: false,
  perfectly_balanced: false,
  would_order_again: false,
  too_salty: false,
  too_rich: false,
  too_spicy: false,
  too_bland: false,
  too_acidic: false,
  too_sweet: false,
  too_fishy_gamey: false,
  too_bitter: false,
  flavors_clashed: false,
  missing_depth: false,
  overcooked: false,
  undercooked: false,
  wrong_temperature: false,
  poor_quality: false,
  texture_notes: null,
}

export default function MealLogPage() {
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('info')
  const [info, setInfo] = useState<MealInfo>(DEFAULT_INFO)
  const [flavor, setFlavor] = useState<FlavorNotes>(DEFAULT_FLAVOR)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Step 1: Basic Info ───────────────────────────────────────────────────────
  function handleInfoSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!info.name.trim()) return
    setStep('flavor')
  }

  // ── Step 2: Flavor Notes → Save ──────────────────────────────────────────────
  async function handleFlavorSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!user || !profile) return
    setSaving(true)
    setError('')

    // Insert meal
    const { error: mealError } = await supabase.from('meals').insert({
      user_id: user.id,
      name: info.name.trim(),
      restaurant_name: info.restaurant_name.trim() || null,
      rating: info.rating,
      notes: info.notes.trim() || null,
      flavor_notes: flavor,
      privacy: info.privacy,
      meal_date: info.meal_date,
    })

    if (mealError) {
      setError('Failed to save meal. Please try again.')
      setSaving(false)
      return
    }

    // Update taste profile
    const profileUpdates = updateTasteProfile(profile, info.rating, flavor)
    if (Object.keys(profileUpdates).length > 0) {
      await supabase
        .from('taste_profiles')
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    }

    setStep('done')
    setSaving(false)
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="text-5xl">✅</div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Meal logged!</h2>
          <p className="text-muted-foreground text-sm">
            Your taste profile has been updated.
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => { setInfo(DEFAULT_INFO); setFlavor(DEFAULT_FLAVOR); setStep('info') }}
            className="flex-1 border rounded-xl py-2 text-sm font-medium hover:bg-muted transition"
          >
            Log another
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Flavor Micro-Prompts ─────────────────────────────────────────────
  if (step === 'flavor') {
    type BooleanFlavorKey = { [K in keyof FlavorNotes]: FlavorNotes[K] extends boolean ? K : never }[keyof FlavorNotes]

    const positiveFlags: { key: BooleanFlavorKey; label: string; emoji: string }[] = [
      { key: 'would_order_again', label: 'Would order again', emoji: '🔁' },
      { key: 'perfectly_balanced', label: 'Perfectly balanced', emoji: '✨' },
      { key: 'loved_umami_depth', label: 'Loved the depth', emoji: '🍄' },
      { key: 'loved_richness', label: 'Loved the richness', emoji: '🧈' },
      { key: 'loved_spice', label: 'Loved the spice', emoji: '🌶️' },
      { key: 'loved_acidity', label: 'Loved the acidity', emoji: '🍋' },
    ]

    const negativeFlavorFlags: { key: BooleanFlavorKey; label: string; emoji: string }[] = [
      { key: 'flavors_clashed', label: "Flavors didn't go together", emoji: '💥' },
      { key: 'too_salty', label: 'Too salty', emoji: '🧂' },
      { key: 'too_rich', label: 'Too rich', emoji: '🥴' },
      { key: 'too_spicy', label: 'Too spicy', emoji: '🔥' },
      { key: 'too_acidic', label: 'Too acidic/tangy', emoji: '😬' },
      { key: 'too_sweet', label: 'Too sweet', emoji: '🍬' },
      { key: 'too_bland', label: 'Too bland', emoji: '😶' },
      { key: 'too_bitter', label: 'Too bitter', emoji: '☕' },
      { key: 'too_fishy_gamey', label: 'Too fishy/gamey', emoji: '🐟' },
      { key: 'missing_depth', label: 'Missing depth', emoji: '🕳️' },
    ]

    const executionFlags: { key: BooleanFlavorKey; label: string; emoji: string }[] = [
      { key: 'overcooked', label: 'Overcooked', emoji: '♨️' },
      { key: 'undercooked', label: 'Undercooked', emoji: '🩸' },
      { key: 'wrong_temperature', label: 'Wrong temperature', emoji: '🌡️' },
      { key: 'poor_quality', label: 'Poor quality ingredients', emoji: '👎' },
    ]

    function toggleFlag(key: BooleanFlavorKey) {
      setFlavor((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    function ChipGroup({ flags, activeColor }: {
      flags: { key: BooleanFlavorKey; label: string; emoji: string }[]
      activeColor: string
    }) {
      return (
        <div className="flex flex-wrap gap-2">
          {flags.map(({ key, label, emoji }) => {
            const isOn = !!flavor[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFlag(key)}
                className={`flex items-center gap-1.5 border-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  isOn ? activeColor : 'border-border hover:border-muted-foreground'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <div className="space-y-6 max-w-sm mx-auto">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Step 2 of 2</p>
          <h1 className="text-2xl font-bold">How was it?</h1>
          <p className="text-muted-foreground text-sm">
            Select everything that applies to <span className="font-medium text-foreground">{info.name}</span>.
          </p>
        </div>

        <form onSubmit={handleFlavorSubmit} className="space-y-6">
          {/* What worked */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-green-700">👍 What worked</p>
            <ChipGroup
              flags={positiveFlags}
              activeColor="border-green-500 bg-green-50 text-green-800"
            />
          </div>

          {/* What didn't */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">👎 What didn't work</p>
            <ChipGroup
              flags={negativeFlavorFlags}
              activeColor="border-red-400 bg-red-50 text-red-800"
            />
          </div>

          {/* Execution */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">⚙️ Execution issues</p>
            <p className="text-xs text-muted-foreground">These are restaurant notes and won't change your taste profile.</p>
            <ChipGroup
              flags={executionFlags}
              activeColor="border-orange-400 bg-orange-50 text-orange-800"
            />
          </div>

          {/* Texture notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Texture notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. perfectly crispy, too chewy, silky smooth…"
              value={flavor.texture_notes ?? ''}
              onChange={(e) => setFlavor((prev) => ({ ...prev, texture_notes: e.target.value || null }))}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('info')}
              className="flex-1 border rounded-xl py-2 text-sm font-medium hover:bg-muted transition"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : 'Save meal'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── Step 1: Basic Info ───────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-sm mx-auto">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Step 1 of 2</p>
        <h1 className="text-2xl font-bold">Log a meal</h1>
        <p className="text-muted-foreground text-sm">What did you eat?</p>
      </div>

      <form onSubmit={handleInfoSubmit} className="space-y-5">
        {/* Dish name */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Dish name *</label>
          <input
            type="text"
            placeholder="e.g. Tonkotsu Ramen"
            value={info.name}
            onChange={(e) => setInfo((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Restaurant */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Restaurant <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Ippudo NYC"
            value={info.restaurant_name}
            onChange={(e) => setInfo((prev) => ({ ...prev, restaurant_name: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Rating slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Rating</label>
            <span className="text-2xl font-bold text-primary">{info.rating}<span className="text-sm text-muted-foreground font-normal">/10</span></span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={info.rating}
            onChange={(e) => setInfo((prev) => ({ ...prev, rating: Number(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>😞 Terrible</span>
            <span>😐 OK</span>
            <span>🤤 Amazing</span>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Date <span className="text-muted-foreground font-normal">(defaults to today)</span>
          </label>
          <input
            type="date"
            value={info.meal_date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setInfo((prev) => ({ ...prev, meal_date: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            placeholder="Anything worth remembering about this meal…"
            value={info.notes}
            onChange={(e) => setInfo((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Privacy */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Visibility</label>
          <div className="flex gap-2">
            {(['friends', 'public', 'private'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setInfo((prev) => ({ ...prev, privacy: opt }))}
                className={`flex-1 border-2 rounded-xl py-2 text-xs font-medium capitalize transition-all ${
                  info.privacy === opt
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {opt === 'friends' ? '👥 Friends' : opt === 'public' ? '🌍 Public' : '🔒 Private'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 transition"
        >
          Next →
        </button>
      </form>
    </div>
  )
}
