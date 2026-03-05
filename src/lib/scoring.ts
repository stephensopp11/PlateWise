import type { TasteProfile, FlavorNotes } from '@/types'

// ─── Profile Update (weighted moving average) ─────────────────────────────────

/**
 * Update a taste profile after a new meal rating.
 * Uses a weighted moving average so recent ratings matter more as the profile matures.
 */
export function updateTasteProfile(
  profile: TasteProfile,
  rating: number, // 1–10
  flavorNotes: Partial<FlavorNotes>
): Partial<TasteProfile> {
  const weight = 1 / (profile.meal_count + 1)
  const clamp = (val: number) => Math.max(0, Math.min(10, val))

  // Strong delta for explicit flags, softer for general rating signal
  const flagDelta = weight * 0.8   // applied when a specific flag is set
  const softDelta = weight * 0.25  // gentle nudge from high/low rating alone

  const updates: Partial<TasteProfile> = {
    meal_count: profile.meal_count + 1,
  }

  // ── Richness ────────────────────────────────────────────────────────────────
  if (flavorNotes.too_rich)
    updates.richness = clamp(profile.richness - flagDelta)
  else if (flavorNotes.loved_richness)
    updates.richness = clamp(profile.richness + flagDelta)
  else if (rating >= 8)
    updates.richness = clamp(profile.richness + softDelta)

  // ── Spice ───────────────────────────────────────────────────────────────────
  if (flavorNotes.too_spicy)
    updates.spice = clamp(profile.spice - flagDelta)
  else if (flavorNotes.loved_spice)
    updates.spice = clamp(profile.spice + flagDelta)

  // ── Bright/Acid ─────────────────────────────────────────────────────────────
  if (flavorNotes.too_acidic)
    updates.bright_acid = clamp(profile.bright_acid - flagDelta)
  else if (flavorNotes.loved_acidity)
    updates.bright_acid = clamp(profile.bright_acid + flagDelta)

  // ── Umami ───────────────────────────────────────────────────────────────────
  if (flavorNotes.too_fishy_gamey || flavorNotes.missing_depth)
    updates.umami = clamp(profile.umami - flagDelta)
  else if (flavorNotes.loved_umami_depth)
    updates.umami = clamp(profile.umami + flagDelta)

  // ── Sweet ───────────────────────────────────────────────────────────────────
  if (flavorNotes.too_sweet)
    updates.sweet = clamp(profile.sweet - flagDelta)

  // ── Bitter/Char ─────────────────────────────────────────────────────────────
  if (flavorNotes.too_bitter)
    updates.bitter_char = clamp(profile.bitter_char - flagDelta)

  // ── Flavors clashed — small penalty across all axes (combination signal) ────
  if (flavorNotes.flavors_clashed) {
    const penalty = flagDelta * 0.3
    updates.umami = clamp((updates.umami ?? profile.umami) - penalty)
    updates.richness = clamp((updates.richness ?? profile.richness) - penalty)
    updates.bright_acid = clamp((updates.bright_acid ?? profile.bright_acid) - penalty)
    updates.spice = clamp((updates.spice ?? profile.spice) - penalty)
    updates.sweet = clamp((updates.sweet ?? profile.sweet) - penalty)
    updates.bitter_char = clamp((updates.bitter_char ?? profile.bitter_char) - penalty)
  }

  // ── Perfectly balanced / would order again — positive nudge to top axes ─────
  if (flavorNotes.perfectly_balanced || flavorNotes.would_order_again) {
    const boost = flagDelta * 0.4
    // Boost whichever axes are already highest (reinforce strengths)
    const axes = [
      { key: 'umami' as const, val: profile.umami },
      { key: 'richness' as const, val: profile.richness },
      { key: 'bright_acid' as const, val: profile.bright_acid },
      { key: 'spice' as const, val: profile.spice },
      { key: 'sweet' as const, val: profile.sweet },
      { key: 'bitter_char' as const, val: profile.bitter_char },
    ].sort((a, b) => b.val - a.val).slice(0, 3)

    for (const { key } of axes) {
      updates[key] = clamp((updates[key] ?? profile[key]) + boost)
    }
  }

  // Execution flags (overcooked, undercooked, wrong_temperature, poor_quality)
  // are stored in the DB but intentionally do NOT update the taste profile.

  return updates
}

// ─── Taste Twin Similarity ────────────────────────────────────────────────────

/**
 * Compute taste twin score (0–100) between two profiles using cosine similarity
 * over the six primary flavor axes.
 */
export function computeTasteTwinScore(a: TasteProfile, b: TasteProfile): number {
  const axes: (keyof TasteProfile)[] = [
    'umami',
    'richness',
    'spice',
    'bitter_char',
    'bright_acid',
    'sweet',
  ]

  const vecA = axes.map((k) => a[k] as number)
  const vecB = axes.map((k) => b[k] as number)

  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0)
  const magA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0))
  const magB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0))

  if (magA === 0 || magB === 0) return 0

  const cosine = dot / (magA * magB)
  return Math.round(cosine * 100)
}
