import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import type { CustomHoliday } from './holidays'
import { DEFAULT_ACC_RATE, defaultBrackets } from './pay'
import type { PayCycle, RateChange, RateMode, TaxBracket } from './pay'
import { supabase } from './supabase'
import type { LimitChange, Vacation } from './work'

export type { RateChange, RateMode }

export type ThemeMode = 'system' | 'light' | 'dark'

// A saved shift. It has start and end, or it has a total.
export type Preset = {
  id: string
  name: string
  startMin: number | null
  endMin: number | null
  totalMin: number | null
  breakMin: number
}

// All my settings. They are saved as one row on the server.
export type Config = {
  theme: ThemeMode
  jobName: string
  defaultBreakMin: number
  rates: RateChange[]
  presets: Preset[]
  vacations: Vacation[]
  limits: LimitChange[]
  holidayMultiplier: number
  customHolidays: CustomHoliday[]
  removedHolidays: string[]
  // Empty means the default cycle. That is 2 weeks, paid 4 days after the period ends.
  payCycles: PayCycle[]
  taxCode: string
  taxBrackets: TaxBracket[]
  accRate: number
  // The money that really came in, in cents. The key is the first day of the pay period.
  actualPays: Record<string, number>
}

export const defaultConfig: Config = {
  theme: 'system',
  jobName: '',
  defaultBreakMin: 60,
  rates: [],
  presets: [],
  vacations: [],
  limits: [],
  holidayMultiplier: 1.5,
  customHolidays: [],
  removedHolidays: [],
  payCycles: [],
  taxCode: 'M',
  taxBrackets: defaultBrackets,
  accRate: DEFAULT_ACC_RATE,
  actualPays: {},
}

export type SyncState = 'local' | 'syncing' | 'synced' | 'error'
type LoadState = 'loading' | 'ready' | 'error'

type ConfigStore = {
  config: Config
  load: LoadState
  sync: SyncState
  update: (patch: Partial<Config>) => void
  reload: () => void
}

const STORAGE_KEY = 'config'
const ConfigContext = createContext<ConfigStore | null>(null)

function withDefaults(raw: unknown): Config {
  return raw && typeof raw === 'object' ? { ...defaultConfig, ...(raw as Partial<Config>) } : defaultConfig
}

// The copy on this device lets the app open with the right colors before the server answers.
function readLocal(): Config {
  try {
    return withDefaults(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return defaultConfig
  }
}

function writeLocal(config: Config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // The app still works without the saved copy.
  }
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const [config, setConfig] = useState<Config>(readLocal)
  const [load, setLoad] = useState<LoadState>(supabase ? 'loading' : 'ready')
  const [sync, setSync] = useState<SyncState>('local')
  const latest = useRef(config)

  const apply = useCallback((next: Config) => {
    latest.current = next
    setConfig(next)
    writeLocal(next)
  }, [])

  const pull = useCallback(async () => {
    if (!supabase || !userId) return
    setSync('syncing')
    const { data, error } = await supabase.from('settings').select('data').eq('user_id', userId).maybeSingle()
    if (error) {
      setSync('error')
      setLoad((state) => (state === 'ready' ? 'ready' : 'error'))
      return
    }
    if (data) apply(withDefaults(data.data))
    setSync('synced')
    setLoad('ready')
  }, [userId, apply])

  // Read the settings when I log in and when I come back to the app.
  useEffect(() => {
    if (!supabase || !userId) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull()
    }
    pull()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, pull])

  const update = useCallback(
    (patch: Partial<Config>) => {
      const next = { ...latest.current, ...patch }
      apply(next)
      if (!supabase || !userId) return
      setSync('syncing')
      supabase
        .from('settings')
        .upsert({ user_id: userId, data: next, updated_at: new Date().toISOString() })
        .then(({ error }) => setSync(error ? 'error' : 'synced'))
    },
    [userId, apply],
  )

  const reload = useCallback(() => {
    setLoad('loading')
    pull()
  }, [pull])

  return (
    <ConfigContext.Provider value={{ config, load, sync, update, reload }}>{children}</ConfigContext.Provider>
  )
}

export function useConfig(): ConfigStore {
  const store = useContext(ConfigContext)
  if (!store) throw new Error('useConfig must be used inside ConfigProvider')
  return store
}
