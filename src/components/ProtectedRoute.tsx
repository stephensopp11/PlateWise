import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTasteProfile } from '@/hooks/useTasteProfile'

export default function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useTasteProfile()
  const location = useLocation()

  if (authLoading || profileLoading) return null

  if (!user) return <Navigate to="/login" replace />

  // Redirect to onboarding if quiz not yet completed (unless already there)
  if (profile && !profile.quiz_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
