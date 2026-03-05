// ─── Taste Profile ───────────────────────────────────────────────────────────

export interface TasteProfile {
  id: string
  user_id: string
  // Flavor axes (0–10 scale)
  umami: number
  richness: number
  spice: number
  bitter_char: number
  bright_acid: number
  sweet: number
  // Texture affinities (0–10 scale)
  crispy: number
  silky: number
  chewy: number
  creamy: number
  // Meta
  quiz_completed: boolean
  meal_count: number
  updated_at: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  display_name: string
  avatar_url: string | null
  dietary_restrictions: string[] // e.g. ['gluten', 'nuts']
  dietary_preferences: string[] // e.g. ['vegetarian', 'low-carb']
  created_at: string
}

// ─── Restaurants & Menus ──────────────────────────────────────────────────────

export interface Restaurant {
  id: string
  name: string
  cuisine_type: string
  address: string | null
  compatibility_pct: number | null
}

export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  price: number | null
  spice_level: number | null // 0–5
  richness_level: number | null // 0–5
  cuisine_category: string | null
  flavor_tags: string[]
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export type ScoreLabel = 'Best Match' | 'Unique Potential Love' | 'Likely Not a Match'

export interface DishScore {
  menu_item_id: string
  name: string
  description: string | null
  score: number // 0–100
  label: ScoreLabel
  explanation: string
  flavor_tags: string[]
  spice_level: number | null
  richness_level: number | null
  price: number | null
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export interface Meal {
  id: string
  user_id: string
  name: string
  restaurant_name: string | null
  rating: number // 1–10
  notes: string | null
  photo_url: string | null
  flavor_notes: FlavorNotes | null
  privacy: 'public' | 'friends' | 'private'
  meal_date: string | null // YYYY-MM-DD, null for rows before migration
  created_at: string
}

export interface FlavorNotes {
  // ── Positive signals ──────────────────────────
  loved_richness: boolean
  loved_spice: boolean
  loved_acidity: boolean
  loved_umami_depth: boolean
  perfectly_balanced: boolean
  would_order_again: boolean

  // ── Negative flavor ───────────────────────────
  too_salty: boolean
  too_rich: boolean
  too_spicy: boolean
  too_bland: boolean
  too_acidic: boolean
  too_sweet: boolean
  too_fishy_gamey: boolean
  too_bitter: boolean
  flavors_clashed: boolean
  missing_depth: boolean

  // ── Execution issues (no profile update) ──────
  overcooked: boolean
  undercooked: boolean
  wrong_temperature: boolean
  poor_quality: boolean

  // ── Free text ─────────────────────────────────
  texture_notes: string | null
}

// ─── Social ───────────────────────────────────────────────────────────────────

export interface Friendship {
  id: string
  user_id_a: string
  user_id_b: string
  taste_twin_score: number // 0–100
  status: 'pending' | 'accepted'
}
