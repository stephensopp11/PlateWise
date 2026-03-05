import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTasteProfile } from '@/hooks/useTasteProfile'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const [mealCount, setMealCount] = useState<number>(0)
  const [friendCount, setFriendCount] = useState<number>(0)

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good appetite 👋</h1>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/history" className="border rounded-xl p-4 bg-card space-y-1 hover:border-primary transition-colors">
          <p className="text-xs text-muted-foreground">Meals</p>
          <p className="text-2xl font-bold">{mealCount}</p>
        </Link>
        <div className="border rounded-xl p-4 bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Top flavor</p>
          <p className="text-sm font-bold leading-tight">{topFlavor ? topFlavor[0] : '—'}</p>
          {topFlavor && (
            <p className="text-xs text-muted-foreground">{topFlavor[1].toFixed(1)}/10</p>
          )}
        </div>
        <Link to="/friends" className="border rounded-xl p-4 bg-card space-y-1 hover:border-primary transition-colors">
          <p className="text-xs text-muted-foreground">Friends</p>
          <p className="text-2xl font-bold">{friendCount}</p>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Quick actions</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/log"
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary hover:bg-primary/5 transition-all"
          >
            <p className="text-2xl">🍽️</p>
            <p className="text-sm font-medium mt-1">Log a meal</p>
          </Link>
          <Link
            to="/scan"
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary hover:bg-primary/5 transition-all"
          >
            <p className="text-2xl">🔍</p>
            <p className="text-sm font-medium mt-1">Score a menu</p>
          </Link>
          <Link
            to="/restaurants"
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary hover:bg-primary/5 transition-all"
          >
            <p className="text-2xl">🏪</p>
            <p className="text-sm font-medium mt-1">Restaurants</p>
          </Link>
          <Link
            to="/friends"
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary hover:bg-primary/5 transition-all"
          >
            <p className="text-2xl">👥</p>
            <p className="text-sm font-medium mt-1">Find friends</p>
          </Link>
        </div>
      </div>

      {mealCount === 0 && (
        <p className="text-muted-foreground text-sm text-center pt-2">
          Log your first meal to start refining your taste profile.
        </p>
      )}
    </div>
  )
}
