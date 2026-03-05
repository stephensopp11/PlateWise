import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { QUIZ_QUESTIONS, calculateProfileFromAnswers } from '@/lib/quiz'

// Simple horizontal bar for the results screen
function FlavorBar({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  const pct = Math.round((value / 10) * 100)
  const intensity =
    value >= 7.5 ? 'text-primary font-bold' :
    value >= 5 ? 'text-foreground font-medium' :
    'text-muted-foreground'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className={intensity}>{emoji} {label}</span>
        <span className="text-xs text-muted-foreground">{value.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type AnswerMapType = Record<string, number>

export default function OnboardingPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(0) // 0 = welcome screen
  const [answers, setAnswers] = useState<AnswerMapType>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // 'results' = show profile results before going to dashboard
  const [viewingResults, setViewingResults] = useState(false)

  const totalQuestions = QUIZ_QUESTIONS.length
  const isWelcome = step === 0
  const questionIndex = step - 1
  const currentQuestion = QUIZ_QUESTIONS[questionIndex]
  const isLast = step === totalQuestions

  function handleOptionSelect(optionIndex: number) {
    const newAnswers = { ...answers, [currentQuestion.id]: optionIndex }
    setAnswers(newAnswers)
    if (step < totalQuestions) setStep(step + 1)
  }

  async function handleSaveAndShowResults() {
    if (!user) return
    setSaving(true)
    setError('')

    const profileScores = calculateProfileFromAnswers(answers)

    const { error } = await supabase
      .from('taste_profiles')
      .update({
        ...profileScores,
        quiz_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) {
      setError('Failed to save your profile. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setViewingResults(true)
  }

  const progressPct = step === 0 ? 0 : Math.round((step / totalQuestions) * 100)
  const profileScores = calculateProfileFromAnswers(answers)

  // ── Results screen ──────────────────────────────────────────────────────────
  if (viewingResults) {
    const flavorAxes = [
      { key: 'umami' as const,       label: 'Umami / Savory', emoji: '🍄' },
      { key: 'richness' as const,    label: 'Richness',        emoji: '🧈' },
      { key: 'spice' as const,       label: 'Spice',           emoji: '🌶️' },
      { key: 'bitter_char' as const, label: 'Bitter / Char',   emoji: '☕' },
      { key: 'bright_acid' as const, label: 'Bright / Acid',   emoji: '🍋' },
      { key: 'sweet' as const,       label: 'Sweet',           emoji: '🍯' },
    ]
    const textureAxes = [
      { key: 'crispy' as const, label: 'Crispy',  emoji: '🍟' },
      { key: 'silky' as const,  label: 'Silky',   emoji: '🍮' },
      { key: 'chewy' as const,  label: 'Chewy',   emoji: '🍝' },
      { key: 'creamy' as const, label: 'Creamy',  emoji: '🥑' },
    ]

    // Top 3 flavor strengths
    const top3 = [...flavorAxes]
      .sort((a, b) => profileScores[b.key] - profileScores[a.key])
      .slice(0, 3)

    return (
      <div className="min-h-screen px-4 py-8 max-w-sm mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">Your taste profile</h1>
          <p className="text-muted-foreground text-sm">
            Based on your answers, here's how we've mapped your palate.
          </p>
        </div>

        {/* Top strengths callout */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-primary">Your top flavors</p>
          <div className="flex flex-wrap gap-2">
            {top3.map(({ key, label, emoji }) => (
              <span key={key} className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                {emoji} {label} · {profileScores[key].toFixed(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Flavor axes */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Flavor preferences</p>
          {flavorAxes.map(({ key, label, emoji }) => (
            <FlavorBar key={key} label={label} emoji={emoji} value={profileScores[key]} />
          ))}
        </div>

        {/* Texture axes */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Texture preferences</p>
          {textureAxes.map(({ key, label, emoji }) => (
            <FlavorBar key={key} label={label} emoji={emoji} value={profileScores[key]} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Your profile improves with every meal you log.
        </p>

        {/* Hard redirect so ProtectedRoute re-fetches the updated profile */}
        <button
          onClick={() => { window.location.href = '/' }}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 transition"
        >
          Start exploring menus →
        </button>
      </div>
    )
  }

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (isWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="text-5xl">🍽️</div>
            <h1 className="text-3xl font-bold">Let's build your taste profile</h1>
            <p className="text-muted-foreground">
              20 quick questions to understand what you love — so we can score every
              menu against your palate.
            </p>
          </div>
          <div className="space-y-3 text-left bg-muted rounded-xl p-4 text-sm">
            <p className="font-medium">What we'll cover:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>🌶️ Flavor preferences (spice, richness, acidity)</li>
              <li>🍝 Texture affinities (crispy, creamy, chewy)</li>
              <li>🌍 Cuisine style and adventurousness</li>
              <li>☕ A few fun food personality questions</li>
            </ul>
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-lg hover:opacity-90 transition"
          >
            Let's go →
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            className="text-sm text-muted-foreground hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // ── Completion screen (save + show results) ─────────────────────────────────
  if (isLast) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold">All done!</h1>
            <p className="text-muted-foreground">
              Ready to see how your palate looks?
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            onClick={handleSaveAndShowResults}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'See my taste profile →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      {/* Progress bar */}
      <div className="space-y-2 mb-8">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {step} of {totalQuestions}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-xl font-bold leading-snug">{currentQuestion.question}</h2>
          {currentQuestion.subtext && (
            <p className="text-muted-foreground text-sm">{currentQuestion.subtext}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, i) => {
            const isSelected = answers[currentQuestion.id] === i
            return (
              <button
                key={i}
                onClick={() => handleOptionSelect(i)}
                className={`w-full text-left border-2 rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-sm">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition"
        >
          ← Back
        </button>
      )}
    </div>
  )
}
