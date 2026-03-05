import Anthropic from '@anthropic-ai/sdk'
import type { TasteProfile, DishScore, ScoreLabel } from '@/types'

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

// Mock scorer: deterministic scores derived from profile math (zero API cost)
function mockScoreMenu(items: RawMenuItem[], profile: TasteProfile): DishScore[] {
  const keywords: Record<string, { axes: (keyof TasteProfile)[]; weight: number }> = {
    spicy:     { axes: ['spice'],       weight: 1.2 },
    spice:     { axes: ['spice'],       weight: 1.2 },
    rich:      { axes: ['richness'],    weight: 1.2 },
    creamy:    { axes: ['richness', 'creamy'], weight: 1.0 },
    umami:     { axes: ['umami'],       weight: 1.2 },
    savory:    { axes: ['umami'],       weight: 1.0 },
    crispy:    { axes: ['crispy'],      weight: 1.1 },
    fried:     { axes: ['crispy'],      weight: 1.0 },
    sweet:     { axes: ['sweet'],       weight: 1.1 },
    sour:      { axes: ['bright_acid'], weight: 1.1 },
    tangy:     { axes: ['bright_acid'], weight: 1.0 },
    bitter:    { axes: ['bitter_char'], weight: 1.0 },
    grilled:   { axes: ['bitter_char'], weight: 0.9 },
    silky:     { axes: ['silky'],       weight: 1.1 },
    chewy:     { axes: ['chewy'],       weight: 1.1 },
  }

  return items.slice(0, MAX_ITEMS).map((item, i) => {
    const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
    let score = 50

    for (const [kw, { axes, weight }] of Object.entries(keywords)) {
      if (text.includes(kw)) {
        const axisAvg = axes.reduce((s, ax) => s + (profile[ax] as number), 0) / axes.length
        score += (axisAvg - 5) * weight * 2
      }
    }

    // Small uniqueness variance so cards aren't identical
    score += ((i * 7) % 11) - 5

    score = Math.max(0, Math.min(100, Math.round(score)))

    const label: ScoreLabel =
      score >= 75 ? 'Best Match' :
      score >= 50 ? 'Unique Potential Love' :
      'Likely Not a Match'

    const tags: string[] = []
    if (text.includes('spic') || text.includes('pepper')) tags.push('spicy')
    if (text.includes('rich') || text.includes('cream')) tags.push('rich')
    if (text.includes('umami') || text.includes('savory') || text.includes('miso')) tags.push('umami')
    if (text.includes('crisp') || text.includes('frie')) tags.push('crispy')
    if (text.includes('sweet') || text.includes('caramel')) tags.push('sweet')
    if (tags.length === 0) tags.push('savory', 'balanced')

    return {
      menu_item_id: `mock-${i}`,
      name: item.name,
      description: item.description ?? null,
      score,
      label,
      explanation: `Mock score based on profile (umami ${profile.umami.toFixed(1)}, richness ${profile.richness.toFixed(1)}, spice ${profile.spice.toFixed(1)}).`,
      flavor_tags: tags,
      spice_level: text.includes('spic') ? 3 : text.includes('mild') ? 1 : 2,
      richness_level: text.includes('rich') || text.includes('cream') ? 4 : 2,
      price: item.price ?? null,
    }
  })
}

export async function scoreMenu(
  menuItems: RawMenuItem[],
  profile: TasteProfile
): Promise<DishScore[]> {
  const capped = menuItems.slice(0, MAX_ITEMS)

  if (USE_MOCK) return mockScoreMenu(capped, profile)

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
