import { useState } from 'react'
import type { PalateSection } from '@/lib/palateQuiz'
import { sliderLabel } from '@/lib/palateQuiz'

interface Props {
  section: PalateSection
  sectionIndex: number
  totalSections: number
  answers: Record<string, number>
  onAnswer: (id: string, val: number) => void
  onNext: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

export default function QuizSection({
  section,
  sectionIndex,
  totalSections,
  answers,
  onAnswer,
  onNext,
  onBack,
  isFirst,
  isLast,
}: Props) {
  // Track which sliders have been interacted with to show their value labels
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const progressPct = Math.round((sectionIndex / totalSections) * 100)

  function handleSliderChange(id: string, val: number) {
    onAnswer(id, val)
    setTouched((prev) => new Set(prev).add(id))
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      {/* Progress bar */}
      <div className="space-y-1 mb-6">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Section {sectionIndex + 1} of {totalSections}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
          {section.number} / 05
        </p>
        <h2 className="text-2xl font-bold leading-snug mb-2">{section.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{section.desc}</p>
      </div>

      {/* Question cards */}
      <div className="space-y-4 flex-1">
        {section.questions.map((q, i) => (
          <div
            key={q.id}
            className="bg-card border rounded-xl p-5 space-y-4 hover:shadow-sm transition-shadow"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="text-xl block">{q.emoji}</span>
            <p className="text-sm leading-relaxed">{q.text}</p>

            {q.type === 'slider' ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{q.left}</span>
                  <span>{q.right}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={answers[q.id] ?? 50}
                  onChange={(e) => handleSliderChange(q.id, Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-xs text-primary font-medium text-center h-4">
                  {touched.has(q.id) ? sliderLabel(answers[q.id] ?? 50) : ''}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => onAnswer(q.id, oi)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            className="border rounded-xl px-5 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 transition"
        >
          {isLast ? 'See My Profile →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
