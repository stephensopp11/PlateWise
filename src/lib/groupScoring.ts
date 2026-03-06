import type { TasteProfile } from '@/types'
import type { CuisineFilter } from '@/lib/places'

const FLAVOR_AXES = ['umami', 'richness', 'spice', 'bitter_char', 'bright_acid', 'sweet'] as const
export type FlavorAxis = typeof FLAVOR_AXES[number]

export type GroupBlend = Record<FlavorAxis, number>

/**
 * Conservative blend: use the minimum score per axis so no member gets a
 * restaurant that strongly conflicts with their palate.
 */
export function blendGroupProfiles(profiles: TasteProfile[]): GroupBlend {
  const result = {} as GroupBlend
  for (const axis of FLAVOR_AXES) {
    result[axis] = Math.min(...profiles.map((p) => p[axis] as number))
  }
  return result
}

/**
 * Map a blended group profile to top cuisine suggestions for Places search.
 * Returns up to 3 cuisine types best matching the group's lowest common denominator.
 */
export function groupCuisineSuggestions(blend: GroupBlend): CuisineFilter[] {
  const picks: { cuisine: CuisineFilter; score: number }[] = [
    { cuisine: 'Japanese',      score: blend.umami * 1.4 + blend.richness * 0.6 },
    { cuisine: 'Korean',        score: blend.umami * 1.2 + blend.spice * 0.8 },
    { cuisine: 'Italian',       score: blend.richness * 1.4 + blend.umami * 0.6 },
    { cuisine: 'French',        score: blend.richness * 1.5 + blend.bitter_char * 0.5 },
    { cuisine: 'Thai',          score: blend.spice * 1.3 + blend.bright_acid * 0.7 },
    { cuisine: 'Indian',        score: blend.spice * 1.4 + blend.richness * 0.6 },
    { cuisine: 'Mexican',       score: blend.bright_acid * 1.2 + blend.spice * 0.8 },
    { cuisine: 'Mediterranean', score: blend.bright_acid * 1.3 + blend.umami * 0.7 },
    { cuisine: 'Chinese',       score: blend.umami * 1.1 + blend.richness * 0.9 },
    { cuisine: 'American',      score: blend.richness * 0.8 + blend.umami * 0.8 },
  ]
  return picks
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((p) => p.cuisine)
}

export const FLAVOR_AXIS_LABELS: Record<FlavorAxis, { label: string; emoji: string }> = {
  umami:      { label: 'Umami / Savory', emoji: '🍄' },
  richness:   { label: 'Richness',       emoji: '🧈' },
  spice:      { label: 'Spice',          emoji: '🌶️' },
  bitter_char:{ label: 'Bitter / Char',  emoji: '☕' },
  bright_acid:{ label: 'Bright / Acid',  emoji: '🍋' },
  sweet:      { label: 'Sweet',          emoji: '🍯' },
}
