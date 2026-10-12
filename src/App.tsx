import { motion } from 'motion/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { OfflineBanner } from './components/OfflineBanner'
import { TabBar } from './components/TabBar'
import { useAuth } from './lib/auth'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Placeholder } from './pages/Placeholder'
import { Settings } from './pages/Settings'

export default function App() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <div className="splash" />
  if (auth.status === 'signedOut') {
    return (
      <>
        <OfflineBanner />
        <Login />
      </>
    )
  }

  return (
    <div className="app">
      <OfflineBanner />
      <TabBar />
      <main className="screen">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/budget" element={<Placeholder title="Budget" text="Expenses, income and fixed costs come here." step="Step 4" />} />
            <Route path="/work" element={<Placeholder title="Work" text="The work calendar and the weekly hours come here." step="Step 2" />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  )
}
