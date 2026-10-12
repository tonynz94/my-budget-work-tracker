import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

export type ThemeMode = 'system' | 'light' | 'dark'
export type SyncState = 'local' | 'syncing' | 'synced' | 'error'

type Theme = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  sync: SyncState
}

const STORAGE_KEY = 'theme'
const ThemeContext = createContext<Theme | null>(null)
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

// The saved copy on this device stops the wrong colors from flashing when the app opens.
function readLocal(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return isThemeMode(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && darkQuery.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17171c' : '#f2f4f6')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const [mode, setModeState] = useState<ThemeMode>(readLocal)
  const [sync, setSync] = useState<SyncState>('local')

  useEffect(() => {
    applyTheme(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // The app still works without the saved copy.
    }
    if (mode !== 'system') return
    const onChange = () => applyTheme('system')
    darkQuery.addEventListener('change', onChange)
    return () => darkQuery.removeEventListener('change', onChange)
  }, [mode])

  // Read the setting from the server when I log in and when I come back to the app.
  useEffect(() => {
    if (!supabase || !userId) {
      setSync('local')
      return
    }
    const client = supabase
    const pull = async () => {
      setSync('syncing')
      const { data, error } = await client.from('settings').select('data').eq('user_id', userId).maybeSingle()
      if (error) {
        setSync('error')
        return
      }
      const remote = (data?.data as { theme?: unknown } | undefined)?.theme
      if (isThemeMode(remote)) setModeState(remote)
      setSync('synced')
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull()
    }
    pull()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId])

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next)
      if (!supabase || !userId) return
      setSync('syncing')
      supabase
        .from('settings')
        .upsert({ user_id: userId, data: { theme: next }, updated_at: new Date().toISOString() })
        .then(({ error }) => setSync(error ? 'error' : 'synced'))
    },
    [userId],
  )

  return <ThemeContext.Provider value={{ mode, setMode, sync }}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider')
  return theme
}
