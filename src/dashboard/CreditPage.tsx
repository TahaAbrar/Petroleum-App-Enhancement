import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CREDIT_ROWS,
  CREDIT_SUMMARY,
  CREDIT_SUMMARY_MOBILE,
  type CreditRow,
} from './creditData'
import { panel } from './styles'
import { toast } from '../toast'

type Props = {
  homePath: string
  txPath: string
  searchQuery?: string
}

export function CreditPage({ homePath, txPath, searchQuery = '' }: Props) {
  const navigate = useNavigate()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<'All' | CreditRow['paymentType']>('All')

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return CREDIT_ROWS.filter((row) => {
      if (paymentFilter !== 'All' && row.paymentType !== paymentFilter) return false
      if (!q) return true
      return (
        row.id.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q) ||
        row.paymentType.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, paymentFilter])

  const recent = filtered.slice(0, 6)

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      {/* Mobile title */}
      <div className="lg:hidden">
        <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink">Credit</h1>
        <p className="mt-1 mb-0 text-[0.82rem] font-medium text-muted">
          Add and manage customer payments
        </p>
      </div>

      {/* Desktop title row */}
      <div className="hidden items-start justify-between gap-3 lg:flex">
        <div>
          <h1 className="m-0 text-[1.65rem] font-extrabold tracking-[-0.03em] text-ink">Credit</h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="text-ink">Credit</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
          >
            <FunnelIcon />
            Filter
          </button>
          <button
            type="button"
            onClick={() => toast.info('Add Credit form coming soon.')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.84rem] font-bold text-ink shadow-[0_6px_16px_rgba(245,197,24,0.32)] hover:brightness-95"
          >
            <PlusIcon />
            Add Credit
          </button>
        </div>
      </div>

      {showFilters && (
        <section className={`hidden ${panel} rounded-2xl p-4 lg:block`} aria-label="Credit filters">
          <label className="inline-flex flex-col gap-1.5">
            <span className="text-[0.72rem] font-bold text-muted">Payment Type</span>
            <select
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as typeof paymentFilter)
              }
              className="cursor-pointer rounded-xl border border-line bg-[#fafbfc] px-3 py-2.5 text-[0.85rem] font-medium text-ink outline-none focus:border-fuel"
            >
              <option value="All">All Types</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </label>
        </section>
      )}

      {/* Mobile summary — horizontal scroll pastel cards */}
      <section
        className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:hidden"
        aria-label="Credit summary"
        style={{ scrollbarWidth: 'none' }}
      >
        {CREDIT_SUMMARY_MOBILE.map((card) => (
          <article
            key={card.id}
            className={`min-w-[7.6rem] shrink-0 rounded-2xl px-3.5 py-3 ${mobileTint(card.tint)}`}
          >
            <p className="m-0 text-[0.68rem] font-semibold text-muted">{card.label}</p>
            <p className="mt-1.5 mb-0 text-[1.15rem] font-extrabold leading-none tracking-[-0.02em] text-ink">
              {card.value}
            </p>
            {card.unit ? (
              <p className="mt-1 mb-0 text-[0.65rem] font-bold text-muted">{card.unit}</p>
            ) : null}
          </article>
        ))}
      </section>

      {/* Desktop summary cards */}
      <section className="hidden grid-cols-4 gap-4 lg:grid" aria-label="Credit summary">
        <SummaryCard
          label="Total Credit"
          value={`${CREDIT_SUMMARY.total.value} PKR`}
          change={CREDIT_SUMMARY.total.change}
          iconBg="bg-fuel-soft text-[#c99700]"
          icon="wallet"
        />
        <SummaryCard
          label="This Month Credit"
          value={`${CREDIT_SUMMARY.month.value} PKR`}
          change={CREDIT_SUMMARY.month.change}
          iconBg="bg-[#fff1e0] text-orange"
          icon="calendar"
        />
        <SummaryCard
          label="Today's Credit"
          value={`${CREDIT_SUMMARY.today.value} PKR`}
          change={CREDIT_SUMMARY.today.change}
          iconBg="bg-[#e8f0fe] text-[#2563eb]"
          icon="bolt"
        />
        <SummaryCard
          label="Total Customers"
          value={CREDIT_SUMMARY.customers.value}
          change={CREDIT_SUMMARY.customers.change}
          iconBg="bg-[#fde8f0] text-[#db2777]"
          icon="users"
        />
      </section>

      {/* Recent credits */}
      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Recent credit transactions">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="m-0 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">
            Recent Credit Transactions
          </h2>
          <button
            type="button"
            onClick={() => navigate(txPath)}
            className="cursor-pointer border-0 bg-transparent text-[0.8rem] font-bold text-[#c99700] hover:text-ink lg:text-fuel-deep"
          >
            View All
          </button>
        </div>

        {/* Mobile list */}
        <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
          {recent.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 border-b border-[#ECEEF2] py-3.5 last:border-b-0"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
                <BuildingIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[0.9rem] font-bold text-ink">{row.customer}</p>
                <p className="mt-0.5 mb-0 truncate text-[0.72rem] font-medium text-muted">
                  {row.when} · {row.reference}
                </p>
              </div>
              <p className="m-0 shrink-0 text-right text-[0.84rem] font-extrabold text-credit">
                +{row.amount} PKR
              </p>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="py-10 text-center text-sm font-medium text-muted">No credit records found.</li>
          )}
        </ul>

        {/* Desktop table */}
        <div className="-mx-1 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                {[
                  'ID',
                  'Customer',
                  'Date & Time',
                  'Amount',
                  'Payment Type',
                  'Reference No.',
                  'New Balance',
                  'Created By',
                  'Actions',
                ].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id} className="hover:bg-[#fcfcfd]">
                  <Td className="font-semibold text-ink">{row.id}</Td>
                  <Td>{row.customer}</Td>
                  <Td>{row.when}</Td>
                  <Td className="font-bold text-credit">{row.amount} PKR</Td>
                  <Td>
                    <PaymentBadge type={row.paymentType} />
                  </Td>
                  <Td>{row.reference}</Td>
                  <Td>{row.newBalance} PKR</Td>
                  <Td>{row.by}</Td>
                  <Td>
                    <div className="relative">
                      <button
                        type="button"
                        className="rounded-lg border-0 bg-transparent px-2 py-1 font-extrabold tracking-widest text-muted hover:bg-[#f3f4f6] hover:text-ink"
                        aria-label={`Actions for ${row.id}`}
                        onClick={() => setOpenMenuId((id) => (id === row.id ? null : row.id))}
                      >
                        ···
                      </button>
                      {openMenuId === row.id && (
                        <div className="absolute right-0 z-10 mt-1 min-w-[8.5rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_28px_rgba(26,29,33,0.14)]">
                          <button
                            type="button"
                            className="block w-full border-0 bg-transparent px-3.5 py-2 text-left text-[0.8rem] font-semibold text-ink hover:bg-[#f7f8fa]"
                            onClick={() => setOpenMenuId(null)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="block w-full border-0 bg-transparent px-3.5 py-2 text-left text-[0.8rem] font-semibold text-ink hover:bg-[#f7f8fa]"
                            onClick={() => setOpenMenuId(null)}
                          >
                            Print
                          </button>
                        </div>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm font-medium text-muted">
                    No credit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function mobileTint(tint: 'fuel' | 'amber' | 'sky' | 'rose') {
  if (tint === 'fuel') return 'bg-fuel-soft'
  if (tint === 'amber') return 'bg-[#fff1e0]'
  if (tint === 'sky') return 'bg-[#e0f2fe]'
  return 'bg-[#fde8f0]'
}

function SummaryCard({
  label,
  value,
  change,
  iconBg,
  icon,
}: {
  label: string
  value: string
  change: string
  iconBg: string
  icon: 'wallet' | 'calendar' | 'bolt' | 'users'
}) {
  return (
    <article className={`${panel} flex items-start gap-3 rounded-2xl p-4`}>
      <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconBg}`}>
        <SummaryIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.78rem] font-semibold text-muted">{label}</p>
        <h3 className="mt-1 mb-1 text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap">
          {value}
        </h3>
        <span className="block text-[0.72rem] font-semibold text-credit">{change}</span>
      </div>
    </article>
  )
}

function PaymentBadge({ type }: { type: CreditRow['paymentType'] }) {
  const styles =
    type === 'Cash'
      ? 'bg-fuel-soft text-[#a67c00]'
      : type === 'Online'
        ? 'bg-[#e8f0fe] text-[#2563eb]'
        : 'bg-[#e8f8ee] text-credit'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${styles}`}>
      {type}
    </span>
  )
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td
      className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151] ${className}`}
    >
      {children}
    </td>
  )
}

function FunnelIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16l-6 7.5V18l-4 2v-7.5L4 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20V8l8-4 8 4v12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 10h.01M15 10h.01M12 10h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function SummaryIcon({ name }: { name: 'wallet' | 'calendar' | 'bolt' | 'users' }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'wallet') {
    return (
      <svg {...props}>
        <path d="M4 9.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
        <path d="M4 9.5 6.5 5h11L20 9.5" />
        <path d="M12 13v3" />
      </svg>
    )
  }
  if (name === 'calendar') {
    return (
      <svg {...props}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
      </svg>
    )
  }
  if (name === 'bolt') {
    return (
      <svg {...props}>
        <path d="M13 3 6 13h6l-1 8 7-10h-6l1-8Z" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a3.5 3.5 0 0 0-2.6-3.3M16.4 4a3 3 0 0 1 0 6" />
    </svg>
  )
}
