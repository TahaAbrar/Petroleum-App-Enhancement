import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FuelLedgerLogo } from './components/FuelLedgerLogo'
import logoMark from './assets/logo-transparent.png'
import './LoginPage.css'

type Phase = 'intro' | 'exit' | 'login'

const INTRO_MS = 3600
const EXIT_MS = 650

function MailIcon() {
  return (
    <svg className="lp-field-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m5.5 8 5.7 4.1a1.5 1.5 0 0 0 1.6 0L18.5 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="lp-field-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4l16 16M10.1 10.2A2.5 2.5 0 0 0 13.8 13.9M7.1 7.4C5 8.9 3.5 12 3.5 12s3.5 6.5 8.5 6.5c1.5 0 2.9-.4 4.1-1M16.7 15.3C18.7 13.9 20.5 12 20.5 12s-3.5-6.5-8.5-6.5c-.7 0-1.3.1-1.9.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setPhase('login')
      return
    }

    const exitTimer = window.setTimeout(() => setPhase('exit'), INTRO_MS)
    const loginTimer = window.setTimeout(() => setPhase('login'), INTRO_MS + EXIT_MS)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(loginTimer)
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    window.setTimeout(() => setSubmitting(false), 900)
  }

  return (
    <main className="lp-shell" aria-live="polite">
      <div className="lp-orb lp-orb--a" aria-hidden="true" />
      <div className="lp-orb lp-orb--b" aria-hidden="true" />
      <div className="lp-orb lp-orb--c" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />
      <div className="lp-shine" aria-hidden="true" />

      {phase !== 'login' && (
        <div className={`lp-intro${phase === 'exit' ? ' lp-intro--exit' : ''}`}>
          <div className="lp-intro-ring" aria-hidden="true">
            <span />
            <span />
          </div>

          <div className="lp-intro-logo">
            <FuelLedgerLogo animated />
          </div>

          <div className="lp-intro-brand">
            <h1 className="lp-title">
              {'FuelLedger'.split('').map((ch, i) => (
                <span key={`${ch}-${i}`} style={{ animationDelay: `${1.15 + i * 0.045}s` }}>
                  {ch}
                </span>
              ))}
            </h1>
            <p className="lp-tagline">Petroleum Accounting System</p>
          </div>

          <div className="lp-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="lp-loader" aria-hidden="true">
            <span className="lp-loader-bar" />
          </div>
        </div>
      )}

      {phase === 'login' && (
        <section className="lp-login" aria-label="Sign in">
          <div className="lp-card">
            <header className="lp-card-header">
              <div className="lp-card-logo-wrap">
                <img src={logoMark} alt="" className="lp-card-logo" />
              </div>
              <div className="lp-card-copy">
                <h1>Welcome back</h1>
                <p>Sign in to FuelLedger</p>
              </div>
            </header>

            <form className="lp-form" onSubmit={handleSubmit} noValidate>
              <div className="lp-field lp-stagger" style={{ ['--i' as string]: 0 }}>
                <label htmlFor="email">Email</label>
                <div className="lp-input">
                  <MailIcon />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="lp-field lp-stagger" style={{ ['--i' as string]: 1 }}>
                <label htmlFor="password">Password</label>
                <div className="lp-input lp-input--toggle">
                  <LockIcon />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="lp-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div className="lp-row lp-stagger" style={{ ['--i' as string]: 2 }}>
                <label className="lp-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <a className="lp-forgot" href="#forgot">
                  Forgot password?
                </a>
              </div>

              <button
                className="lp-submit lp-stagger"
                style={{ ['--i' as string]: 3 }}
                type="submit"
                disabled={submitting}
              >
                <span className="lp-submit-glow" aria-hidden="true" />
                {submitting ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <div className="lp-divider lp-stagger" style={{ ['--i' as string]: 4 }}>
              <span>Secure access</span>
            </div>

            <p className="lp-meta lp-stagger" style={{ ['--i' as string]: 5 }}>
              New to FuelLedger? <a href="#register">Request access</a>
            </p>
          </div>

          <p className="lp-footnote">
            © {new Date().getFullYear()} FuelLedger · Petroleum Accounting
          </p>
        </section>
      )}
    </main>
  )
}
