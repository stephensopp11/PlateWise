import type { TasteProfile } from '@/types'

// Subset of TasteProfile dimensions that the quiz can influence
type ProfileDimensions = Pick<
  TasteProfile,
  | 'umami'
  | 'richness'
  | 'spice'
  | 'bitter_char'
  | 'bright_acid'
  | 'sweet'
  | 'crispy'
  | 'silky'
  | 'chewy'
  | 'creamy'
>

export interface QuizOption {
  label: string
  emoji: string
  scores: Partial<ProfileDimensions>
}

export interface QuizQuestion {
  id: string
  question: string
  subtext?: string
  options: QuizOption[]
}

// ─── 20 Questions ─────────────────────────────────────────────────────────────

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'umami',
    question: 'How do you feel about deeply savory, umami-rich foods?',
    subtext: 'Think miso soup, parmesan, mushrooms, soy sauce.',
    options: [
      { label: "Not my thing", emoji: '😐', scores: { umami: 1 } },
      { label: "Like them fine", emoji: '🙂', scores: { umami: 4 } },
      { label: "Really enjoy them", emoji: '😋', scores: { umami: 7 } },
      { label: "Obsessed — the more the better", emoji: '🤤', scores: { umami: 10 } },
    ],
  },
  {
    id: 'richness',
    question: 'How do you feel about rich, indulgent dishes?',
    subtext: 'Think butter sauces, foie gras, fatty cuts of meat.',
    options: [
      { label: "Prefer lighter food", emoji: '🥗', scores: { richness: 1 } },
      { label: "Occasionally enjoy it", emoji: '🙂', scores: { richness: 4 } },
      { label: "Love a rich meal", emoji: '😋', scores: { richness: 7 } },
      { label: "The richer the better", emoji: '🧈', scores: { richness: 10 } },
    ],
  },
  {
    id: 'spice',
    question: "How much heat can you handle?",
    subtext: 'Be honest — your recommendations depend on it.',
    options: [
      { label: "No spice at all", emoji: '🥛', scores: { spice: 0 } },
      { label: "Mild — a little kick", emoji: '🌶️', scores: { spice: 3 } },
      { label: "Medium — I like it hot", emoji: '🔥', scores: { spice: 6 } },
      { label: "The spicier the better", emoji: '🥵', scores: { spice: 10 } },
    ],
  },
  {
    id: 'bitter_char',
    question: 'Do you enjoy bitter or charred flavors?',
    subtext: 'Think dark roast coffee, charred veggies, radicchio, burnt ends.',
    options: [
      { label: "Dislike bitter/char", emoji: '😬', scores: { bitter_char: 1 } },
      { label: "Tolerate it", emoji: '🙂', scores: { bitter_char: 3 } },
      { label: "Enjoy it", emoji: '😋', scores: { bitter_char: 6 } },
      { label: "Love the char", emoji: '🪵', scores: { bitter_char: 10 } },
    ],
  },
  {
    id: 'bright_acid',
    question: 'How much do you enjoy bright, acidic flavors?',
    subtext: 'Think fresh citrus, vinegar, pickles, ceviche.',
    options: [
      { label: "Too sharp for me", emoji: '😣', scores: { bright_acid: 1 } },
      { label: "Fine in small doses", emoji: '🙂', scores: { bright_acid: 4 } },
      { label: "Really enjoy the brightness", emoji: '🍋', scores: { bright_acid: 7 } },
      { label: "Love a punchy, acidic dish", emoji: '⚡', scores: { bright_acid: 10 } },
    ],
  },
  {
    id: 'sweet',
    question: 'How do you feel about sweetness in savory dishes?',
    subtext: 'Think teriyaki glaze, honey-roasted carrots, sweet BBQ sauce.',
    options: [
      { label: "Keep sweet out of savory", emoji: '🚫', scores: { sweet: 1 } },
      { label: "A little is fine", emoji: '🙂', scores: { sweet: 4 } },
      { label: "Enjoy that sweet-savory combo", emoji: '🍯', scores: { sweet: 7 } },
      { label: "Love sweet-forward savory dishes", emoji: '😍', scores: { sweet: 10 } },
    ],
  },
  {
    id: 'crispy',
    question: 'How important is crispy texture to you?',
    subtext: 'Fried chicken skin, crispy fries, crackling, toasted bread.',
    options: [
      { label: "Not a priority", emoji: '😐', scores: { crispy: 1 } },
      { label: "Nice when it's there", emoji: '🙂', scores: { crispy: 4 } },
      { label: "I seek out the crunch", emoji: '😋', scores: { crispy: 7 } },
      { label: "Crispy or bust", emoji: '🍟', scores: { crispy: 10 } },
    ],
  },
  {
    id: 'silky',
    question: 'Do you enjoy silky, smooth textures?',
    subtext: 'Silken tofu, bisque, smooth pâté, custard.',
    options: [
      { label: "Prefer more texture", emoji: '🙅', scores: { silky: 1 } },
      { label: "Enjoy occasionally", emoji: '🙂', scores: { silky: 4 } },
      { label: "Really enjoy silky dishes", emoji: '😋', scores: { silky: 7 } },
      { label: "Love a velvety, smooth dish", emoji: '🍮', scores: { silky: 10 } },
    ],
  },
  {
    id: 'chewy',
    question: 'How do you feel about chewy textures?',
    subtext: 'Al dente pasta, beef cheeks, mochi, dense bread.',
    options: [
      { label: "Prefer tender or soft", emoji: '🙅', scores: { chewy: 1 } },
      { label: "Fine with it", emoji: '🙂', scores: { chewy: 4 } },
      { label: "Enjoy a good chew", emoji: '😋', scores: { chewy: 7 } },
      { label: "Love the chewiness", emoji: '🍝', scores: { chewy: 10 } },
    ],
  },
  {
    id: 'creamy',
    question: 'How do you feel about creamy textures?',
    subtext: 'Risotto, hummus, avocado, cream-based sauces.',
    options: [
      { label: "Not a fan", emoji: '🙅', scores: { creamy: 1 } },
      { label: "Like it sometimes", emoji: '🙂', scores: { creamy: 4 } },
      { label: "Really enjoy creamy dishes", emoji: '😋', scores: { creamy: 7 } },
      { label: "Creamy is my love language", emoji: '🥑', scores: { creamy: 10 } },
    ],
  },
  {
    id: 'coffee',
    question: 'How do you take your coffee?',
    options: [
      { label: "I don't drink coffee", emoji: '🚫', scores: { bitter_char: 2, sweet: 3 } },
      { label: "Light with lots of sugar/milk", emoji: '🥛', scores: { sweet: 6, bitter_char: 2 } },
      { label: "Medium roast, a little milk", emoji: '☕', scores: { bitter_char: 5, sweet: 3 } },
      { label: "Black, dark roast", emoji: '🖤', scores: { bitter_char: 9, sweet: 1 } },
    ],
  },
  {
    id: 'pasta',
    question: "Pick your ideal pasta dish.",
    options: [
      { label: "Carbonara (rich, creamy, savory)", emoji: '🍝', scores: { richness: 8, umami: 7, creamy: 8 } },
      { label: "Aglio e olio (garlicky, olive oil)", emoji: '🧄', scores: { umami: 6, richness: 4 } },
      { label: "Puttanesca (briny, spicy, acidic)", emoji: '🫙', scores: { bright_acid: 7, spice: 5, umami: 6 } },
      { label: "Marinara (simple tomato sauce)", emoji: '🍅', scores: { bright_acid: 5, sweet: 4 } },
    ],
  },
  {
    id: 'pizza',
    question: "What's your go-to pizza?",
    options: [
      { label: "Classic Margherita", emoji: '🍕', scores: { bright_acid: 5, richness: 4, sweet: 3 } },
      { label: "Pepperoni with extra cheese", emoji: '🧀', scores: { umami: 8, richness: 7, creamy: 5 } },
      { label: "Spicy salami or chili oil", emoji: '🌶️', scores: { spice: 7, umami: 7, richness: 5 } },
      { label: "Prosciutto and arugula (fresh, light)", emoji: '🥬', scores: { bright_acid: 7, richness: 3, umami: 5 } },
    ],
  },
  {
    id: 'sushi',
    question: "How do you feel about raw fish (sushi, ceviche, tartare)?",
    options: [
      { label: "Not for me", emoji: '🙅', scores: { umami: 3, silky: 2 } },
      { label: "I'll eat it but don't seek it out", emoji: '🙂', scores: { umami: 5, silky: 4 } },
      { label: "I enjoy it", emoji: '🍣', scores: { umami: 7, silky: 6, bright_acid: 5 } },
      { label: "One of my favorite foods", emoji: '❤️', scores: { umami: 9, silky: 8, bright_acid: 6 } },
    ],
  },
  {
    id: 'steak',
    question: "How do you order your steak (or ideal protein)?",
    options: [
      { label: "Well done", emoji: '⬛', scores: { bitter_char: 5, richness: 4 } },
      { label: "Medium", emoji: '🟫', scores: { richness: 6, umami: 6 } },
      { label: "Medium-rare", emoji: '🥩', scores: { richness: 8, umami: 8, silky: 5 } },
      { label: "I don't eat red meat", emoji: '🌿', scores: { richness: 3, bright_acid: 6 } },
    ],
  },
  {
    id: 'salad',
    question: "Pick your ideal salad.",
    options: [
      { label: "Caesar (rich, creamy, umami)", emoji: '🥗', scores: { richness: 6, umami: 7, creamy: 6 } },
      { label: "Greek (bright, tangy, salty)", emoji: '🫒', scores: { bright_acid: 8, umami: 5 } },
      { label: "Warm grain salad (hearty, nutty)", emoji: '🌾', scores: { chewy: 7, umami: 5, richness: 4 } },
      { label: "Simple greens with vinaigrette", emoji: '🍃', scores: { bright_acid: 7, richness: 2 } },
    ],
  },
  {
    id: 'comfort',
    question: "What's your go-to comfort food?",
    options: [
      { label: "Mac & cheese or ramen", emoji: '🍜', scores: { creamy: 8, richness: 8, umami: 7 } },
      { label: "Pizza or fried chicken", emoji: '🍗', scores: { crispy: 8, richness: 6, umami: 6 } },
      { label: "Tacos or a loaded burrito", emoji: '🌮', scores: { spice: 6, bright_acid: 6, umami: 6 } },
      { label: "A big salad or grain bowl", emoji: '🥙', scores: { bright_acid: 6, richness: 3, chewy: 5 } },
    ],
  },
  {
    id: 'dessert',
    question: "Which dessert appeals to you most?",
    options: [
      { label: "Crème brûlée (rich, creamy, caramelized)", emoji: '🍮', scores: { sweet: 8, creamy: 9, bitter_char: 5 } },
      { label: "Dark chocolate tart (bittersweet)", emoji: '🍫', scores: { sweet: 6, bitter_char: 8, richness: 7 } },
      { label: "Lemon tart (bright, acidic)", emoji: '🍋', scores: { sweet: 5, bright_acid: 9 } },
      { label: "I skip dessert", emoji: '🚫', scores: { sweet: 2 } },
    ],
  },
  {
    id: 'adventure',
    question: "How adventurous are you with unfamiliar cuisines?",
    options: [
      { label: "I stick to what I know", emoji: '🏠', scores: { umami: 4, spice: 2 } },
      { label: "I'll try it if someone recommends it", emoji: '🤝', scores: { umami: 6, spice: 5 } },
      { label: "I actively seek out new cuisines", emoji: '🌍', scores: { umami: 8, spice: 7, bitter_char: 6, bright_acid: 7 } },
      { label: "The weirder the better", emoji: '🤩', scores: { umami: 9, spice: 8, bitter_char: 8, bright_acid: 8 } },
    ],
  },
  {
    id: 'drinks',
    question: "What's your preferred drink with a meal?",
    options: [
      { label: "Water or soft drink", emoji: '💧', scores: { sweet: 5 } },
      { label: "Beer (lager or IPA)", emoji: '🍺', scores: { bitter_char: 6, bright_acid: 4 } },
      { label: "Wine (red or white)", emoji: '🍷', scores: { bright_acid: 7, bitter_char: 5, richness: 5 } },
      { label: "Cocktail (sweet or sour)", emoji: '🍹', scores: { sweet: 7, bright_acid: 6 } },
    ],
  },
]

// ─── Score Calculation ────────────────────────────────────────────────────────

type AnswerMap = Record<string, number> // questionId → optionIndex

const DIMENSIONS: (keyof ProfileDimensions)[] = [
  'umami', 'richness', 'spice', 'bitter_char', 'bright_acid', 'sweet',
  'crispy', 'silky', 'chewy', 'creamy',
]

export function calculateProfileFromAnswers(answers: AnswerMap): ProfileDimensions {
  // Accumulate scores per dimension across all answers
  const totals: Record<string, number[]> = Object.fromEntries(
    DIMENSIONS.map((d) => [d, []])
  )

  for (const [questionId, optionIndex] of Object.entries(answers)) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId)
    if (!question) continue
    const option = question.options[optionIndex]
    if (!option) continue

    for (const [dim, val] of Object.entries(option.scores) as [keyof ProfileDimensions, number][]) {
      totals[dim].push(val)
    }
  }

  // Average each dimension; default to 5 if no data
  const result = {} as ProfileDimensions
  for (const dim of DIMENSIONS) {
    const vals = totals[dim]
    result[dim] = vals.length > 0
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : 5
  }

  return result
}
