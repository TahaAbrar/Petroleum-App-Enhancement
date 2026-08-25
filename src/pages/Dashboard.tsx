import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { setAuthenticated } from '../lib/auth'

type NavId =
  | 'dashboard'
  | 'customers'
  | 'credit'
  | 'debit'
  | 'transactions'
  | 'reports'
  | 'settings'

const NAV: { id: NavId; label: string; icon: string; path: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', path: '/dashboard' },
  { id: 'customers', label: 'Customers', icon: 'users', path: '/customers' },
  { id: 'credit', label: 'Credit', icon: 'credit', path: '/credit' },
  { id: 'debit', label: 'Debit', icon: 'debit', path: '/debit' },
  { id: 'transactions', label: 'Transactions', icon: 'swap', path: '/transactions' },
  { id: 'reports', label: 'Reports', icon: 'doc', path: '/reports' },
  { id: 'settings', label: 'Settings', icon: 'gear', path: '/settings' },
]

const STATS = [
  {
    id: 'customers',
    label: 'Total Customers',
    value: '1,248',
    unit: '',
    change: '+12.5% from last month',
    tone: 'up' as const,
    icon: 'customers',
    mobileSpan: 'full' as const,
  },
  {
    id: 'credit',
    label: 'Total Credit',
    value: '85,420.00',
    unit: 'PKR',
    change: '+8.4% from last month',
    tone: 'up' as const,
    icon: 'credit',
    mobileSpan: 'half' as const,
  },
  {
    id: 'debit',
    label: 'Total Debit',
    value: '42,180.00',
    unit: 'PKR',
    change: '+6.2% from yesterday',
    tone: 'down' as const,
    icon: 'debit',
    mobileSpan: 'half' as const,
  },
  {
    id: 'tx',
    label: "Today's Transactions",
    value: '24',
    unit: '',
    change: '+5.3% from yesterday',
    tone: 'up' as const,
    icon: 'tx',
    mobileSpan: 'full' as const,
  },
]

const BAR_DAYS = [
  { label: 'May 11', credit: 62, debit: 38 },
  { label: 'May 12', credit: 78, debit: 45 },
  { label: 'May 13', credit: 55, debit: 70 },
  { label: 'May 14', credit: 88, debit: 42 },
  { label: 'May 15', credit: 70, debit: 58 },
  { label: 'May 16', credit: 95, debit: 48 },
  { label: 'May 17', credit: 82, debit: 65 },
]

const TREND = [42, 48, 45, 58, 62, 70, 78]

const TRANSACTIONS = [
  {
    id: 'TX-1042',
    customer: 'ABC Petroleum',
    type: 'Debit' as const,
    product: 'Diesel',
    amount: '50,000.00',
    balance: '328,400.00',
    when: '17 May 2026 · 10:24 AM',
    by: 'Admin',
  },
  {
    id: 'TX-1041',
    customer: 'XYZ Fuel Station',
    type: 'Credit' as const,
    product: 'Payment',
    amount: '20,000.00',
    balance: '348,400.00',
    when: '17 May 2026 · 09:12 AM',
    by: 'Admin',
  },
  {
    id: 'TX-1040',
    customer: 'City Transport Co.',
    type: 'Credit' as const,
    product: 'CNG · Monthly',
    amount: '95,200.00',
    balance: '404,900.00',
    when: '16 May 2026 · 04:45 PM',
    by: 'Admin',
  },
  {
    id: 'TX-1039',
    customer: 'Green Valley Depot',
    type: 'Debit' as const,
    product: 'Lubricants',
    amount: '22,800.00',
    balance: '309,700.00',
    when: '16 May 2026 · 01:18 PM',
    by: 'Admin',
  },
  {
    id: 'TX-1038',
    customer: 'Highway Filling',
    type: 'Credit' as const,
    product: 'Petrol · 1,500 L',
    amount: '135,000.00',
    balance: '332,500.00',
    when: '15 May 2026 · 11:02 AM',
    by: 'Admin',
  },
]

