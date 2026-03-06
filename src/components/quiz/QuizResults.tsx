import { useEffect, useRef } from 'react'
import type { Archetype } from '@/lib/palateQuiz'
import type { TasteProfile } from '@/types'

type ProfileDimensions = Pick<
  TasteProfile,
  'umami' | 'richness' | 'spice' | 'bitter_char' | 'bright_acid' | 'sweet' | 'crispy' | 'silky' | 'chewy' | 'creamy'
>

interface Props {
  archetype: Archetype
  profile: ProfileDimensions
  onContinue: () => void
}

const chipClass: Record<string, string> = {
  high: 'bg-primary/10 text-primary border border-primary/25',
  med:  'bg-green-100 text-green-700 border border-green-200',
  low:  'bg-muted text-muted-foreground border border-border',
}

export default function QuizResults({ archetype, profile, onContinue }: Props) {
  const barsRef = useRef<HTMLDivElement>(null)

  // Animate dimension bars on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      barsRef.current?.querySelectorAll<HTMLDivElement>('[data-target]').forEach((el) => {
        el.style.width = el.dataset.target + '%'
      })
    }, 200)
    return () => clearTimeout(timeout)
  }, [])

  const flavorAxes = [
    { label: 'Umami / Savory', emoji: '🍄', key: 'umami'       as const },
    { label: 'Richness',       emoji: '🧈', key: 'richness'    as const },
    { label: 'Spice',          emoji: '🌶️', key: 'spice'       as const },
    { label: 'Bitter / Char',  emoji: '☕', key: 'bitter_char' as const },
    { label: 'Bright / Acid',  emoji: '🍋', key: 'bright_acid' as const },
    { label: 'Sweet',          emoji: '🍯', key: 'sweet'       as const },
  ]

  const textureAxes = [
    { label: 'Crispy',  emoji: '🍟', key: 'crispy' as const },
    { label: 'Silky',   emoji: '🍮', key: 'silky'  as const },
    { label: 'Chewy',   emoji: '🍝', key: 'chewy'  as const },
    { label: 'Creamy',  emoji: '🥑', key: 'creamy' as const },
  ]

  const top3Flavor = [...flavorAxes]
    .sort((a, b) => profile[b.key] - profile[a.key])
    .slice(0, 3)

  return (
    <div className="min-h-screen px-4 py-10 max-w-lg mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <span className="inline-block bg-primary text-primary-foreground text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
          Your Palate Profile
        </span>
        <div className="text-6xl py-2">{archetype.icon}</div>
        <h1 className="text-3xl font-bold">{archetype.name}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {archetype.description}
        </p>
      </div>

      {/* Top flavors */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-primary">Your top flavors</p>
        <div className="flex flex-wrap gap-2">
          {top3Flavor.map(({ key, label, emoji }) => (
            <span key={key} className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
              {emoji} {label} · {profile[key].toFixed(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Archetype dimensions */}
      <div className="bg-card border rounded-xl p-5 space-y-4" ref={barsRef}>
        <p className="font-semibold text-sm">Your Flavor Dimensions</p>
        {archetype.dimensions.map((d) => (
          <div key={d.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{d.label}</span>
              <span className="text-muted-foreground">{d.value}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${d.color}`}
                style={{ width: '0%' }}
                data-target={d.value}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-2 gap-3">
        {archetype.insights.map((insight) => (
          <div key={insight.label} className="bg-card border rounded-xl p-4 space-y-1">
            <div className="text-xl">{insight.icon}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{insight.label}</p>
            <p className="font-semibold text-sm">{insight.value}</p>
          </div>
        ))}
      </div>

      {/* Flavor profile detail */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <p className="font-semibold text-sm">Detailed Flavor Profile</p>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Flavor</p>
          {flavorAxes.map(({ key, label, emoji }) => {
            const pct = Math.round((profile[key] / 10) * 100)
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{emoji} {label}</span>
                  <span className="text-muted-foreground">{profile[key].toFixed(1)}/10</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Texture</p>
          {textureAxes.map(({ key, label, emoji }) => {
            const pct = Math.round((profile[key] / 10) * 100)
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{emoji} {label}</span>
                  <span className="text-muted-foreground">{profile[key].toFixed(1)}/10</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cuisine affinities */}
      <div className="bg-card border rounded-xl p-5 space-y-3">
        <div>
          <p className="font-semibold text-sm">Cuisine Affinities</p>
          <p className="text-xs text-muted-foreground mt-0.5">Based on your palate profile, sorted by match strength</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {archetype.cuisines.map((c) => (
            <span key={c.name} className={`px-3 py-1.5 rounded-full text-xs font-medium ${chipClass[c.level]}`}>
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your profile improves with every meal you log.
      </p>

      <button
        onClick={onContinue}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 transition"
      >
        Start exploring →
      </button>
    </div>
  )
}
