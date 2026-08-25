import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FuelLedgerLogo } from '../components/FuelLedgerLogo'
import { apiLogin, setSession } from '../lib/auth'
import { toast } from '../toast'

type Phase = 'intro' | 'exit' | 'login'

const INTRO_MS = 3600
const EXIT_MS = 650

const fieldIcon =
  'pointer-events-none absolute left-3.5 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 text-muted'

function UserIcon() {
  return (
    <svg className={fieldIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 19.5c0-3.2 3.1-5.2 7-5.2s7 2 7 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className={fieldIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

const inputClass =
  'w-full appearance-none rounded-[0.9rem] border-[1.5px] border-line bg-[#fafbfc] py-[0.85rem] pl-11 pr-4 text-ink outline-none transition placeholder:text-[#9aa1ab] hover:border-[#d5d8de] focus:border-fuel focus:bg-white focus:shadow-[0_0_0_4px_rgba(245,197,24,0.22)]'

export default function LoginPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('intro')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await apiLogin(username.trim(), password)
      setSession({
        token: data.token,
        user: data.user,
        redirectTo: data.redirectTo,
      })
      if (!remember) {
        // sessionStorage already; remember only affects session duration UX for now
      }
      toast.success('Login successful. Welcome back.')
      navigate(data.redirectTo, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-surface p-5"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -left-[6%] -top-[8%] size-[min(48vw,320px)] animate-orb rounded-full bg-fuel/30 blur-[40px] opacity-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[8%] top-[12%] size-[min(40vw,260px)] animate-orb rounded-full bg-navy/15 blur-[40px] opacity-0 [animation-delay:0.18s]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-6%] right-[18%] size-[min(36vw,220px)] animate-orb rounded-full bg-orange/20 blur-[40px] opacity-0 [animation-delay:0.28s]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-[-10%] animate-[fade-up_1.1s_ease_forwards] bg-[linear-gradient(rgba(26,29,33,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(26,29,33,0.035)_1px,transparent_1px)] bg-size-[44px_44px] opacity-0 [mask-image:radial-gradient(ellipse_at_50%_42%,black_15%,transparent_72%)]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 animate-shine bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.45)_48%,transparent_62%)]"
        aria-hidden
      />

      {phase !== 'login' && (
        <div
          className={`relative z-[2] flex flex-col items-center gap-4 text-center ${
            phase === 'exit' ? 'animate-intro-exit' : ''
          }`}
        >
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 size-[min(70vw,280px)] -translate-x-1/2 -translate-y-[62%]"
            aria-hidden
          >
            <span className="absolute inset-0 animate-ring rounded-full border-[1.5px] border-fuel/35 opacity-0 [animation-delay:0.35s]" />
            <span className="absolute inset-[12%] animate-ring rounded-full border-[1.5px] border-orange/30 opacity-0 [animation-delay:0.75s]" />
          </div>

          <div className="relative z-[1] w-[min(46vw,168px)] drop-shadow-[0_14px_28px_rgba(26,47,75,0.14)]">
            <FuelLedgerLogo animated className="block h-auto w-full" />
          </div>

          <div className="relative z-[1]">
            <h1 className="m-0 text-[clamp(1.75rem,5vw,2.35rem)] font-extrabold tracking-[-0.03em] text-ink">
              {'FuelLedger'.split('').map((ch, i) => (
                <span
                  key={`${ch}-${i}`}
                  className="inline-block animate-letter opacity-0"
                  style={{ animationDelay: `${1.15 + i * 0.045}s` }}
                >
                  {ch}
                </span>
              ))}
            </h1>
            <p className="mt-1.5 animate-fade-up text-[0.95rem] font-medium text-muted opacity-0 [animation-delay:1.55s]">
              Petroleum Accounting System
            </p>
          </div>

          <div className="flex justify-center gap-1.5" aria-hidden>
            {['bg-navy', 'bg-lime', 'bg-orange', 'bg-fuel'].map((c, i) => (
              <span
                key={c}
                className={`size-[0.45rem] rounded-full ${c} animate-letter opacity-0`}
                style={{ animationDelay: `${1.7 + i * 0.08}s` }}
              />
            ))}
          </div>

          <div
            className="mt-2 h-[3px] w-[120px] overflow-hidden rounded-full bg-ink/10 opacity-0 animate-fade-up [animation-delay:1.1s]"
            aria-hidden
          >
            <span className="block h-full w-0 animate-loader rounded-full bg-linear-to-r from-fuel to-orange" />
          </div>
        </div>
      )}

      {phase === 'login' && (
        <section className="relative z-[2] w-full max-w-[420px] animate-login-in" aria-label="Sign in">
          <div className="rounded-[1.35rem] border border-white/70 bg-white p-[clamp(1.5rem,4vw,2.25rem)] shadow-auth">
            <header className="mb-7 flex flex-col items-center gap-3.5 text-center">
              <div className="grid size-[76px] place-items-center">
                <FuelLedgerLogo className="h-auto w-[72px] animate-float drop-shadow-[0_6px_14px_rgba(26,47,75,0.12)]" />
              </div>
              <div>
                <h1 className="m-0 text-[1.55rem] font-extrabold tracking-[-0.03em]">Welcome back</h1>
                <p className="mt-1 text-sm font-medium text-muted">Sign in to FuelLedger</p>
              </div>
            </header>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="animate-stagger flex flex-col gap-1.5 opacity-0" style={{ animationDelay: '0.05s' }}>
                <label htmlFor="username" className="text-[0.8125rem] font-semibold text-ink">
                  Username
                </label>
                <div className="relative">
                  <UserIcon />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="animate-stagger flex flex-col gap-1.5 opacity-0" style={{ animationDelay: '0.12s' }}>
                <label htmlFor="password" className="text-[0.8125rem] font-semibold text-ink">
                  Password
                </label>
                <div className="relative">
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
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2.5 grid -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div
                className="animate-stagger mt-0.5 flex flex-wrap items-center justify-between gap-3 opacity-0"
                style={{ animationDelay: '0.18s' }}
              >
                <label className="inline-flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium text-muted select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 accent-fuel"
                  />
                  Remember me
                </label>
                <a className="text-[0.8125rem] font-semibold text-navy no-underline hover:text-orange" href="#forgot">
                  Forgot password?
                </a>
              </div>

              {error ? (
                <p className="m-0 rounded-xl border border-debit/20 bg-debit-bg px-3 py-2 text-center text-[0.8rem] font-semibold text-debit" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="animate-stagger relative mt-1 w-full overflow-hidden rounded-[0.95rem] border-0 bg-linear-to-b from-fuel to-fuel-deep px-5 py-[0.95rem] text-[0.95rem] font-bold text-ink shadow-[0_8px_20px_rgba(245,197,24,0.35)] transition hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 opacity-0"
                style={{ animationDelay: '0.24s' }}
              >
                {submitting ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <div
              className="animate-stagger my-4 flex items-center gap-3 text-[0.75rem] font-semibold tracking-[0.06em] text-muted uppercase opacity-0"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="h-px flex-1 bg-line" />
              Secure access
              <span className="h-px flex-1 bg-line" />
            </div>

            <p
              className="animate-stagger m-0 text-center text-[0.8125rem] text-muted opacity-0"
              style={{ animationDelay: '0.36s' }}
            >
              New to FuelLedger?{' '}
              <a className="font-bold text-navy no-underline hover:text-orange" href="#register">
                Request access
              </a>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-[#9aa1ab]">
            © {new Date().getFullYear()} FuelLedger · Petroleum Accounting
          </p>
        </section>
      )}
    </main>
  )
}
