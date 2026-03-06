import type { TasteProfile } from '@/types'

type ProfileDimensions = Pick<
  TasteProfile,
  | 'umami' | 'richness' | 'spice' | 'bitter_char' | 'bright_acid' | 'sweet'
  | 'crispy' | 'silky' | 'chewy' | 'creamy'
>

// ─── Question types ───────────────────────────────────────────────────────────

export interface SliderQuestion {
  type: 'slider'
  id: string
  emoji: string
  text: string
  left: string
  right: string
}

export interface PillQuestion {
  type: 'pills'
  id: string
  emoji: string
  text: string
  options: string[]
}

export type PalateQuestion = SliderQuestion | PillQuestion

export interface PalateSection {
  number: string
  title: string
  desc: string
  questions: PalateQuestion[]
}

// ─── Quiz data ────────────────────────────────────────────────────────────────

export const PALATE_SECTIONS: PalateSection[] = [
  {
    number: '01',
    title: 'Core Taste Preferences',
    desc: 'How you respond to the five fundamental taste modalities forms the foundation of your palate.',
    questions: [
      { type: 'slider', id: 'sweet',  emoji: '🍯', text: 'How much do you enjoy intensely sweet foods — think glazed donuts, dessert wines, or very ripe tropical fruit?',         left: 'Not at all',       right: 'Love it' },
      { type: 'slider', id: 'bitter', emoji: '☕', text: 'How do you feel about bitter flavors — espresso, dark chocolate (85%+), radicchio, tonic water?',                        left: 'Avoid it',         right: 'Seek it out' },
      { type: 'slider', id: 'sour',   emoji: '🍋', text: 'How much do you enjoy sharp sour or acidic flavors — tamarind, vinegar dressings, very sour candy, fermented shrubs?',  left: 'Too sharp',        right: 'Bright & exciting' },
      { type: 'slider', id: 'umami',  emoji: '🍄', text: 'How much do you enjoy deep savory, meaty or umami-rich flavors — miso, aged parmesan, soy sauce, anchovy?',            left: 'Underwhelming',    right: 'Deeply satisfying' },
    ],
  },
  {
    number: '02',
    title: 'Intensity & Heat',
    desc: 'Intensity tolerance reveals whether you gravitate toward subtle nuance or bold sensory experiences.',
    questions: [
      { type: 'pills',  id: 'spice',         emoji: '🌶️', text: 'How much chili heat do you genuinely enjoy in food?',                                                                options: ['None at all', 'Mild warmth', 'Medium heat', 'The hotter the better'] },
      { type: 'slider', id: 'bold',           emoji: '🧄', text: 'How do you feel about very pungent, assertive ingredients — strong garlic, blue cheese, fish sauce, Worcestershire?', left: 'Overpowering',     right: 'Deeply appealing' },
      { type: 'slider', id: 'acid_intensity', emoji: '🍷', text: 'Think of a very acidic wine or a sharp vinaigrette. How do you feel about high-acid intensity in a dish?',            left: 'Too aggressive',   right: 'Love the zing' },
      { type: 'slider', id: 'richness',       emoji: '🧈', text: 'How do you feel about very rich, fatty, indulgent food — think duck confit, triple cream brie, buttery hollandaise?', left: 'Too heavy',        right: 'Absolutely love it' },
    ],
  },
  {
    number: '03',
    title: 'Texture & Mouthfeel',
    desc: 'Texture often determines food acceptance more than flavor. This reveals your physical food preferences.',
    questions: [
      { type: 'slider', id: 'crunch',              emoji: '🥐', text: 'How important is crunch or crispiness to your enjoyment of food?',                                                       left: "Doesn't matter",     right: 'Essential' },
      { type: 'slider', id: 'creamy',              emoji: '🍦', text: 'How much do you enjoy smooth, creamy, or silky textures — mousse, ramen broth, velvety sauces?',                        left: 'Too soft',            right: 'Pure pleasure' },
      { type: 'pills',  id: 'texture_sensitivity', emoji: '🫛', text: 'Are you sensitive to unexpected textures — soft things that should be firm, gritty things, or gelatinous foods?',       options: ['Very sensitive', 'Somewhat sensitive', 'Not really', 'Textures excite me'] },
      { type: 'slider', id: 'temp_contrast',       emoji: '🍨', text: 'How much do you enjoy hot-cold or crispy-soft contrasts in a single dish — like warm pie with cold ice cream?',         left: 'Prefer consistency',  right: 'Love the contrast' },
    ],
  },
  {
    number: '04',
    title: 'Adventurousness',
    desc: 'Your psychological relationship with novelty shapes how broadly your palate can grow.',
    questions: [
      { type: 'pills',  id: 'novelty',    emoji: '🗺️', text: "You're at a restaurant and you've never heard of any of the dishes. What do you do?",                                      options: ['Ask for something familiar', 'Pick the safest-sounding option', 'Pick something interesting', 'Order the most unfamiliar thing'] },
      { type: 'slider', id: 'fermented',  emoji: '🧀', text: 'How do you feel about strongly fermented or aged flavors — kimchi, blue cheese, natto, funky aged meats?',                  left: 'I avoid them',    right: 'I seek them out' },
      { type: 'pills',  id: 'reorder',    emoji: '🔄', text: 'At a restaurant you love, how often do you reorder the same dish vs. explore the menu?',                                    options: ['Always reorder favorites', 'Usually reorder', 'Sometimes explore', 'Always try something new'] },
      { type: 'slider', id: 'complexity', emoji: '🌿', text: 'I prefer dishes with complex, layered flavors over simple, clean preparations.',                                             left: 'Simple & clean',  right: 'Complex & layered' },
    ],
  },
  {
    number: '05',
    title: 'Signature Flavors',
    desc: 'Reactions to polarizing foods are among the most scientifically revealing signals of your palate.',
    questions: [
      { type: 'pills',  id: 'cilantro',   emoji: '🌿', text: 'How do you feel about cilantro?',                                                                                          options: ['Tastes like soap — avoid', "Don't mind it", 'Like it', 'Love it, add more'] },
      { type: 'slider', id: 'olives',     emoji: '🫒', text: 'How do you feel about olives?',                                                                                            left: 'Pick them out always', right: 'Would drink the brine' },
      { type: 'slider', id: 'licorice',   emoji: '⭐', text: 'How do you feel about licorice, anise, or fennel flavors?',                                                                left: 'Strongly dislike',     right: 'Really enjoy' },
      { type: 'pills',  id: 'umami_funk', emoji: '🦑', text: 'Dishes built on very funky umami — think dried shrimp paste, very aged cheese rinds, Korean doenjang. Your reaction?',    options: ['Strong no', 'Hesitant', 'Curious & open', 'Give me more'] },
    ],
  },
]

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const s = (raw: number) => raw / 10  // slider 0–100 → 0–10

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function clamp(v: number): number {
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10))
}

