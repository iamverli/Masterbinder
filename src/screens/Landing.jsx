import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'
import styles from './Landing.module.css'

// App version — update with each release
export const APP_VERSION = 'V1.0 Bulbasaur'

export default function Landing() {
  const navigate = useNavigate()
  const { enterLocalMode } = useAuth()

  const [view, setView] = useState('main') // 'main' | 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      // AuthContext will handle the redirect
    } catch (err) {
      setError('Google sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmail(email, password)
    } catch (err) {
      setError('Wrong email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignUp(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter your trainer name.'); return }
    setLoading(true)
    setError('')
    try {
      await signUpWithEmail(email, password, name.trim())
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email already has an account. Sign in instead.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else {
        setError('Could not create account. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLocal() {
    await enterLocalMode()
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        {/* Mascot / Logo */}
        <div className={styles.logoArea}>
          <div className={styles.mascot}>
            {/* Placeholder — replace with actual mascot image */}
            <div className={styles.mascotPlaceholder}>
              <span>🌙</span>
            </div>
          </div>
          <h1 className={styles.appName}>MasterBinder</h1>
          <p className={styles.tagline}>Your Pokémon TCG collection, tracked.</p>
        </div>

        {/* Main CTAs */}
        {view === 'main' && (
          <div className={styles.actions}>
            <button
              className={`btn btn-primary ${styles.btnFull}`}
              onClick={() => setView('signup')}
            >
              Add Trainer
            </button>

            <button
              className={`btn btn-secondary ${styles.btnFull}`}
              onClick={() => setView('signin')}
            >
              Sign In
            </button>

            <button
              className={`btn btn-ghost ${styles.btnContinue}`}
              onClick={handleLocal}
            >
              Continue Locally
            </button>
            <p className={styles.localNote}>No account needed — sync later anytime</p>
          </div>
        )}

        {/* Sign In form */}
        {view === 'signin' && (
          <div className={`${styles.actions} animate-scale-in`}>
            <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className={styles.divider}><span>or</span></div>

            <form onSubmit={handleEmailSignIn} className={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={`btn btn-primary ${styles.btnFull}`} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <button className={`btn btn-ghost ${styles.switchBtn}`} onClick={() => { setView('main'); setError('') }}>
              ← Back
            </button>
          </div>
        )}

        {/* Sign Up form */}
        {view === 'signup' && (
          <div className={`${styles.actions} animate-scale-in`}>
            <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className={styles.divider}><span>or</span></div>

            <form onSubmit={handleEmailSignUp} className={styles.form}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={styles.input}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Password (min. 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={`btn btn-primary ${styles.btnFull}`} disabled={loading}>
                {loading ? 'Creating…' : 'Create Trainer'}
              </button>
            </form>

            <button className={`btn btn-ghost ${styles.switchBtn}`} onClick={() => { setView('main'); setError('') }}>
              ← Back
            </button>
          </div>
        )}
      </div>

      {/* Footer — Blue Moon logo + version */}
      <div className={styles.footer}>
        <div className={styles.footerDivider} />
        <div className={styles.footerContent}>
          {/* Blue Moon logo placeholder */}
          <div className={styles.blueMoonLogo}>
            <span className={styles.blueMoonText}>Blue Moon Collectibles</span>
          </div>
          <span className={styles.version}>{APP_VERSION}</span>
        </div>
      </div>
    </div>
  )
}
