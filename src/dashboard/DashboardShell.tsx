import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { apiLogout, getSession } from '../lib/auth'
import { toast } from '../toast'
import type { DashboardConfig } from './types'
import { BottomIcon, NavIcon } from './icons'
import { DashboardHome, SectionPlaceholder } from './DashboardHome'
import { TransactionsPage } from './TransactionsPage'
import { CreditPage } from './CreditPage'
import { DebitPage } from './DebitPage'

type Props = {
  config: DashboardConfig
}

export function DashboardShell({ config }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const { nav, bottomNav, homePath, txPath, portalTitle, roleLabel } = config
  const active = nav.find((item) => item.path === location.pathname)?.id ?? 'dashboard'
  const activeLabel = nav.find((n) => n.id === active)?.label || 'Dashboard'
  const activePath = nav.find((n) => n.id === active)?.path || homePath
  const displayName = session?.user?.username || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const showSection = active !== 'dashboard'

  useEffect(() => {
    if (!profileMenuOpen) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = profileMenuRef.current
      if (el && !el.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!logoutConfirmOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loggingOut) setLogoutConfirmOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [logoutConfirmOpen, loggingOut])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await apiLogout()
      setLogoutConfirmOpen(false)
      toast.info('You have been logged out.')
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  function requestLogout() {
    setProfileMenuOpen(false)
    setLogoutConfirmOpen(true)
  }

  return (
    <div className="grid min-h-dvh bg-surface text-ink lg:grid-cols-[250px_1fr]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[25] border-0 bg-ink/35 lg:hidden"
          aria-label="Close menu"
          onClick={() => {
            setSidebarOpen(false)
            setProfileMenuOpen(false)
          }}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 flex h-dvh w-[min(280px,86vw)] flex-col gap-4 overflow-hidden border-r border-line bg-white p-4 pt-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] transition-transform duration-300 lg:sticky lg:w-auto lg:translate-x-0 lg:pb-4 ${
          sidebarOpen
            ? 'translate-x-0 shadow-[12px_0_40px_rgba(0,0,0,0.12)]'
            : '-translate-x-[105%] lg:translate-x-0'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex shrink-0 items-center gap-3 px-2 pb-1">
          <BrandMark size={40} />
          <div>
            <strong className="block text-[1.05rem] font-extrabold tracking-[-0.02em] leading-tight">
              FuelLedger
            </strong>
            <span className="mt-0.5 block text-[0.68rem] font-medium text-muted">{portalTitle}</span>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain">
          {nav.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                  setProfileMenuOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-[0.9rem] border-0 px-[0.95rem] py-[0.78rem] text-left text-[0.9rem] font-semibold transition ${
                  isActive
                    ? 'bg-linear-to-r from-fuel via-[#ffe58a] to-[#fff3c0] text-ink shadow-[0_6px_16px_rgba(245,197,24,0.28)]'
                    : 'bg-transparent text-[#4b5563] hover:bg-[#f7f8fa] hover:text-ink'
                }`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div
          ref={profileMenuRef}
          className="relative z-10 flex shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-[#fafbfc] p-3"
        >
          <div
            className="grid size-10 shrink-0 place-items-center rounded-full bg-fuel text-sm font-extrabold text-ink"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[0.85rem] font-bold">{displayName}</strong>
            <span className="block truncate text-[0.72rem] text-muted">{roleLabel}</span>
          </div>
          <button
            type="button"
            className="rounded border-0 bg-transparent px-1.5 py-1 font-extrabold tracking-widest text-muted hover:bg-[#eee] hover:text-ink"
            aria-label="Account menu"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            ···
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-[calc(100%+0.45rem)] z-50 min-w-[9.5rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_28px_rgba(26,29,33,0.14)]"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 border-0 bg-transparent px-3.5 py-2.5 text-left text-[0.85rem] font-semibold text-[#c62828] hover:bg-[#fff5f5]"
                onClick={requestLogout}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 8l4 4-4 4M18 12H10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-[6.25rem] lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl border-0 bg-transparent text-ink"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <strong className="text-[1.05rem] font-extrabold tracking-[-0.02em]">FuelLedger</strong>
          </div>
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-xl border-0 bg-transparent text-ink"
            aria-label="Notifications"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <span className="absolute top-1.5 right-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-fuel px-0.5 text-[0.58rem] font-extrabold text-ink">
              3
            </span>
          </button>
        </header>

        <header className="sticky top-0 z-20 hidden items-center gap-4 border-b border-transparent bg-surface/90 px-6 py-3.5 backdrop-blur-[10px] lg:grid lg:grid-cols-[1fr_auto]">
          <label className="mx-auto flex w-full max-w-[520px] items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-muted shadow-[0_2px_10px_rgba(26,29,33,0.03)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border-0 bg-transparent text-[0.9rem] text-ink outline-none"
            />
          </label>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="relative grid size-[42px] place-items-center rounded-full border-0 bg-white text-ink shadow-card"
              aria-label="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-surface bg-fuel px-1 text-[0.62rem] font-extrabold text-ink">
                3
              </span>
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="grid size-9 place-items-center rounded-full bg-fuel text-xs font-extrabold text-ink"
                aria-hidden
              >
                {initial}
              </div>
              <div>
                <strong className="block text-[0.85rem] font-bold">{displayName}</strong>
                <span className="block text-[0.72rem] text-muted">{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-3.5 px-4 pb-4 pt-1 lg:gap-[1.15rem] lg:px-6 lg:pb-8 lg:pt-2">
          {active === 'transactions' ? (
            <TransactionsPage homePath={homePath} searchQuery={query} />
          ) : active === 'credit' ? (
            <CreditPage homePath={homePath} txPath={txPath} searchQuery={query} />
          ) : active === 'debit' ? (
            <DebitPage homePath={homePath} txPath={txPath} searchQuery={query} />
          ) : showSection ? (
            <SectionPlaceholder title={activeLabel} path={activePath} />
          ) : (
            <DashboardHome txPath={txPath} searchQuery={query} />
          )}
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-1 pt-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,29,33,0.06)] backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        <div
          className={`relative mx-auto grid h-14 max-w-lg items-center ${
            bottomNav.length >= 5 ? 'grid-cols-5' : bottomNav.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
          }`}
        >
          {bottomNav.map((item) => {
            if (item.id === 'fab') {
              return (
                <div key={item.id} className="relative flex h-full items-center justify-center">
                  <button
                    type="button"
                    aria-label="Add"
                    onClick={() => navigate(item.path)}
                    className="absolute -top-7 grid size-14 place-items-center rounded-full border-[3px] border-white bg-fuel text-white shadow-[0_10px_28px_rgba(245,197,24,0.5)]"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              )
            }

            const moreActive =
              item.id === 'more' &&
              (sidebarOpen || location.pathname.endsWith('/reports'))

            const activeTab =
              item.id === 'home'
                ? location.pathname === homePath
                : item.id === 'more'
                  ? moreActive
                  : location.pathname === item.path

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'more') {
                    setSidebarOpen(true)
                    return
                  }
                  navigate(item.path)
                }}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 border-0 bg-transparent px-0.5 ${
                  activeTab ? 'text-fuel' : 'text-[#8B93A1]'
                }`}
              >
                <BottomIcon name={item.icon} />
                <span className="max-w-full truncate text-[0.62rem] font-semibold leading-none tracking-[0.01em]">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-ink/45 backdrop-blur-[2px]"
            aria-label="Close logout confirmation"
            disabled={loggingOut}
            onClick={() => {
              if (!loggingOut) setLogoutConfirmOpen(false)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="relative z-10 w-full max-w-[22rem] rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(26,29,33,0.2)] animate-rise"
          >
            <h2
              id="logout-confirm-title"
              className="m-0 text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink"
            >
              Logout Confirmation 
            </h2>
            <p className="mt-2 mb-0 text-[0.88rem] font-medium leading-relaxed text-muted">
              Are you sure you want to log out of FuelLedger?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setLogoutConfirmOpen(false)}
                className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="cursor-pointer rounded-xl border-0 bg-[#e11d48] px-4 py-2.5 text-[0.85rem] font-bold text-white shadow-[0_6px_14px_rgba(225,29,72,0.28)] hover:brightness-95 disabled:opacity-50"
              >
                {loggingOut ? 'Logging out…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
