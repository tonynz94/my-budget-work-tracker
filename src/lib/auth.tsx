import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { allowedEmail, supabase } from './supabase'

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'preview'

type Auth = {
  status: AuthStatus
  userId: string | null
  email: string | null
  error: string | null
  // False until .env.local has the Supabase values.
  configured: boolean
  signIn: () => void
  signOut: () => void
  // Shows the app without login. It only works on my laptop before Supabase is connected.
  startPreview: () => void
}

const AuthContext = createContext<Auth | null>(null)

// Google sends the error back in the URL when the login fails.
function readUrlError(): string | null {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const message = search.get('error_description') ?? hash.get('error_description')
  if (message) window.history.replaceState(null, '', window.location.pathname)
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'signedOut')
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const urlError = readUrlError()
    if (urlError) setError(urlError)

    const apply = (next: Session | null) => {
      const email = next?.user.email?.toLowerCase() ?? null
      if (next && allowedEmail && email !== allowedEmail) {
        setError('This app is private. Please use the owner account.')
        // Supabase does not allow auth calls inside this callback, so I run it right after.
        setTimeout(() => client.auth.signOut(), 0)
        return
      }
      setSession(next)
      setStatus(next ? 'signedIn' : 'signedOut')
    }

    client.auth.getSession().then(({ data }) => apply(data.session))
    const { data } = client.auth.onAuthStateChange((_event, next) => apply(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = () => {
    if (!supabase) return
    setError(null)
    supabase.auth
      .signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
      .then(({ error }) => {
        if (error) setError(error.message)
      })
  }

  const signOut = () => {
    if (!supabase) {
      setStatus('signedOut')
      return
    }
    supabase.auth.signOut()
  }

  const startPreview = () => {
    if (!supabase && import.meta.env.DEV) setStatus('preview')
  }

  const value: Auth = {
    status,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    error,
    configured: supabase !== null,
    signIn,
    signOut,
    startPreview,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
