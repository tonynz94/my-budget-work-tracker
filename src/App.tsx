import { motion } from 'motion/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { OfflineBanner } from './components/OfflineBanner'
import { Pressable } from './components/Pressable'
import { TabBar } from './components/TabBar'
import { useAuth } from './lib/auth'
import { useConfig } from './lib/config'
import { useApplyTheme } from './lib/theme'
import { Budget } from './pages/Budget'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { Work } from './pages/Work'

export default function App() {
  const auth = useAuth()
  const { config, load, reload } = useConfig()
  const location = useLocation()
  useApplyTheme(config.theme)

  if (auth.status === 'loading') return <div className="splash" />
  if (auth.status === 'signedOut') {
    return (
      <>
        <OfflineBanner />
        <Login />
      </>
    )
  }

  // Wait for the settings from the server, so I never save over them with old ones.
  if (load === 'loading') return <div className="splash" />
  if (load === 'error') {
    return (
      <>
        <OfflineBanner />
        <div className="login">
          <div className="login-box">
            <p className="notice">Could not load my data. Check the internet and try again.</p>
            <Pressable className="button button-primary" onClick={reload}>
              Try again
            </Pressable>
          </div>
        </div>
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
            <Route path="/budget" element={<Budget />} />
            <Route path="/work" element={<Work />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  )
}