// ─── Profile computation ──────────────────────────────────────────────────────

export function computeProfileFromPalateQuiz(answers: Record<string, number>): ProfileDimensions {
  const get = (id: string, defaultVal = 50) => answers[id] ?? defaultVal

  const spiceMap       = [0, 3, 6, 10]
  const funkMap        = [0.5, 3, 7, 10]
  const cilantroMap    = [0, 4, 7, 10]
  const texSensMap     = [1, 3, 7, 10]  // sensitivity → chewy interest (inverse pattern)

  const spiceIdx  = get('spice', 1)
  const funkIdx   = get('umami_funk', 1)
  const cilIdx    = get('cilantro', 1)
  const texIdx    = get('texture_sensitivity', 2)

  return {
    umami:      clamp(avg([s(get('umami')), s(get('bold')) * 0.6, s(get('fermented')) * 0.7, s(get('olives')) * 0.5, (funkMap[funkIdx] ?? 3) * 0.8])),
    richness:   clamp(avg([s(get('richness')), s(get('creamy')) * 0.4])),
    spice:      clamp(spiceMap[spiceIdx] ?? 3),
    bitter_char: clamp(avg([s(get('bitter')), s(get('licorice')) * 0.7])),
    bright_acid: clamp(avg([s(get('sour')), s(get('acid_intensity')) * 0.7, (cilantroMap[cilIdx] ?? 5) * 0.5])),
    sweet:      clamp(s(get('sweet'))),
    crispy:     clamp(s(get('crunch'))),
    silky:      clamp(s(get('creamy'))),
    chewy:      clamp(avg([s(get('temp_contrast')) * 0.6, texSensMap[texIdx] ?? 7])),
    creamy:     clamp(avg([s(get('creamy')), s(get('richness')) * 0.4])),
  }
}

