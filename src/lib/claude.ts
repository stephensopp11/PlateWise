import Anthropic from '@anthropic-ai/sdk'
import type { TasteProfile, DishScore, ScoreLabel } from '@/types'
import {
  DISH_PROFILES,
  CUISINE_SIGNALS,
  KEYWORD_SIGNALS,
  type FlavorAxis,
  type DishFlavorProfile,
} from '@/lib/dishProfiles'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AI === 'true'
const AI_MODEL = import.meta.env.VITE_AI_MODEL ?? 'claude-sonnet-4-6'
const MAX_ITEMS = 15

const client = USE_MOCK
  ? null
  : new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true,
    })

// ─── Menu Scoring ─────────────────────────────────────────────────────────────

interface RawMenuItem {
  name: string
  description?: string
  price?: number
}

const AXES: FlavorAxis[] = [
  'umami', 'richness', 'spice', 'bitter_char', 'bright_acid', 'sweet',
  'crispy', 'silky', 'chewy', 'creamy',
]

function neutral(): Record<FlavorAxis, number> {
  return { umami: 5, richness: 5, spice: 5, bitter_char: 5, bright_acid: 5, sweet: 5, crispy: 5, silky: 5, chewy: 5, creamy: 5 }
}

function clamp(v: number) { return Math.max(0, Math.min(10, v)) }

/** Fuzzy dish lookup: check if any known dish name is a substring of the input text */
function findDishProfile(text: string): DishFlavorProfile | null {
  // Prefer longer matches (more specific dish name wins)
  let best: DishFlavorProfile | null = null
  let bestLen = 0
  for (const [dish, profile] of Object.entries(DISH_PROFILES)) {
    if (text.includes(dish) && dish.length > bestLen) {
      best = profile
      bestLen = dish.length
    }
  }
  return best
}

/** Weighted signed correlation between dish and user profile */
function computeMatchScore(dish: Record<FlavorAxis, number>, user: TasteProfile): number {
  let totalContrib = 0
  let totalWeight = 0

  for (const axis of AXES) {
    const d = dish[axis]
    const u = user[axis] as number
    // Weight = how "expressive" either side is; neutral axes contribute near-zero
    const weight = Math.max(Math.abs(d - 5), Math.abs(u - 5)) / 5
    if (weight < 0.08) continue
    const normUser = (u - 5) / 5
    const normDish = (d - 5) / 5
    totalContrib += weight * normUser * normDish
    totalWeight += weight
  }

  if (totalWeight === 0) return 50
  // Raw range is roughly -1 to +1; map to 0-100
  return Math.max(0, Math.min(100, Math.round(((totalContrib / totalWeight) + 1) / 2 * 100)))
}

/** Build flavor tags from the effective dish profile */
function buildFlavorTags(dish: Record<FlavorAxis, number>, text: string): string[] {
  const tags: string[] = []
  if (dish.umami >= 7) tags.push('umami')
  if (dish.richness >= 7) tags.push('rich')
  if (dish.spice >= 7) tags.push('spicy')
  else if (dish.spice >= 4) tags.push('medium heat')
  if (dish.crispy >= 7) tags.push('crispy')
  if (dish.creamy >= 7) tags.push('creamy')
  if (dish.bright_acid >= 7) tags.push('bright')
  if (dish.sweet >= 7) tags.push('sweet')
  if (dish.bitter_char >= 7) tags.push('charred')
  if (dish.silky >= 7) tags.push('silky')
  if (dish.chewy >= 7) tags.push('chewy')
  if (tags.length === 0) {
    if (text.includes('salad') || text.includes('vegetable')) tags.push('fresh', 'light')
    else tags.push('savory', 'balanced')
  }
  return tags.slice(0, 5)
}

/** Build a human-readable explanation from the score and signals */
function buildExplanation(
  score: number,
  dish: Record<FlavorAxis, number>,
  user: TasteProfile,
  dishMatched: boolean,
): string {
  const highAxes = AXES
    .filter((ax) => {
      const d = dish[ax]
      const u = user[ax] as number
      return d >= 6.5 && u >= 6.5
    })
    .sort((a, b) => (dish[b] + (user[b] as number)) - (dish[a] + (user[a] as number)))

  const conflictAxes = AXES
    .filter((ax) => {
      const d = dish[ax]
      const u = user[ax] as number
      // Dish is strong on something user dislikes
      return d >= 7 && u <= 3
    })

  const axisNames: Record<FlavorAxis, string> = {
    umami: 'umami depth',
    richness: 'richness',
    spice: 'heat',
    bitter_char: 'charred/bitter notes',
    bright_acid: 'brightness',
    sweet: 'sweetness',
    crispy: 'crunch',
    silky: 'silky texture',
    chewy: 'chew',
    creamy: 'creaminess',
  }

  if (score >= 65 && highAxes.length > 0) {
    const top = highAxes.slice(0, 2).map((a) => axisNames[a]).join(' and ')
    return `Strong match on ${top} — aligns well with your taste profile.`
  }
  if (conflictAxes.length > 0) {
    const conflict = axisNames[conflictAxes[0]]
    return `High ${conflict} in this dish conflicts with your preferences — might not be your style.`
  }
  if (score >= 50) {
    return `Moderate match — some flavor elements align with your profile, worth a try.`
  }
  return `Flavor profile doesn't closely match your preferences, but tastes vary!`
}

