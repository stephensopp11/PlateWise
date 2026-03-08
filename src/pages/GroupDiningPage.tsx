import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { searchPlaces, priceLabel, openTableUrl } from '@/lib/places'
import type { PlaceResult } from '@/lib/places'
import { blendGroupProfiles, groupCuisineSuggestions, FLAVOR_AXIS_LABELS } from '@/lib/groupScoring'
import type { GroupBlend } from '@/lib/groupScoring'
import type { TasteProfile } from '@/types'

interface GroupMember {
  memberId: string
  userId: string
  displayName: string
  status: 'invited' | 'joined' | 'declined'
  hasProfile: boolean
}

export default function GroupDiningPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const geo = useGeolocation()

  const [groupName, setGroupName] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [blend, setBlend] = useState<GroupBlend | null>(null)
  const [validProfileCount, setValidProfileCount] = useState(0)
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const isCreator = user?.id === createdBy

  useEffect(() => {
    if (!id || !user) return
    loadGroup()
  }, [id, user])

  // Auto-request location on mount
  useEffect(() => {
    if (geo.status === 'idle') geo.request()
  }, [])

  async function loadGroup() {
    setLoading(true)
    setError('')

    // Load group meta
    const { data: group, error: groupErr } = await supabase
      .from('dining_groups')
      .select('id, name, created_by')
      .eq('id', id)
      .single()

    if (groupErr || !group) {
      setError('Group not found.')
      setLoading(false)
      return
    }

    setGroupName(group.name)
    setCreatedBy(group.created_by)

    // Load members + their display names
    const { data: memberRows } = await supabase
      .from('dining_group_members')
      .select('id, user_id, status')
      .eq('group_id', id)

    if (!memberRows || memberRows.length === 0) {
      setMembers([])
      setLoading(false)
      return
    }

    const userIds = memberRows.map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', userIds)

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

    // Load taste profiles for joined members
    const joinedIds = memberRows
      .filter((m) => m.status === 'joined')
      .map((m) => m.user_id)

    const { data: tasteProfiles } = joinedIds.length > 0
      ? await supabase
          .from('taste_profiles')
          .select('*')
          .in('user_id', joinedIds)
          .eq('quiz_completed', true)
      : { data: [] }

    const tasteMap = new Map((tasteProfiles ?? []).map((p) => [p.user_id, p as TasteProfile]))

    const builtMembers: GroupMember[] = memberRows.map((m) => ({
      memberId: m.id,
      userId: m.user_id,
      displayName: nameMap.get(m.user_id) ?? 'Unknown',
      status: m.status,
      hasProfile: tasteMap.has(m.user_id),
    }))

    setMembers(builtMembers)

    // Blend valid profiles
    const validProfiles = joinedIds
      .map((uid) => tasteMap.get(uid))
      .filter((p): p is TasteProfile => p !== undefined)

    setValidProfileCount(validProfiles.length)

    if (validProfiles.length >= 1) {
      const blended = blendGroupProfiles(validProfiles)
      setBlend(blended)
      await fetchPlaces(blended)
    }

    setLoading(false)
  }

  async function fetchPlaces(blended: GroupBlend) {
    setSearching(true)
    const cuisines = groupCuisineSuggestions(blended)
    const results = await searchPlaces({
      query: 'restaurant',
      cuisines,
      experiences: [],
      userLat: geo.lat,
      userLng: geo.lng,
    })
    setPlaces(results)
    setSearching(false)
  }

  async function acceptInvite() {
    if (!user || !id) return
    await supabase
      .from('dining_group_members')
      .update({ status: 'joined', joined_at: new Date().toISOString() })
      .eq('group_id', id)
      .eq('user_id', user.id)
    loadGroup()
  }

  async function declineInvite() {
    if (!user || !id) return
    await supabase
      .from('dining_group_members')
      .update({ status: 'declined' })
      .eq('group_id', id)
      .eq('user_id', user.id)
    navigate('/friends')
  }

  async function removeMember(memberId: string) {
    await supabase.from('dining_group_members').delete().eq('id', memberId)
    loadGroup()
  }

  const myMembership = members.find((m) => m.userId === user?.id)
  const myStatus = myMembership?.status

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm">Loading group…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 space-y-3">
        <p className="text-destructive text-sm">{error}</p>
        <button onClick={() => navigate('/friends')} className="text-sm text-primary hover:underline">
          Back to Friends
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/friends')}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          ← Back to Friends
        </button>
        <h1 className="text-2xl font-bold">{groupName}</h1>
        <p className="text-sm text-muted-foreground">
          {members.filter((m) => m.status === 'joined').length} of {members.length} members joined
        </p>
      </div>

      {/* Pending invite banner */}
      {myStatus === 'invited' && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">You've been invited to this group</p>
          <div className="flex gap-2">
            <button
              onClick={acceptInvite}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition"
            >
              Join Group
            </button>
            <button
              onClick={declineInvite}
              className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-muted transition"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <p className="font-semibold text-sm">Members</p>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.memberId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {m.status === 'joined' && m.hasProfile ? '✅' :
                   m.status === 'joined' ? '⚠️' :
                   m.status === 'declined' ? '❌' : '⏳'}
                </span>
                <div>
                  <p className="text-sm font-medium">{m.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.status === 'joined' && m.hasProfile ? 'Profile ready' :
                     m.status === 'joined' ? 'No palate quiz yet' :
                     m.status === 'declined' ? 'Declined' : 'Invited'}
                  </p>
                </div>
              </div>
              {isCreator && m.userId !== user?.id && (
                <button
                  onClick={() => removeMember(m.memberId)}
                  className="text-xs text-muted-foreground hover:text-destructive transition"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blended profile */}
      {blend && validProfileCount >= 2 && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div>
            <p className="font-semibold text-sm">Group Flavor Profile</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conservative blend · based on {validProfileCount} of {members.length} profiles
            </p>
          </div>
          <div className="space-y-2">
            {(Object.entries(FLAVOR_AXIS_LABELS) as [keyof GroupBlend, { label: string; emoji: string }][]).map(
              ([axis, { label, emoji }]) => {
                const pct = Math.round((blend[axis] / 10) * 100)
                return (
                  <div key={axis} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{emoji} {label}</span>
                      <span className="text-muted-foreground">{blend[axis].toFixed(1)}/10</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      )}

      {/* Only 1 valid profile note */}
      {blend && validProfileCount === 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800">
            Only 1 member has completed the palate quiz. Recommendations are based on their profile alone. Invite more members to complete their quiz for better group results.
          </p>
        </div>
      )}

      {/* Restaurants */}
      {myStatus === 'joined' && (
        <section className="space-y-3">
          <div>
            <p className="font-semibold text-sm">Recommended for Your Group</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {validProfileCount >= 1
                ? `Cuisines matched to ${validProfileCount} member profile${validProfileCount > 1 ? 's' : ''} · good for groups`
                : 'Join more members to see personalized picks'}
            </p>
          </div>

          {searching && (
            <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
              Finding restaurants…
            </div>
          )}

          {!searching && places.length === 0 && validProfileCount >= 1 && (
            <div className="text-center py-8 space-y-2">
              <div className="text-3xl">🔍</div>
              <p className="text-sm text-muted-foreground">No restaurants found nearby. Try enabling location access.</p>
            </div>
          )}

          {!searching && validProfileCount === 0 && (
            <div className="text-center py-8 space-y-2">
              <div className="text-3xl">👥</div>
              <p className="text-sm text-muted-foreground">
                No members have completed the palate quiz yet. Recommendations will appear once at least one member finishes their quiz.
              </p>
            </div>
          )}

          {places.map((place) => (
            <GroupRestaurantCard key={place.id} place={place} />
          ))}
        </section>
      )}
    </div>
  )
}

function GroupRestaurantCard({ place }: { place: PlaceResult }) {
  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{place.name}</p>
          {place.goodForGroups && (
            <span className="text-xs bg-green-100 text-green-700 border border-green-200 font-medium px-2 py-0.5 rounded-full">
              Good for groups
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {place.cuisine}
          {place.priceLevel ? ` · ${priceLabel(place.priceLevel)}` : ''}
          {place.neighborhood ? ` · ${place.neighborhood}` : ''}
          {place.rating != null
            ? ` · ⭐ ${place.rating.toFixed(1)}${place.reviewCount != null ? ` (${place.reviewCount >= 1000 ? `${Math.floor(place.reviewCount / 1000)}k+` : place.reviewCount})` : ''}`
            : ''}
        </p>
        {place.address && (
          <p className="text-xs text-muted-foreground truncate">{place.address}</p>
        )}
      </div>
      <div className="flex gap-2">
        <a
          href={openTableUrl(place.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium text-center hover:opacity-90 transition"
        >
          Book a table
        </a>
      </div>
    </div>
  )
}
