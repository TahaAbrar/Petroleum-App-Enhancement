import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ALL_TRANSACTIONS,
  DEFAULT_DATE_LABEL,
  TX_CUSTOMERS,
  TX_SUMMARY,
  type TransactionRow,
  type TxType,
} from './transactionsData'
import { panel } from './styles'

type Props = {
  homePath: string
  searchQuery?: string
}

type Filters = {
  customer: string
  dateLabel: string
  type: 'All' | TxType
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export function TransactionsPage({ homePath, searchQuery = '' }: Props) {
  const [draft, setDraft] = useState<Filters>({
    customer: '',
    dateLabel: DEFAULT_DATE_LABEL,
    type: 'All',
  })
  const [applied, setApplied] = useState<Filters>(draft)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let rows = ALL_TRANSACTIONS.filter((row) => {
      if (applied.customer && row.customer !== applied.customer) return false
      if (applied.type !== 'All' && row.type !== applied.type) return false
      if (!q) return true
      return (
        row.id.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.product.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q)
      )
    })

    rows = [...rows].sort((a, b) => {
      const cmp = a.dateKey.localeCompare(b.dateKey) || a.id.localeCompare(b.id)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [applied, searchQuery, sortDir])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const showingFrom = total === 0 ? 0 : start + 1
  const showingTo = Math.min(start + pageSize, total)

  function applyFilters() {
    setApplied({ ...draft })
    setPage(1)
  }

  function resetFilters() {
    const next: Filters = {
      customer: '',
      dateLabel: DEFAULT_DATE_LABEL,
      type: 'All',
    }
    setDraft(next)
    setApplied(next)
    setPage(1)
  }

  function toggleSort() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '…')[] = [1]
    const left = Math.max(2, safePage - 1)
    const right = Math.min(totalPages - 1, safePage + 1)
    if (left > 2) pages.push('…')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('…')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
            Transactions
          </h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="text-ink">Transactions</span>
          </p>
        </div>
        <button
          type="button"
          className="hidden cursor-pointer items-center gap-2 rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.84rem] font-bold text-ink shadow-[0_6px_16px_rgba(245,197,24,0.32)] hover:brightness-95 lg:inline-flex"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4v12M12 16l-4-4M12 16l4-4M5 20h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Filters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Customer</span>
            <div className="relative">
              <select
                value={draft.customer}
                onChange={(e) => setDraft((f) => ({ ...f, customer: e.target.value }))}
                className="w-full cursor-pointer appearance-none rounded-xl border border-line bg-[#fafbfc] py-2.5 pr-9 pl-3 text-[0.85rem] font-medium text-ink outline-none focus:border-fuel"
              >
                <option value="">Search customer...</option>
                {TX_CUSTOMERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Date Range</span>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={draft.dateLabel}
                className="w-full rounded-xl border border-line bg-[#fafbfc] py-2.5 pr-10 pl-3 text-[0.85rem] font-medium text-ink outline-none"
              />
              <svg
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">
              Transaction Type
            </span>
            <div className="relative">
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft((f) => ({ ...f, type: e.target.value as Filters['type'] }))
                }
                className="w-full cursor-pointer appearance-none rounded-xl border border-line bg-[#fafbfc] py-2.5 pr-9 pl-3 text-[0.85rem] font-medium text-ink outline-none focus:border-fuel"
              >
                <option value="All">All Types</option>
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
            </div>
          </label>

          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
            <button
              type="button"
              onClick={resetFilters}
              className="flex-1 cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa] xl:flex-none"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.85rem] font-bold text-ink shadow-[0_4px_12px_rgba(245,197,24,0.28)] hover:brightness-95 xl:flex-none"
            >
              <FunnelIcon />
              Filter
            </button>
          </div>
        </div>
      </section>

      {/* Summary — mobile 2x2 tinted */}
      <section className="lg:hidden" aria-label="Summary">
        <h2 className="mb-2.5 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">Summary</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryMobile
            tone="fuel"
            label="Total Transactions"
            value={TX_SUMMARY.totalTransactions.value}
            change="+12.5%"
            changeUp
            icon="swap"
          />
          <SummaryMobile
            tone="credit"
            label="Total Credit"
            value={`${TX_SUMMARY.totalCredit.value} PKR`}
            change="+8.4%"
            changeUp
            icon="down"
          />
          <SummaryMobile
            tone="debit"
            label="Total Debit"
            value={`${TX_SUMMARY.totalDebit.value} PKR`}
            change="+6.2%"
            changeUp={false}
            icon="up"
          />
          <SummaryMobile
            tone="blue"
            label="Net Flow"
            value={`${TX_SUMMARY.netFlow.value} PKR`}
            change="+5.3%"
            changeUp
            icon="wallet"
          />
        </div>
      </section>

      {/* Summary — desktop row */}
      <section className="hidden grid-cols-4 gap-4 lg:grid" aria-label="Summary">
        <SummaryDesktop
          label="Total Transactions"
          value={TX_SUMMARY.totalTransactions.value}
          change={TX_SUMMARY.totalTransactions.change}
          tone="up"
          iconBg="bg-fuel text-ink"
          icon="swap"
        />
        <SummaryDesktop
          label="Total Credit"
          value={`${TX_SUMMARY.totalCredit.value} PKR`}
          change={TX_SUMMARY.totalCredit.change}
          tone="up"
          iconBg="bg-credit-bg text-credit"
          icon="down"
        />
        <SummaryDesktop
          label="Total Debit"
          value={`${TX_SUMMARY.totalDebit.value} PKR`}
          change={TX_SUMMARY.totalDebit.change}
          tone="down"
          iconBg="bg-debit-bg text-debit"
          icon="up"
        />
        <SummaryDesktop
          label="Net Flow"
          value={`${TX_SUMMARY.netFlow.value} PKR`}
          change={TX_SUMMARY.netFlow.change}
          tone="up"
          iconBg="bg-[#e8f0fe] text-[#2563eb]"
          icon="wallet"
        />
      </section>

      {/* List / Table */}
      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="All transactions">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">
            All Transactions
          </h2>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="text-[0.78rem] font-medium text-muted">
              Showing {showingFrom} to {showingTo} of {total} transactions
            </span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                  setPage(1)
                }}
                className="cursor-pointer appearance-none rounded-lg border border-line bg-[#fafbfc] py-1.5 pr-8 pl-2.5 text-[0.78rem] font-semibold text-ink outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted" size={14} />
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
          {pageRows.map((row) => (
            <MobileTxCard
              key={row.id}
              row={row}
              menuOpen={openMenuId === row.id}
              onToggleMenu={() => setOpenMenuId((id) => (id === row.id ? null : row.id))}
            />
          ))}
          {pageRows.length === 0 && (
            <li className="py-10 text-center text-sm font-medium text-muted">No transactions found.</li>
          )}
        </ul>

        {/* Desktop table */}
        <div className="-mx-1 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase"
                  >
                    Date &amp; Time
                    <SortIcon dir={sortDir} />
                  </button>
                </Th>
                <Th>Customer</Th>
                <Th>Type</Th>
                <Th>Product / Service</Th>
                <Th>Amount (PKR)</Th>
                <Th>Balance (PKR)</Th>
                <Th>Reference No.</Th>
                <Th>Created By</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const isCredit = row.type === 'Credit'
                return (
                  <tr key={row.id} className="hover:bg-[#fcfcfd]">
                    <Td className="font-semibold text-ink">{row.id}</Td>
                    <Td>{row.when}</Td>
                    <Td>{row.customer}</Td>
                    <Td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
                          isCredit ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
                        }`}
                      >
                        {row.type}
                      </span>
                    </Td>
                    <Td>{row.product}</Td>
                    <Td className={`font-bold ${isCredit ? 'text-credit' : 'text-debit'}`}>
                      {row.amount}
                    </Td>
                    <Td>{row.balance}</Td>
                    <Td>{row.reference}</Td>
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
                              Export
                            </button>
                          </div>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm font-medium text-muted">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-4 flex items-center justify-center gap-1 lg:justify-end">
            <PagerBtn
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              ariaLabel="Previous page"
            >
              ‹
            </PagerBtn>
            {pageNumbers().map((n, i) =>
              n === '…' ? (
                <span key={`e-${i}`} className="px-1.5 text-sm text-muted">
                  …
                </span>
              ) : (
                <PagerBtn
                  key={n}
                  active={n === safePage}
                  onClick={() => setPage(n)}
                  ariaLabel={`Page ${n}`}
                >
                  {n}
                </PagerBtn>
              ),
            )}
            <PagerBtn
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              ariaLabel="Next page"
            >
              ›
            </PagerBtn>
          </div>
        )}
      </section>
    </div>
  )
}

function MobileTxCard({
  row,
  menuOpen,
  onToggleMenu,
}: {
  row: TransactionRow
  menuOpen: boolean
  onToggleMenu: () => void
}) {
  const isCredit = row.type === 'Credit'
  return (
    <li className="border-b border-[#ECEEF2] py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.88rem] font-extrabold text-ink">{row.id}</p>
          <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">{row.when}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold leading-none ${
              isCredit ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
            }`}
          >
            {row.type}
          </span>
          <div className="relative">
            <button
              type="button"
              className="rounded border-0 bg-transparent px-1.5 py-0.5 font-extrabold tracking-widest text-muted"
              aria-label="Actions"
              onClick={onToggleMenu}
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 min-w-[7.5rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_28px_rgba(26,29,33,0.14)]">
                <button
                  type="button"
                  className="block w-full border-0 bg-transparent px-3 py-2 text-left text-[0.8rem] font-semibold"
                  onClick={onToggleMenu}
                >
                  View
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-[0.9rem] font-bold text-ink">{row.customer}</p>
          <p className="mt-0.5 mb-0 truncate text-[0.75rem] font-medium text-muted">{row.product}</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`m-0 text-[0.88rem] font-extrabold leading-none ${
              isCredit ? 'text-credit' : 'text-debit'
            }`}
          >
            {row.amount} PKR
          </p>
          <p className="mt-1.5 mb-0 text-[0.68rem] font-medium text-muted">
            Balance: {row.balance} PKR
          </p>
        </div>
      </div>
    </li>
  )
}