/** Enhanced rule-based scorer: 3-signal approach (zero API cost) */
function enhancedScoreMenu(items: RawMenuItem[], profile: TasteProfile, cuisineType?: string): DishScore[] {
  const cuisineSignal = cuisineType ? (CUISINE_SIGNALS[cuisineType.toLowerCase()] ?? null) : null

  return items.slice(0, MAX_ITEMS).map((item, i) => {
    const text = `${item.name} ${item.description ?? ''}`.toLowerCase()

    // 1. Start with neutral profile
    const dish = neutral()

    // 2. Layer in dish dictionary match (strongest signal — replaces neutrals)
    const dictProfile = findDishProfile(text)
    const dishMatched = dictProfile !== null
    if (dictProfile) {
      for (const [ax, val] of Object.entries(dictProfile) as [FlavorAxis, number][]) {
        dish[ax] = val
      }
    }

    // 3. Apply cuisine signal as additive nudge (clamped)
    if (cuisineSignal) {
      for (const [ax, nudge] of Object.entries(cuisineSignal) as [FlavorAxis, number][]) {
        dish[ax] = clamp(dish[ax] + nudge)
      }
    }

    // 4. Apply keyword signals (fine-tuning)
    for (const [kw, { axes, nudge }] of Object.entries(KEYWORD_SIGNALS)) {
      if (text.includes(kw)) {
        for (const ax of axes) {
          dish[ax] = clamp(dish[ax] + nudge)
        }
      }
    }

    // 5. Compute match score
    const raw = computeMatchScore(dish, profile)

    // Practical range of the formula is ~30-80; remap thresholds accordingly
    const label: ScoreLabel =
      raw >= 65 ? 'Best Match' :
      raw >= 42 ? 'Unique Potential Love' :
      'Likely Not a Match'

    // Normalize to 0-100 display score (compress extremes slightly for UX)
    const score = Math.max(0, Math.min(100, Math.round((raw - 30) * (100 / 50))))

    return {
      menu_item_id: `rule-${i}`,
      name: item.name,
      description: item.description ?? null,
      score: Math.max(0, Math.min(100, score)),
      label,
      explanation: buildExplanation(raw, dish, profile, dishMatched),
      flavor_tags: buildFlavorTags(dish, text),
      spice_level: Math.round(dish.spice / 2),
      richness_level: Math.round(dish.richness / 2),
      price: item.price ?? null,
    }
  })
}

export async function scoreMenu(
  menuItems: RawMenuItem[],
  profile: TasteProfile,
  cuisineType?: string,
): Promise<DishScore[]> {
  const capped = menuItems.slice(0, MAX_ITEMS)

  if (USE_MOCK) return enhancedScoreMenu(capped, profile, cuisineType)

  const profileSummary = buildProfileSummary(profile)

  const prompt = `You are a culinary AI that scores restaurant dishes against a user's personal taste profile.

USER TASTE PROFILE:
${profileSummary}

MENU ITEMS TO SCORE:
${JSON.stringify(capped, null, 2)}

For each menu item, return a JSON array with one object per dish containing:
- name: string (exact dish name from input)
- score: number (0–100, how well it matches the user's profile)
- label: one of "Best Match" | "Unique Potential Love" | "Likely Not a Match"
  - Best Match: score >= 75
  - Unique Potential Love: score 50–74 (outside usual range but high upside)
  - Likely Not a Match: score < 50
- explanation: string (1–2 sentences explaining the score referencing the user's profile)
- flavor_tags: string[] (3–5 flavor descriptors for this dish, e.g. ["umami", "savory", "rich"])
- spice_level: number (0–5 estimate)
- richness_level: number (0–5 estimate)

Respond ONLY with the raw JSON array. No markdown, no explanation outside the JSON.`

  const message = await client!.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const parsed = JSON.parse(content.text) as Array<{
    name: string
    score: number
    label: ScoreLabel
    explanation: string
    flavor_tags: string[]
    spice_level: number
    richness_level: number
  }>

  return parsed.map((item, i) => ({
    menu_item_id: `temp-${i}`,
    name: item.name,
    description: capped[i]?.description ?? null,
    score: item.score,
    label: item.label,
    explanation: item.explanation,
    flavor_tags: item.flavor_tags,
    spice_level: item.spice_level,
    richness_level: item.richness_level,
    price: capped[i]?.price ?? null,
  }))
}

// ─── Recipe Generation ────────────────────────────────────────────────────────

export async function generateRecipe(
  dishName: string,
  profile: TasteProfile,
  servings = 2
): Promise<string> {
  if (USE_MOCK) {
    return `# ${dishName} (Mock Recipe)\n\n**Servings:** ${servings}\n\nThis is a mock recipe for development. Enable the real AI by setting \`VITE_USE_MOCK_AI=false\` and providing a valid \`VITE_ANTHROPIC_API_KEY\`.`
  }

  const prompt = `Generate a home recipe for "${dishName}" adapted for ${servings} servings.

The user's taste profile:
${buildProfileSummary(profile)}

Return a recipe with: ingredients list (scaled to ${servings} servings), step-by-step method, prep time, cook time, and difficulty (Easy/Medium/Hard). Format it clearly in markdown.`

  const message = await client!.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildProfileSummary(profile: TasteProfile): string {
  return `Flavor preferences (0=none, 10=loves):
- Umami: ${profile.umami}/10
- Richness: ${profile.richness}/10
- Spice: ${profile.spice}/10
- Bitter/Char: ${profile.bitter_char}/10
- Bright/Acid: ${profile.bright_acid}/10
- Sweet: ${profile.sweet}/10

Texture preferences (0=dislikes, 10=loves):
- Crispy: ${profile.crispy}/10
- Silky: ${profile.silky}/10
- Chewy: ${profile.chewy}/10
- Creamy: ${profile.creamy}/10`
}
