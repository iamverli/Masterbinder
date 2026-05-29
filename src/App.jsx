import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './screens/Landing'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import NationalPokedex from './screens/NationalPokedex'
import SetTracker from './screens/SetTracker'
import GuestView from './screens/GuestView'
import LoadingScreen from './components/common/LoadingScreen'

export default function App() {
  const { isLoading, isAuthenticated, onboardingDone } = useAuth()
  const location = useLocation()

  // Guest view is public — render immediately, no auth check needed.
  // Checked before the loading guard so the page doesn't flash a spinner
  // when someone opens a share link directly.
  if (location.pathname.startsWith('/guest/')) {
    return (
      <Routes>
        <Route path="/guest/:uid" element={<GuestView />} />
      </Routes>
    )
  }

  if (isLoading || onboardingDone === null) return <LoadingScreen />

  // Not authenticated — only landing is accessible
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    )
  }

  // Authenticated but onboarding not done
  if (!onboardingDone) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  // Authenticated + onboarded — full app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pokedex" element={<NationalPokedex />} />
      <Route path="/sets/:setId" element={<SetTracker />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
