import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="border rounded-xl p-5 bg-card space-y-2">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
      </div>

      <div className="border rounded-xl p-5 bg-card space-y-2">
        <p className="font-medium">Taste Profile</p>
        <p className="text-sm text-muted-foreground">Complete the taste quiz to see your flavor breakdown.</p>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full border border-destructive text-destructive rounded-lg py-2 font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
