import { Pressable } from '../components/Pressable'
import { useAuth } from '../lib/auth'

export function Login() {
  const auth = useAuth()

  return (
    <div className="login">
      <div className="login-box">
        <img className="login-icon" src="/pwa-192.png" alt="" width="72" height="72" />
        <h1 className="login-title">MY</h1>
        <p className="muted">My budget and work hours</p>

        {auth.error && <p className="notice notice-red">{auth.error}</p>}

        {auth.configured ? (
          <Pressable className="button button-primary" onClick={auth.signIn}>
            Continue with Google
          </Pressable>
        ) : (
          <>
            <p className="notice">Supabase is not connected yet. Add the keys to .env.local first.</p>
            {import.meta.env.DEV && (
              <Pressable className="button button-primary" onClick={auth.startPreview}>
                Preview without login
              </Pressable>
            )}
          </>
        )}
      </div>
    </div>
  )
}
