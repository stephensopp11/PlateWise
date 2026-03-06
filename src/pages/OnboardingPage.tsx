import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PALATE_SECTIONS, computeProfileFromPalateQuiz, computeArchetype } from '@/lib/palateQuiz'
import type { Archetype } from '@/lib/palateQuiz'
import type { TasteProfile } from '@/types'
import QuizIntro from '@/components/quiz/QuizIntro'
import QuizSection from '@/components/quiz/QuizSection'
import QuizResults from '@/components/quiz/QuizResults'

type ProfileDimensions = Pick<
  TasteProfile,
  'umami' | 'richness' | 'spice' | 'bitter_char' | 'bright_acid' | 'sweet' | 'crispy' | 'silky' | 'chewy' | 'creamy'
>

type Screen = 'intro' | 'quiz' | 'saving' | 'results'

export default function OnboardingPage() {
  const { user } = useAuth()
  const [screen, setScreen] = useState<Screen>('intro')
  const [currentSection, setCurrentSection] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [archetype, setArchetype] = useState<Archetype | null>(null)
  const [profile, setProfile] = useState<ProfileDimensions | null>(null)
  const [error, setError] = useState('')

  function handleAnswer(id: string, val: number) {
    setAnswers((prev) => ({ ...prev, [id]: val }))
  }

  function handleNext() {
    if (currentSection < PALATE_SECTIONS.length - 1) {
      setCurrentSection((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleComplete()
    }
  }

  function handleBack() {
    if (currentSection > 0) {
      setCurrentSection((s) => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function handleComplete() {
    if (!user) return
    setScreen('saving')
    setError('')

    const profileScores = computeProfileFromPalateQuiz(answers)
    const arch = computeArchetype(answers)

    const { error: saveError } = await supabase
      .from('taste_profiles')
      .update({
        ...profileScores,
        quiz_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (saveError) {
      setError('Failed to save your profile. Please try again.')
      setScreen('quiz')
      return
    }

    setProfile(profileScores)
    setArchetype(arch)
    setScreen('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (screen === 'intro') {
    return <QuizIntro onStart={() => setScreen('quiz')} />
  }

  if (screen === 'saving') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🍽️</div>
          <p className="text-muted-foreground">Building your taste profile…</p>
        </div>
      </div>
    )
  }

  if (screen === 'results' && archetype && profile) {
    return (
      <QuizResults
        archetype={archetype}
        profile={profile}
        onContinue={() => { window.location.href = '/' }}
      />
    )
  }

  // quiz screen
  return (
    <div>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground text-sm px-4 py-2 rounded-xl shadow-lg">
          {error}
        </div>
      )}
      <QuizSection
        section={PALATE_SECTIONS[currentSection]}
        sectionIndex={currentSection}
        totalSections={PALATE_SECTIONS.length}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onBack={handleBack}
        isFirst={currentSection === 0}
        isLast={currentSection === PALATE_SECTIONS.length - 1}
      />
    </div>
  )
}
