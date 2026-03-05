import Anthropic from '@anthropic-ai/sdk'
import type { TasteProfile, DishScore, ScoreLabel } from '@/types'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// ─── Menu Scoring ─────────────────────────────────────────────────────────────

interface RawMenuItem {
  name: string
  description?: string
  price?: number
}

export async function scoreMenu(
  menuItems: RawMenuItem[],
  profile: TasteProfile
): Promise<DishScore[]> {
  const profileSummary = buildProfileSummary(profile)

  const prompt = `You are a culinary AI that scores restaurant dishes against a user's personal taste profile.

USER TASTE PROFILE:
${profileSummary}

MENU ITEMS TO SCORE:
${JSON.stringify(menuItems, null, 2)}

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

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
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
    description: menuItems[i]?.description ?? null,
    score: item.score,
    label: item.label,
    explanation: item.explanation,
    flavor_tags: item.flavor_tags,
    spice_level: item.spice_level,
    richness_level: item.richness_level,
    price: menuItems[i]?.price ?? null,
  }))
}

// ─── Recipe Generation ────────────────────────────────────────────────────────

export async function generateRecipe(
  dishName: string,
  profile: TasteProfile,
  servings = 2
): Promise<string> {
  const prompt = `Generate a home recipe for "${dishName}" adapted for ${servings} servings.

The user's taste profile:
${buildProfileSummary(profile)}

Return a recipe with: ingredients list (scaled to ${servings} servings), step-by-step method, prep time, cook time, and difficulty (Easy/Medium/Hard). Format it clearly in markdown.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
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
