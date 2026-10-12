import { motion } from 'motion/react'
import { Pressable } from '../components/Pressable'
import { useAuth } from '../lib/auth'
import { nzDate } from '../lib/nzTime'
import { useTheme } from '../lib/theme'
import type { SyncState, ThemeMode } from '../lib/theme'

const modes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const syncText: Record<SyncState, string> = {
  local: 'Saved on this device only',
  syncing: 'Syncing',
  synced: 'Synced with the server',
  error: 'Sync failed. Check the internet and try again.',
}

export function Settings() {
  const auth = useAuth()
  const theme = useTheme()

  return (
    <>
      <h1 className="page-title">Settings</h1>

      <div className="card-grid">
        <section className="card">
          <p className="card-label">Appearance</p>
          <div className="segment" role="radiogroup" aria-label="Appearance">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={theme.mode === item.value}
                className="segment-item"
                onClick={() => theme.setMode(item.value)}
              >
                {theme.mode === item.value && (
                  <motion.span
                    layoutId="segment-pill"
                    className="segment-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
                <span className="segment-label">{item.label}</span>
              </button>
            ))}
          </div>
          <p className={theme.sync === 'error' ? 'muted text-red' : 'muted'}>{syncText[theme.sync]}</p>
        </section>

        <section className="card">
          <p className="card-label">Account</p>
          <p className="card-value">{auth.email ?? 'Preview mode, not logged in'}</p>
          <p className="muted">Today in New Zealand is {nzDate()}</p>
          <Pressable className="button button-plain" onClick={auth.signOut}>
            {auth.status === 'preview' ? 'Leave preview' : 'Log out'}
          </Pressable>
        </section>
      </div>
    </>
  )
}
