import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Landing    from './pages/Landing'
import Login      from './pages/Login'
import Register   from './pages/Register'
import Dashboard  from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import './index.css'

function Protected({ children }) {
  const { user, loading, setUser } = useAuth()
  const [onboardingDone, setOnboardingDone] = useState(false)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'rgba(255,255,255,0.3)', fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', letterSpacing:'0.1em' }}>
      STOCKLY
    </div>
  )
  if (!user) return <Navigate to="/login" replace />

  const showOnboarding = !user.onboarding_done && !onboardingDone
  if (showOnboarding) return <Onboarding onDone={() => setOnboardingDone(true)} />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app/*"    element={<Protected><Dashboard /></Protected>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