function SummaryMobile({
  tone,
  label,
  value,
  change,
  changeUp,
  icon,
}: {
  tone: 'fuel' | 'credit' | 'debit' | 'blue'
  label: string
  value: string
  change: string
  changeUp: boolean
  icon: 'swap' | 'down' | 'up' | 'wallet'
}) {
  const bg =
    tone === 'fuel'
      ? 'bg-[#FFF8E1]'
      : tone === 'credit'
        ? 'bg-[#E8F8EE]'
        : tone === 'debit'
          ? 'bg-[#FDE8EC]'
          : 'bg-[#E8F0FE]'
  const iconColor =
    tone === 'fuel'
      ? 'text-[#E6A800]'
      : tone === 'credit'
        ? 'text-credit'
        : tone === 'debit'
          ? 'text-debit'
          : 'text-[#2563eb]'

  return (
    <article className={`rounded-2xl ${bg} p-3.5`}>
      <div className={`mb-2 ${iconColor}`}>
        <StatGlyph name={icon} />
      </div>
      <p className="m-0 text-[0.7rem] font-semibold text-muted">{label}</p>
      <p className="mt-1 mb-0 text-[0.95rem] font-extrabold leading-tight tracking-[-0.02em] text-ink">
        {value}
      </p>
      <p
        className={`mt-1 mb-0 text-[0.68rem] font-bold ${changeUp ? 'text-credit' : 'text-debit'}`}
      >
        {change}
      </p>
    </article>
  )
}

