interface Props {
  onStart: () => void
}

export default function QuizIntro({ onStart }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-8 text-center">
        {/* Plate icon */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-border to-muted border-2 border-border mx-auto flex items-center justify-center shadow-inner text-5xl">
          🍽️
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight">
            What does your <span className="text-primary italic">palate</span> say about you?
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A short, science-backed tasting test to map your flavor personality — so PlateWise can make recommendations that actually excite you.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Sections</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold">~4</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Minutes</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold">1</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Profile</p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-lg hover:opacity-90 transition"
        >
          Begin the Test
        </button>

        <a
          href="/"
          className="block text-sm text-muted-foreground hover:underline"
        >
          Skip for now
        </a>
      </div>
    </div>
  )
}