const BOTTOM_NAV = [
  { id: 'home', label: 'Home', path: '/dashboard', icon: 'home' },
  { id: 'customers', label: 'Customers', path: '/customers', icon: 'users' },
  { id: 'fab', label: 'Add', path: '/credit', icon: 'plus' },
  { id: 'transactions', label: 'Txns', path: '/transactions', icon: 'swap' },
  { id: 'more', label: 'More', path: '/settings', icon: 'more' },
] as const

const panel =
  'rounded-[1.1rem] border border-white/80 bg-white p-[1.15rem_1.2rem_1rem] shadow-card animate-rise'
const selectBtn =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-[0.65rem] border border-line bg-[#fafbfc] px-2.5 py-1.5 text-xs font-semibold text-muted'

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3.2" />
          <path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.3" />
          <path d="M16.5 3.8a3.2 3.2 0 0 1 0 6.2" />
        </svg>
      )
    case 'credit':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M3 10h18" />
          <path d="M12 13v3M10.5 14.5h3" />
        </svg>
      )
    case 'debit':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3 2" />
        </svg>
      )
    case 'swap':
      return (
        <svg {...common}>
          <path d="M7 7h12l-3-3" />
          <path d="M17 17H5l3 3" />
        </svg>
      )
    case 'doc':
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </svg>
      )
    case 'gear':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
        </svg>
      )
    default:
      return null
  }
}

