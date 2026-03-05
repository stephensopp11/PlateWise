import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DiscoverPage from '@/pages/DiscoverPage'
import MenuScanPage from '@/pages/MenuScanPage'
import RestaurantDetailPage from '@/pages/RestaurantDetailPage'
import MealLogPage from '@/pages/MealLogPage'
import MealHistoryPage from '@/pages/MealHistoryPage'
import RestaurantsPage from '@/pages/RestaurantsPage'
import FriendsPage from '@/pages/FriendsPage'
import ProfilePage from '@/pages/ProfilePage'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/scan" element={<MenuScanPage />} />
          <Route path="/restaurants/:slug" element={<RestaurantDetailPage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/log" element={<MealLogPage />} />
          <Route path="/history" element={<MealHistoryPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