function SummaryDesktop({
  label,
  value,
  change,
  tone,
  iconBg,
  icon,
}: {
  label: string
  value: string
  change: string
  tone: 'up' | 'down'
  iconBg: string
  icon: 'swap' | 'down' | 'up' | 'wallet'
}) {
  return (
    <article className={`${panel} flex items-start gap-3 rounded-2xl p-4`}>
      <div className={`grid size-11 shrink-0 place-items-center rounded-full ${iconBg}`}>
        <StatGlyph name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.78rem] font-semibold text-muted">{label}</p>
        <h3 className="mt-1 mb-1 text-[1.15rem] font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap">
          {value}
        </h3>
        <span
          className={`block text-[0.72rem] font-semibold ${
            tone === 'up' ? 'text-credit' : 'text-debit'
          }`}
        >
          {change}
        </span>
      </div>
    </article>
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

function PagerBtn({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`grid min-w-9 cursor-pointer place-items-center rounded-lg border-0 px-2.5 py-2 text-[0.84rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-fuel text-ink shadow-[0_4px_10px_rgba(245,197,24,0.35)]'
          : 'bg-transparent text-muted hover:bg-[#f3f4f6] hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function ChevronDown({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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

function SortIcon({ dir }: { dir: 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 10 5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={dir === 'asc' ? 1 : 0.35}
      />
      <path
        d="m7 14 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={dir === 'desc' ? 1 : 0.35}
      />
    </svg>
  )
}

function StatGlyph({ name }: { name: 'swap' | 'down' | 'up' | 'wallet' }) {
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
  if (name === 'swap') {
    return (
      <svg {...props}>
        <path d="M7 8h11l-3-3" />
        <path d="M17 16H6l3 3" />
      </svg>
    )
  }
  if (name === 'down') {
    return (
      <svg {...props}>
        <path d="M12 5v14M7 14l5 5 5-5" />
      </svg>
    )
  }
  if (name === 'up') {
    return (
      <svg {...props}>
        <path d="M12 19V5M7 10l5-5 5 5" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <path d="M4 9.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
      <path d="M4 9.5 6.5 5h11L20 9.5" />
      <path d="M12 13v3" />
    </svg>
  )
}