// ─── Archetype ────────────────────────────────────────────────────────────────

export interface CuisineAffinity {
  name: string
  level: 'high' | 'med' | 'low'
}

export interface Dimension {
  label: string
  value: number  // 0–100
  color: string
}

export interface Insight {
  icon: string
  label: string
  value: string
}

export interface Archetype {
  name: string
  icon: string
  description: string
  cuisines: CuisineAffinity[]
  dimensions: Dimension[]
  insights: Insight[]
}

export function computeArchetype(answers: Record<string, number>): Archetype {
  const get = (id: string, defaultVal = 50) => answers[id] ?? defaultVal

  const spiceMap   = [5, 30, 65, 100]
  const noveltyMap = [10, 35, 70, 100]
  const reorderMap = [10, 30, 70, 100]
  const funkMap    = [5, 30, 70, 100]
  const cilantroMap = [0, 40, 70, 100]

  const spiceScore    = spiceMap[get('spice', 1)]    ?? 30
  const noveltyScore  = noveltyMap[get('novelty', 1)] ?? 50
  const explorerScore = reorderMap[get('reorder', 1)] ?? 50
  const funkScore     = funkMap[get('umami_funk', 1)] ?? 30
  const cilantroScore = cilantroMap[get('cilantro', 1)] ?? 50

  const adventurousness  = avg([noveltyScore, explorerScore, get('fermented'), funkScore, cilantroScore])
  const boldness         = avg([spiceScore, get('bold'), get('bitter'), get('olives')])
  const sensorySeeking   = avg([get('complexity'), get('temp_contrast'), get('sour'), get('umami')])
  const textureAwareness = avg([get('crunch'), get('creamy'), get('temp_contrast')])
  const richnessPref     = avg([get('richness'), get('creamy'), get('umami')])

  const dimensions: Dimension[] = [
    { label: 'Adventurousness',       value: Math.round(adventurousness),  color: 'bg-primary' },
    { label: 'Boldness & Intensity',  value: Math.round(boldness),         color: 'bg-amber-500' },
    { label: 'Sensory Complexity',    value: Math.round(sensorySeeking),   color: 'bg-green-500' },
    { label: 'Texture Awareness',     value: Math.round(textureAwareness), color: 'bg-rose-400' },
    { label: 'Richness Preference',   value: Math.round(richnessPref),     color: 'bg-yellow-500' },
  ]

  const insights: Insight[] = [
    { icon: '🌶️', label: 'Heat tolerance',    value: spiceScore >= 65 ? 'High' : spiceScore >= 30 ? 'Medium' : 'Low' },
    { icon: '🧂', label: 'Flavor direction',  value: get('umami') > get('sweet') ? 'Savory-leaning' : 'Sweet-leaning' },
    { icon: '🥗', label: 'Texture style',     value: get('crunch') > get('creamy') ? 'Crispy & firm' : 'Smooth & silky' },
    { icon: '✈️', label: 'Cuisine range',     value: adventurousness >= 65 ? 'Wide' : adventurousness >= 45 ? 'Moderate' : 'Focused' },
  ]

  if (adventurousness >= 70 && boldness >= 60) {
    return {
      name: 'The Fearless Explorer',
      icon: '🌏',
      description: 'You live for bold, unfamiliar flavors and actively seek out sensory challenge. Your palate is broad, your curiosity is relentless, and you treat every meal as a passport stamp.',
      cuisines: [
        { name: 'Sichuan', level: 'high' }, { name: 'Ethiopian', level: 'high' }, { name: 'Korean', level: 'high' },
        { name: 'Thai', level: 'high' }, { name: 'Peruvian', level: 'med' }, { name: 'Moroccan', level: 'med' },
        { name: 'French', level: 'low' }, { name: 'American diner', level: 'low' },
      ],
      dimensions,
      insights,
    }
  }

  if (adventurousness >= 55 && sensorySeeking >= 60) {
    return {
      name: 'The Curious Connoisseur',
      icon: '🍷',
      description: "You're drawn to complexity and nuance over novelty for its own sake. You seek out quality, story, and layered experience in food — a natural food culture enthusiast.",
      cuisines: [
        { name: 'Italian (regional)', level: 'high' }, { name: 'Japanese', level: 'high' }, { name: 'French', level: 'high' },
        { name: 'Spanish', level: 'med' }, { name: 'Indian', level: 'med' }, { name: 'Mexican', level: 'med' },
        { name: 'Fast food', level: 'low' },
      ],
      dimensions,
      insights,
    }
  }

  if (boldness >= 70 && adventurousness < 55) {
    return {
      name: 'The Bold Traditionalist',
      icon: '🔥',
      description: 'You want intensity and satisfaction in familiar forms — big flavors, hearty portions, heat and richness. You know what you like and you like it loud.',
      cuisines: [
        { name: 'Mexican', level: 'high' }, { name: 'Indian', level: 'high' }, { name: 'BBQ', level: 'high' },
        { name: 'American', level: 'high' }, { name: 'Korean', level: 'med' }, { name: 'Thai', level: 'med' },
        { name: 'Japanese', level: 'low' }, { name: 'Scandinavian', level: 'low' },
      ],
      dimensions,
      insights,
    }
  }

  if (textureAwareness >= 65 && richnessPref >= 65) {
    return {
      name: 'The Pleasure Seeker',
      icon: '🧈',
      description: 'Comfort, richness, and satisfying mouthfeel are your north stars. You know the perfect texture of pasta, the right creaminess in a sauce, and the joy of food that genuinely nourishes.',
      cuisines: [
        { name: 'Italian', level: 'high' }, { name: 'French', level: 'high' }, { name: 'Japanese ramen', level: 'high' },
        { name: 'American', level: 'high' }, { name: 'Lebanese', level: 'med' }, { name: 'Thai', level: 'med' },
        { name: 'Raw vegan', level: 'low' },
      ],
      dimensions,
      insights,
    }
  }

  if (adventurousness < 40 && boldness < 45) {
    return {
      name: 'The Comfort Purist',
      icon: '🏡',
      description: 'Your palate is refined through comfort and familiarity. You know what you love, you\'re loyal to it, and you experience genuine joy in returning to the foods that feel like home.',
      cuisines: [
        { name: 'American', level: 'high' }, { name: 'Italian', level: 'high' }, { name: 'British', level: 'med' },
        { name: 'Chinese-American', level: 'med' }, { name: 'Mexican-American', level: 'med' },
        { name: 'Ethiopian', level: 'low' }, { name: 'Fermented/raw', level: 'low' },
      ],
      dimensions,
      insights,
    }
  }

  return {
    name: 'The Thoughtful Taster',
    icon: '🌿',
    description: 'Balanced, considered, and genuinely curious — you appreciate both restraint and boldness, and you make deliberate choices rather than habit-driven ones. A rare and refined profile.',
    cuisines: [
      { name: 'Japanese', level: 'high' }, { name: 'Mediterranean', level: 'high' }, { name: 'Vietnamese', level: 'high' },
      { name: 'Californian', level: 'med' }, { name: 'Indian', level: 'med' }, { name: 'Greek', level: 'med' },
      { name: 'Processed food', level: 'low' },
    ],
    dimensions,
    insights,
  }
}

// ─── Slider label helper ──────────────────────────────────────────────────────

export function sliderLabel(v: number): string {
  if (v <= 15) return 'Strongly dislike'
  if (v <= 35) return 'Not really'
  if (v <= 55) return 'Neutral'
  if (v <= 75) return 'Enjoy it'
  if (v <= 90) return 'Really enjoy'
  return 'Absolutely love'
}
