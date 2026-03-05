import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { QUIZ_QUESTIONS, calculateProfileFromAnswers } from '@/lib/quiz'

type AnswerMap = Record<string, number>

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0 = welcome screen
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalQuestions = QUIZ_QUESTIONS.length
  const isWelcome = step === 0
  const questionIndex = step - 1
  const currentQuestion = QUIZ_QUESTIONS[questionIndex]
  const isLast = step === totalQuestions

  function handleOptionSelect(optionIndex: number) {
    const newAnswers = { ...answers, [currentQuestion.id]: optionIndex }
    setAnswers(newAnswers)

    if (step < totalQuestions) {
      setStep(step + 1)
    }
  }

  async function handleFinish() {
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

    navigate('/')
  }

  const progressPct = step === 0 ? 0 : Math.round((step / totalQuestions) * 100)

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
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // ── Results / finish screen ─────────────────────────────────────────────────
  if (isLast) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="text-5xl">🎉</div>
            <h1 className="text-2xl font-bold">Your taste profile is ready!</h1>
            <p className="text-muted-foreground">
              We've mapped your palate. Start scanning menus to see your personal match scores.
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'See my matches →'}
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
