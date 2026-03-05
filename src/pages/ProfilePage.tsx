import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTasteProfile } from '@/hooks/useTasteProfile'
import { supabase } from '@/lib/supabase'

function ProfileBar({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  const pct = Math.round((value / 10) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span>{emoji} {label}</span>
        <span className="text-xs text-muted-foreground">{value.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const navigate = useNavigate()
  const [mealCount, setMealCount] = useState<number | null>(null)
  const [friendCount, setFriendCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setMealCount(count ?? 0))

    supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)
      .eq('status', 'accepted')
      .then(({ count }) => setFriendCount(count ?? 0))
  }, [user])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const topFlavor = profile
    ? Object.entries({
        Umami: profile.umami,
        Richness: profile.richness,
        Spice: profile.spice,
        'Bitter/Char': profile.bitter_char,
        'Bright/Acid': profile.bright_acid,
        Sweet: profile.sweet,
      }).sort(([, a], [, b]) => b - a)[0]
    : null

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

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Account info */}
      <div className="border rounded-xl p-4 bg-card space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/history" className="border rounded-xl p-4 bg-card space-y-1 text-center hover:border-primary transition-colors">
          <p className="text-2xl font-bold">{mealCount ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Meals</p>
        </Link>
        <div className="border rounded-xl p-4 bg-card space-y-1 text-center">
          <p className="text-base font-bold leading-tight">{topFlavor ? topFlavor[0] : '—'}</p>
          <p className="text-xs text-muted-foreground">Top flavor</p>
        </div>
        <Link to="/friends" className="border rounded-xl p-4 bg-card space-y-1 text-center hover:border-primary transition-colors">
          <p className="text-2xl font-bold">{friendCount ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Friends</p>
        </Link>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          to="/history"
          className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-center hover:bg-muted transition"
        >
          Meal history →
        </Link>
        <Link
          to="/restaurants"
          className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-center hover:bg-muted transition"
        >
          Restaurants →
        </Link>
      </div>

      {/* Taste profile */}
      {profile ? (
        <div className="border rounded-xl p-4 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Your taste profile</p>
            <span className="text-xs text-muted-foreground">{profile.meal_count} meals logged</span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Flavor</p>
            {flavorAxes.map(({ key, label, emoji }) => (
              <ProfileBar key={key} label={label} emoji={emoji} value={profile[key]} />
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Texture</p>
            {textureAxes.map(({ key, label, emoji }) => (
              <ProfileBar key={key} label={label} emoji={emoji} value={profile[key]} />
            ))}
          </div>

          <Link
            to="/onboarding"
            className="block text-center text-sm text-primary hover:underline pt-1"
          >
            Retake taste quiz →
          </Link>
        </div>
      ) : (
        <div className="border rounded-xl p-4 bg-card space-y-2">
          <p className="font-medium">Taste Profile</p>
          <p className="text-sm text-muted-foreground">Complete the taste quiz to see your flavor breakdown.</p>
          <Link
            to="/onboarding"
            className="block text-center bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Take the quiz →
          </Link>
        </div>
      )}

      <button
        onClick={handleSignOut}
        className="w-full border border-destructive text-destructive rounded-lg py-2 font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
