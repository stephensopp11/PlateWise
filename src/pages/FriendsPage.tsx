import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { computeTasteTwinScore } from '@/lib/scoring'
import type { TasteProfile } from '@/types'

interface Friend {
  friendshipId: string
  userId: string
  displayName: string
  status: 'pending' | 'accepted'
  isRequester: boolean // true = I sent the request
  tasteTwinScore: number
}

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResult, setSearchResult] = useState<{ id: string; display_name: string } | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)

  async function loadFriends() {
    if (!user) return

    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, user_id_a, user_id_b, taste_twin_score, status')
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)

    if (!friendships || friendships.length === 0) {
      setFriends([])
      setLoading(false)
      return
    }

    // Collect other user IDs
    const otherIds = friendships.map((f) =>
      f.user_id_a === user.id ? f.user_id_b : f.user_id_a
    )

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', otherIds)

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

    setFriends(
      friendships.map((f) => {
        const otherId = f.user_id_a === user.id ? f.user_id_b : f.user_id_a
        return {
          friendshipId: f.id,
          userId: otherId,
          displayName: profileMap.get(otherId) ?? 'Unknown',
          status: f.status,
          isRequester: f.user_id_a === user.id,
          tasteTwinScore: f.taste_twin_score ?? 0,
        }
      })
    )
    setLoading(false)
  }

  useEffect(() => { loadFriends() }, [user])

  async function handleSearch(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!searchEmail.trim() || !user) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)

    // Find user by email via user_profiles — email is in auth.users, not user_profiles
    // We join through auth: search by display_name as a fallback approach
    // Since we can't query auth.users from client, search user_profiles by display_name
    const { data } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .ilike('display_name', searchEmail.trim())
      .neq('id', user.id)
      .limit(1)
      .maybeSingle()

    if (!data) {
      setSearchError('No user found with that name.')
    } else {
      // Check if already friends or request exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(
          `and(user_id_a.eq.${user.id},user_id_b.eq.${data.id}),and(user_id_a.eq.${data.id},user_id_b.eq.${user.id})`
        )
        .maybeSingle()

      if (existing) {
        setSearchError('You already have a connection with this user.')
      } else {
        setSearchResult(data)
      }
    }

    setSearching(false)
  }

  async function sendFriendRequest(toUserId: string) {
    if (!user) return
    setSendingRequest(true)

    // Get both taste profiles to compute initial twin score
    const [{ data: myProfile }, { data: theirProfile }] = await Promise.all([
      supabase.from('taste_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('taste_profiles').select('*').eq('user_id', toUserId).single(),
    ])

    const twinScore =
      myProfile && theirProfile
        ? computeTasteTwinScore(myProfile as TasteProfile, theirProfile as TasteProfile)
        : 0

    await supabase.from('friendships').insert({
      user_id_a: user.id,
      user_id_b: toUserId,
      taste_twin_score: twinScore,
      status: 'pending',
    })

    setSearchResult(null)
    setSearchEmail('')
    setSendingRequest(false)
    loadFriends()
  }

  async function acceptRequest(friendshipId: string) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    loadFriends()
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    loadFriends()
  }

  const accepted = friends.filter((f) => f.status === 'accepted')
  const incoming = friends.filter((f) => f.status === 'pending' && !f.isRequester)
  const outgoing = friends.filter((f) => f.status === 'pending' && f.isRequester)

  function TwinBadge({ score }: { score: number }) {
    const color =
      score >= 80 ? 'bg-green-100 text-green-800' :
      score >= 60 ? 'bg-amber-100 text-amber-800' :
      'bg-muted text-muted-foreground'
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
        {score}% twin
      </span>
    )
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm text-center py-12">Loading…</div>
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Friends</h1>
        <p className="text-muted-foreground text-sm">
          Connect with friends and see how your palates compare.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="space-y-2">
        <label className="text-sm font-medium">Find a friend by name</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter their display name…"
            value={searchEmail}
            onChange={(e) => { setSearchEmail(e.target.value); setSearchResult(null); setSearchError('') }}
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={searching || !searchEmail.trim()}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>
        {searchError && <p className="text-destructive text-sm">{searchError}</p>}
        {searchResult && (
          <div className="border rounded-xl p-3 flex items-center justify-between bg-card">
            <div>
              <p className="font-medium text-sm">{searchResult.display_name}</p>
              <p className="text-xs text-muted-foreground">PlateWise member</p>
            </div>
            <button
              type="button"
              onClick={() => sendFriendRequest(searchResult.id)}
              disabled={sendingRequest}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {sendingRequest ? 'Sending…' : 'Add friend'}
            </button>
          </div>
        )}
      </form>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold">Pending requests ({incoming.length})</p>
          {incoming.map((f) => (
            <div key={f.friendshipId} className="border rounded-xl p-3 flex items-center justify-between bg-card">
              <div>
                <p className="font-medium text-sm">{f.displayName}</p>
                <TwinBadge score={f.tasteTwinScore} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptRequest(f.friendshipId)}
                  className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => removeFriend(f.friendshipId)}
                  className="border rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Sent requests</p>
          {outgoing.map((f) => (
            <div key={f.friendshipId} className="border rounded-xl p-3 flex items-center justify-between bg-card opacity-70">
              <p className="font-medium text-sm">{f.displayName}</p>
              <span className="text-xs text-muted-foreground">Pending…</span>
            </div>
          ))}
        </section>
      )}

      {/* Friends list */}
      <section className="space-y-2">
        {accepted.length > 0 && (
          <p className="text-sm font-semibold">Friends ({accepted.length})</p>
        )}
        {accepted.length === 0 && friends.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <div className="text-4xl">👥</div>
            <p className="font-medium">No friends yet</p>
            <p className="text-muted-foreground text-sm">Search for someone by their display name to connect.</p>
          </div>
        )}
        {accepted.map((f) => (
          <div key={f.friendshipId} className="border rounded-xl p-4 bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold">{f.displayName}</p>
                <TwinBadge score={f.tasteTwinScore} />
              </div>
              <button
                onClick={() => removeFriend(f.friendshipId)}
                className="text-xs text-muted-foreground hover:text-destructive transition"
              >
                Remove
              </button>
            </div>
            {/* Twin score bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${f.tasteTwinScore >= 80 ? 'bg-green-500' : f.tasteTwinScore >= 60 ? 'bg-amber-400' : 'bg-muted-foreground'}`}
                style={{ width: `${f.tasteTwinScore}%` }}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
