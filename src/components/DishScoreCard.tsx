import type { DishScore, ScoreLabel } from '@/types'

const LABEL_STYLES: Record<ScoreLabel, string> = {
  'Best Match':            'bg-green-100 text-green-800',
  'Unique Potential Love': 'bg-amber-100 text-amber-800',
  'Likely Not a Match':    'bg-red-100 text-red-800',
}

const LABEL_EMOJI: Record<ScoreLabel, string> = {
  'Best Match':            '✅',
  'Unique Potential Love': '🌟',
  'Likely Not a Match':    '❌',
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-green-600' :
    score >= 50 ? 'text-amber-500' :
    'text-red-500'
  return (
    <div className={`text-2xl font-bold tabular-nums ${color} w-12 text-right shrink-0`}>
      {score}
    </div>
  )
}

interface Props {
  dish: DishScore
}

export default function DishScoreCard({ dish }: Props) {
  const spiceDisplay = dish.spice_level !== null
    ? '🌶️'.repeat(Math.round(dish.spice_level))
    : null

  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold leading-snug">{dish.name}</p>
            {dish.price !== null && (
              <span className="text-sm text-muted-foreground">${dish.price.toFixed(2)}</span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${LABEL_STYLES[dish.label]}`}>
            {LABEL_EMOJI[dish.label]} {dish.label}
          </span>
        </div>
        <ScoreRing score={dish.score} />
      </div>

      {/* Description */}
      {dish.description && (
        <p className="text-sm text-muted-foreground">{dish.description}</p>
      )}

      {/* Explanation */}
      <p className="text-sm">{dish.explanation}</p>

      {/* Tags + spice */}
      <div className="flex flex-wrap gap-1 items-center">
        {dish.flavor_tags.map((tag) => (
          <span key={tag} className="text-xs bg-muted rounded-full px-2 py-0.5 capitalize">
            {tag}
          </span>
        ))}
        {spiceDisplay && spiceDisplay.length > 0 && (
          <span className="text-xs text-muted-foreground ml-1">{spiceDisplay}</span>
        )}
      </div>
    </div>
  )
}