function StatIcon({ name }: { name: string }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'customers') {
    return (
      <svg {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a3.5 3.5 0 0 0-2.6-3.3M16.4 4a3 3 0 0 1 0 6" />
      </svg>
    )
  }
  if (name === 'credit') {
    return (
      <svg {...props}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }
  if (name === 'debit') {
    return (
      <svg {...props}>
        <path d="M5 12h14" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  )
}

function BottomIcon({ name }: { name: string }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'home') {
    return (
      <svg {...props}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    )
  }
  if (name === 'users') {
    return (
      <svg {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a3.5 3.5 0 0 0-2.6-3.3M16.4 4a3 3 0 0 1 0 6" />
      </svg>
    )
  }
  if (name === 'swap') {
    return (
      <svg {...props}>
        <path d="M7 7h12l-3-3" />
        <path d="M17 17H5l3 3" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CreditDebitChart() {
  const max = 100
  const chartH = 180
  const chartW = 520
  const padL = 36
  const padB = 36
  const padT = 16
  const groupW = (chartW - padL) / BAR_DAYS.length

  return (
    <svg
      className="block h-auto w-full"
      viewBox={`0 0 ${chartW} ${chartH + padB}`}
      role="img"
      aria-label="Credit vs Debit"
    >
      {[0, 25, 50, 75, 100].map((t) => {
        const y = padT + ((max - t) / max) * chartH
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={chartW} y2={y} className="stroke-[#eef0f3]" strokeWidth={1} />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-[#9ca3af] text-[10px]">
              {t}
            </text>
          </g>
        )
      })}
      {BAR_DAYS.map((d, i) => {
        const x = padL + i * groupW + groupW * 0.22
        const barW = groupW * 0.24
        const creditH = (d.credit / max) * chartH
        const debitH = (d.debit / max) * chartH
        const base = padT + chartH
        const delayCredit = 0.15 + i * 0.08
        const delayDebit = delayCredit + 0.05
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={base - creditH}
              width={barW}
              height={creditH}
              rx="4"
              className="chart-bar fill-fuel"
              style={{ animationDelay: `${delayCredit}s` }}
            />
            <rect
              x={x + barW + 4}
              y={base - debitH}
              width={barW}
              height={debitH}
              rx="4"
              className="chart-bar fill-ink"
              style={{ animationDelay: `${delayDebit}s` }}
            />
            <text
              x={x + barW + 2}
              y={base + 20}
              textAnchor="middle"
              className="chart-axis-label fill-[#9ca3af] text-[10px]"
              style={{ animationDelay: `${delayDebit + 0.1}s` }}
            >
              {d.label.replace('May ', '')}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function BalanceTrendChart() {
  const w = 520
  const h = 200
  const pad = { t: 20, r: 16, b: 36, l: 48 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const min = 30
  const max = 90
  const points = TREND.map((v, i) => {
    const x = pad.l + (i / (TREND.length - 1)) * innerW
    const y = pad.t + ((max - v) / (max - min)) * innerH
    return { x, y }
  })
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},${pad.t + innerH} ${line} ${points[points.length - 1].x},${pad.t + innerH}`

  return (
    <svg className="block h-auto w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Balance Trend">
      {[90, 70, 50, 30].map((t) => {
        const y = pad.t + ((max - t) / (max - min)) * innerH
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} className="stroke-[#eef0f3]" strokeWidth={1} />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-[#9ca3af] text-[10px]">
              {t}k
            </text>
          </g>
        )
      })}
      <polygon points={area} className="chart-area fill-fuel/20" />
      <polyline
        points={line}
        fill="none"
        pathLength={1}
        className="chart-line stroke-fuel"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="5"
          className="chart-dot fill-fuel stroke-white"
          strokeWidth={2}
          style={{ animationDelay: `${0.55 + i * 0.1}s` }}
        />
      ))}
      {BAR_DAYS.map((d, i) => (
        <text
          key={d.label}
          x={pad.l + (i / (BAR_DAYS.length - 1)) * innerW}
          y={h - 10}
          textAnchor="middle"
          className="chart-axis-label fill-[#9ca3af] text-[10px]"
          style={{ animationDelay: `${0.4 + i * 0.06}s` }}
        >
          {d.label.replace('May ', '')}
        </text>
      ))}
    </svg>
  )
}

type DashboardProps = {
  onLogout?: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const active =
    NAV.find((item) => item.path === location.pathname)?.id ?? 'dashboard'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')

  function handleLogout() {
    setAuthenticated(false)
    onLogout?.()
    navigate('/login', { replace: true })
  }

  const filteredTx = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TRANSACTIONS
    return TRANSACTIONS.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.product.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="grid min-h-dvh bg-surface text-ink lg:grid-cols-[250px_1fr]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[25] border-0 bg-ink/35 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 flex h-dvh w-[min(280px,86vw)] flex-col gap-5 border-r border-line bg-white p-4 pt-5 transition-transform duration-300 lg:sticky lg:w-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-[12px_0_40px_rgba(0,0,0,0.12)]' : '-translate-x-[105%] lg:translate-x-0'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-2 pb-2">
          <BrandMark size={40} />
          <div>
            <strong className="block text-[1.05rem] font-extrabold tracking-[-0.02em] leading-tight">
              FuelLedger
            </strong>
            <span className="mt-0.5 block text-[0.68rem] font-medium text-muted">
              Petroleum Accounting System
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {NAV.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
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

        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-[#fafbfc] p-3">
          <div
            className="grid size-10 shrink-0 place-items-center rounded-full bg-fuel text-sm font-extrabold text-ink"
            aria-hidden
          >
            A
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block text-[0.85rem] font-bold">Admin User</strong>
            <span className="block text-[0.72rem] text-muted">Super Admin</span>
          </div>
          <button
            type="button"
            className="rounded border-0 bg-transparent px-1.5 py-1 font-extrabold tracking-widest text-muted hover:bg-[#eee] hover:text-ink"
            aria-label="User menu"
            onClick={handleLogout}
          >
            ···
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-[6.25rem] lg:pb-0">
        {/* Mobile header — matches mockup */}
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

        {/* Desktop header */}
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
                A
              </div>
              <div>
                <strong className="block text-[0.85rem] font-bold">Admin</strong>
                <span className="block text-[0.72rem] text-muted">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-3.5 px-4 pb-4 pt-1 lg:gap-[1.15rem] lg:px-6 lg:pb-8 lg:pt-2">
          {active !== 'dashboard' ? (
            <section
              className={`${panel} animate-rise py-16 text-center`}
              aria-label={NAV.find((n) => n.id === active)?.label}
            >
              <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">
                {NAV.find((n) => n.id === active)?.label}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted">
                This section is ready for content. URL is{' '}
                <code className="rounded bg-surface px-1.5 py-0.5 text-ink">
                  {NAV.find((n) => n.id === active)?.path}
                </code>
              </p>
            </section>
          ) : (
            <>
              {/* Stats — mobile: full / half+half / full */}
              <section
                className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4"
                aria-label="Summary"
              >
                {STATS.map((s, i) => {
                  const isHalf = s.mobileSpan === 'half'
                  return (
                    <article
                      key={s.id}
                      className={`${panel} rounded-3xl ${
                        isHalf
                          ? 'col-span-1 flex flex-col gap-1.5 p-3.5 xl:flex-row xl:items-start xl:gap-3 xl:p-4'
                          : 'col-span-2 flex items-center gap-3 p-4 xl:col-span-1 xl:items-start'
                      }`}
                      style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                    >
                      {/* Hide Credit/Debit icons on mobile only */}
                      <div
                        className={`shrink-0 place-items-center rounded-full bg-fuel text-ink ${
                          isHalf ? 'hidden size-11 xl:grid' : 'grid size-11'
                        }`}
                      >
                        <StatIcon name={s.icon} />
                      </div>
                      <div className="min-w-0 w-full">
                        <p
                          className={`m-0 font-semibold text-muted ${
                            isHalf ? 'text-[0.72rem] leading-tight' : 'text-[0.8rem]'
                          }`}
                        >
                          {s.label}
                        </p>
                        <h3
                          className={`mt-1 mb-1 font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap ${
                            isHalf
                              ? 'text-[1rem] leading-none xl:text-[1.15rem]'
                              : 'text-[1.35rem] leading-tight xl:text-[1.25rem]'
                          }`}
                        >
                          {s.value}
                          {s.unit ? (
                            <span
                              className={`ml-1 font-bold text-muted ${
                                isHalf ? 'text-[0.68rem]' : 'text-[0.75rem]'
                              }`}
                            >
                              {s.unit}
                            </span>
                          ) : null}
                        </h3>
                        <span
                          className={`block font-semibold leading-snug ${
                            isHalf ? 'text-[0.65rem]' : 'text-[0.72rem]'
                          } ${s.tone === 'up' ? 'text-credit' : 'text-debit'}`}
                        >
                          {s.change}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </section>

              <section
                className="grid grid-cols-1 gap-3.5 xl:grid-cols-2 xl:gap-4"
                aria-label="Analytics"
              >
                <article className={`${panel} rounded-3xl p-4`} style={{ animationDelay: '0.22s' }}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="m-0 text-[0.95rem] font-extrabold tracking-[-0.01em] xl:text-base">
                      Credit vs Debit
                    </h2>
                    <div className="flex items-center gap-2.5 text-[0.65rem] font-semibold text-muted xl:text-xs">
                      <span className="inline-flex items-center gap-1">
                        <i className="inline-block size-2 rounded-sm bg-fuel" /> Credit
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <i className="inline-block size-2 rounded-sm bg-ink" /> Debit
                      </span>
                    </div>
                  </div>
                  <CreditDebitChart />
                </article>

                <article className={`${panel} rounded-3xl p-4`} style={{ animationDelay: '0.26s' }}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="m-0 text-[0.95rem] font-extrabold tracking-[-0.01em] xl:text-base">
                      Balance Trend
                    </h2>
                    <button type="button" className={`${selectBtn} text-[0.65rem]`}>
                      This Month
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="m6 9 6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <BalanceTrendChart />
                </article>
              </section>

              <section
                className={`${panel} rounded-3xl p-4`}
                style={{ animationDelay: '0.28s' }}
                aria-label="Recent transactions"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="m-0 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">
                    Recent Transactions
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate('/transactions')}
                    className="cursor-pointer rounded-lg border border-[#F5C518]/35 bg-[#FFFCEB] px-3 py-1.5 text-[0.75rem] font-bold text-[#E6A800] shadow-none hover:brightness-95 lg:border-0 lg:bg-fuel lg:px-4 lg:py-2 lg:text-[0.8rem] lg:text-ink lg:shadow-[0_6px_14px_rgba(245,197,24,0.3)]"
                  >
                    View All
                  </button>
                </div>

                {/* Mobile list — exact reference style */}
                <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
                  {filteredTx.slice(0, 4).map((row) => {
                    const isCredit = row.type === 'Credit'
                    return (
                      <li
                        key={row.id}
                        className="flex items-center gap-2.5 border-b border-[#ECEEF2] py-3.5 last:border-b-0"
                      >
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(26,29,33,0.1)] ring-1 ring-black/5">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Z"
                              fill="#F5C518"
                            />
                            <path
                              d="M9 12.5c-2.9 0-5.3 1.6-5.3 3.6V18h10.6v-1.9c0-2-2.4-3.6-5.3-3.6Z"
                              fill="#F5C518"
                            />
                            <path
                              d="M16.2 11a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
                              fill="#F5C518"
                              opacity="0.85"
                            />
                            <path
                              d="M16.3 12.7c1.9.15 3.5 1.35 3.5 2.9V18H17"
                              stroke="#F5C518"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              opacity="0.85"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-[0.9rem] font-bold text-[#1A1D21]">
                            {row.customer}
                          </p>
                          <p className="mt-0.5 m-0 truncate text-[0.75rem] font-medium text-[#8B93A1]">
                            {row.product}
                          </p>
                        </div>

                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold leading-none ${
                            isCredit
                              ? 'bg-[#E8F8EE] text-[#16A34A]'
                              : 'bg-[#FDE8EC] text-[#E11D48]'
                          }`}
                        >
                          {row.type}
                        </span>

                        <p
                          className={`m-0 shrink-0 whitespace-nowrap text-right text-[0.8rem] font-bold leading-none ${
                            isCredit ? 'text-[#16A34A]' : 'text-[#E11D48]'
                          }`}
                        >
                          {row.amount} PKR
                        </p>
                      </li>
                    )
                  })}
                </ul>

                {/* Desktop table */}
                <div className="-mx-1 hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[920px] border-collapse">
                    <thead>
                      <tr>
                        {[
                          'ID',
                          'Customer',
                          'Type',
                          'Product / Service',
                          'Amount',
                          'Balance',
                          'Date & Time',
                          'Created By',
                        ].map((h) => (
                          <th
                            key={h}
                            className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((row) => (
                        <tr key={row.id} className="hover:bg-[#fcfcfd]">
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                            {row.id}
                          </td>
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                            {row.customer}
                          </td>
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
                                row.type === 'Credit'
                                  ? 'bg-credit-bg text-credit'
                                  : 'bg-debit-bg text-debit'
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                            {row.product}
                          </td>
                          <td
                            className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-bold whitespace-nowrap ${
                              row.type === 'Credit' ? 'text-credit' : 'text-debit'
                            }`}
                          >
                            {row.amount} PKR
                          </td>
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                            {row.balance} PKR
                          </td>
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                            {row.when}
                          </td>
                          <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                            {row.by}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav + FAB */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-1 pt-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,29,33,0.06)] backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="relative mx-auto grid h-14 max-w-lg grid-cols-5 items-center">
          {BOTTOM_NAV.map((item) => {
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
              (sidebarOpen || ['/settings', '/reports'].includes(location.pathname))

            const activeTab =
              item.id === 'home'
                ? location.pathname === '/dashboard'
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
    </div>
  )
}
