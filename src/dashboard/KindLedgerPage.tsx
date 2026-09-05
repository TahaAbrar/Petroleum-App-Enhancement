import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../toast'
import { formatPkrAmount } from './customers'
import { applyDateRange, DateRangeFilter, SearchableCustomerFilter } from './filters'
import { LoadingHint } from './loading'
import {
  loadTransactionCustomers,
  loadTransactionsPage,
  peekTransactionCustomers,
  peekTransactions,
  TX_CHUNK,
  TX_PAGE_SIZE,
} from './pageCache'
import { panel } from './styles'
import { PkrCell, PkrValue } from './customerDetails/ui'
import {
  dateOnly,
  EMPTY_KIND_STATS,
  fetchKindStats,
  type KindStats,
  type TransactionCustomer,
  type TransactionListParams,
  type TransactionRow,
} from './transactions'

type Props = {
  homePath: string
  kind: 'credit' | 'debit'
  title: string
  subtitle: string
  searchQuery?: string
}

type DraftFilters = {
  accid: string
  dateFrom: string
  dateTo: string
}

const EMPTY_DRAFT: DraftFilters = {
  accid: '',
  dateFrom: '',
  dateTo: '',
}

export function KindLedgerPage({ homePath, kind, title, subtitle, searchQuery = '' }: Props) {
  const [draft, setDraft] = useState<DraftFilters>(EMPTY_DRAFT)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState<TransactionCustomer[]>(
    () => peekTransactionCustomers() ?? [],
  )
  const [kindStats, setKindStats] = useState<KindStats>(EMPTY_KIND_STATS)
  const [statsLoading, setStatsLoading] = useState(true)

  const params: TransactionListParams = useMemo(
    () => ({
      q: debouncedQuery.trim(),
      accid: draft.accid ? Number(draft.accid) : '',
      dateFrom: draft.dateFrom,
      dateTo: draft.dateTo,
      kind,
      sort: 'recent',
    }),
    [draft, debouncedQuery, kind],
  )

  const seeded = peekTransactions(params, page)
  const [fetched, setFetched] = useState<TransactionRow[]>(() => seeded?.rows ?? [])
  const [total, setTotal] = useState(() => seeded?.total ?? 0)
  const [visible, setVisible] = useState(() => Math.min(TX_CHUNK, seeded?.rows.length ?? 0))
  const [loading, setLoading] = useState(() => !seeded)
  const fetchedRef = useRef(fetched)
  const afterFiveMobileRef = useRef<HTMLLIElement | null>(null)
  const afterFiveDesktopRef = useRef<HTMLTableRowElement | null>(null)
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null)
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null)
  const skipSearchPageReset = useRef(true)

  const isCredit = kind === 'credit'
  const amountTone = isCredit ? 'text-credit' : 'text-debit'

  useEffect(() => {
    fetchedRef.current = fetched
  }, [fetched])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(searchQuery)
      if (skipSearchPageReset.current) {
        skipSearchPageReset.current = false
        return
      }
      setPage(1)
    }, 200)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    loadTransactionCustomers()
      .then(setCustomers)
      .catch(() => toast.error('Could not load customers'))
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)
    fetchKindStats(kind)
      .then((stats) => {
        if (!cancelled) setKindStats(stats)
      })
      .catch(() => {
        if (!cancelled) setKindStats(EMPTY_KIND_STATS)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind])

  useEffect(() => {
    let cancelled = false
    const cached = peekTransactions(params, page)
    if (cached) {
      setFetched(cached.rows)
      setTotal(cached.total)
      setVisible(Math.min(TX_CHUNK, cached.rows.length))
      setLoading(false)
    } else {
      setFetched([])
      setVisible(TX_CHUNK)
      setLoading(true)
    }
    loadTransactionsPage(params, page)
      .then((data) => {
        if (cancelled) return
        setFetched(data.rows)
        setTotal(data.total)
        setVisible(Math.min(TX_CHUNK, data.rows.length))
        if (data.rows.length === TX_PAGE_SIZE && page * TX_PAGE_SIZE < data.total) {
          void loadTransactionsPage(params, page + 1)
        }
      })
      .catch((err) => {
        if (cancelled || cached) return
        setFetched([])
        setTotal(0)
        toast.error(err instanceof Error ? err.message : `Could not load ${title.toLowerCase()} records`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [params, page, title])

  const rows = fetched.slice(0, Math.min(visible, fetched.length))
  const hasMore = visible < fetched.length
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const revealMore = useCallback(() => {
    setVisible((v) => Math.min(v + TX_CHUNK, fetchedRef.current.length || v + TX_CHUNK))
  }, [])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const watch = (target: Element | null) => {
      if (!target) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) revealMore()
        },
        { root: null, rootMargin: '220px 0px', threshold: 0.01 },
      )
      observer.observe(target)
      observers.push(observer)
    }
    watch(afterFiveMobileRef.current)
    watch(afterFiveDesktopRef.current)
    watch(mobileSentinelRef.current)
    watch(desktopSentinelRef.current)
    return () => observers.forEach((o) => o.disconnect())
  }, [revealMore, hasMore, rows.length])

  function goToPage(next: number) {
    setPage(next)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  useEffect(() => {
    setPage(1)
  }, [draft.accid, draft.dateFrom, draft.dateTo])

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

  const totalLabel = isCredit ? 'Total Credit' : 'Total Debit'
  const monthLabel = isCredit ? 'This Month Credit' : 'This Month Debit'
  const todayLabel = isCredit ? "Today's Credit" : "Today's Debit"

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div>
        <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
          {title}
        </h1>
        <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted lg:hidden">{subtitle}</p>
        <p className="mt-1 mb-0 hidden text-[0.78rem] font-medium text-muted lg:block">
          <Link to={homePath} className="text-muted no-underline hover:text-ink">
            Home
          </Link>
          <span className="mx-1.5 text-[#c4c9d2]">›</span>
          <span className="text-ink">{title}</span>
        </p>
      </div>

      <section
        className={`${panel} relative z-30 overflow-visible rounded-2xl p-4 lg:p-5`}
        aria-label="Filters"
      >
        <div className="relative z-30 grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5 overflow-visible">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Customer</span>
            <SearchableCustomerFilter
              value={draft.accid}
              customers={customers}
              onChange={(next) => setDraft((current) => ({ ...current, accid: next }))}
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1.5 overflow-visible">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Date Range</span>
            <DateRangeFilter
              grouped
              fullWidth
              from={draft.dateFrom}
              to={draft.dateTo}
              onFromChange={(next) => {
                const range = applyDateRange('from', next, draft.dateFrom, draft.dateTo)
                setDraft((current) => ({ ...current, dateFrom: range.from, dateTo: range.to }))
              }}
              onToChange={(next) => {
                const range = applyDateRange('to', next, draft.dateFrom, draft.dateTo)
                setDraft((current) => ({ ...current, dateFrom: range.from, dateTo: range.to }))
              }}
            />
          </label>
        </div>
      </section>

      <section
        className="relative z-0 -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0"
        aria-label={`${title} summary`}
        style={{ scrollbarWidth: 'none' }}
      >
        <SummaryCard
          label={totalLabel}
          value={statsLoading ? '…' : formatPkrAmount(kindStats.total)}
          isPkr={!statsLoading}
          tint="fuel"
          icon="wallet"
        />
        <SummaryCard
          label={monthLabel}
          value={statsLoading ? '…' : formatPkrAmount(kindStats.month)}
          isPkr={!statsLoading}
          tint="amber"
          icon="calendar"
        />
        <SummaryCard
          label={todayLabel}
          value={statsLoading ? '…' : formatPkrAmount(kindStats.today)}
          isPkr={!statsLoading}
          tint="sky"
          icon="bolt"
        />
        <SummaryCard
          label="Total Customers"
          value={statsLoading ? '…' : kindStats.totalCustomers.toLocaleString('en-US')}
          tint="rose"
          icon="users"
        />
      </section>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label={`${title} transactions`}>
        <h2 className="m-0 mb-3 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">
          {isCredit ? 'Credit Transactions' : 'Debit Transactions'}
        </h2>

        {loading && rows.length === 0 ? (
          <LoadingHint label={`Loading ${title.toLowerCase()} records…`} />
        ) : rows.length === 0 ? (
          <p className="my-10 text-center text-sm font-semibold text-muted">
            No {title.toLowerCase()} records found.
          </p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
              {rows.map((row, i) => (
                <li
                  key={row.trid}
                  ref={i === 4 ? afterFiveMobileRef : undefined}
                  className="flex items-center gap-3 border-b border-[#ECEEF2] py-3.5 last:border-b-0"
                >
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                      isCredit ? 'bg-fuel-soft text-[#c99700]' : 'bg-debit-bg text-debit'
                    }`}
                  >
                    {isCredit ? <BuildingIcon /> : <FuelIcon />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[0.9rem] font-bold text-ink">{row.customer}</p>
                    <p className="mt-0.5 mb-0 truncate text-[0.72rem] font-medium text-muted">
                      {dateOnly(row.when)} · {row.reference}
                    </p>
                  </div>
                  <p className={`m-0 shrink-0 text-right text-[0.84rem] font-extrabold ${amountTone}`}>
                    {isCredit ? '+' : '-'}
                    <PkrValue value={row.amount} amountClass="font-extrabold" />
                  </p>
                </li>
              ))}
              {hasMore ? <div ref={mobileSentinelRef} className="h-1" aria-hidden="true" /> : null}
            </ul>

            <div className="hidden min-w-0 lg:block">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr>
                    {[
                      'Customer',
                      'Date',
                      'Amount',
                      'Product / Service',
                      'Reference',
                      'Balance',
                      'Created By',
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-line px-2 py-3 text-left text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.trid}
                      ref={i === 4 ? afterFiveDesktopRef : undefined}
                      className="hover:bg-[#fcfcfd]"
                    >
                      <td className="border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151]">
                        <span className="line-clamp-2 break-words" title={row.customer}>
                          {row.customer}
                        </span>
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151]">
                        {dateOnly(row.when)}
                      </td>
                      <td className={`border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] font-bold ${amountTone}`}>
                        <PkrCell value={row.amount} />
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151]">
                        <span className="line-clamp-2 break-words" title={row.product}>
                          {row.product}
                        </span>
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151]">
                        {row.reference}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] font-bold text-[#374151]">
                        <PkrCell value={row.balance} />
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151]">
                        <span className="block break-words leading-snug">{row.by}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore ? <div ref={desktopSentinelRef} className="h-1" aria-hidden="true" /> : null}
            </div>

            {totalPages > 1 ? (
              <nav
                className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
                aria-label="Pagination"
              >
                <PagerBtn disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)}>
                  Prev
                </PagerBtn>
                {pageNumbers().map((n, i) =>
                  n === '…' ? (
                    <span key={`e-${i}`} className="px-1 text-sm text-muted">
                      …
                    </span>
                  ) : (
                    <PagerBtn key={n} active={n === safePage} onClick={() => goToPage(n)}>
                      {n}
                    </PagerBtn>
                  ),
                )}
                <PagerBtn disabled={safePage >= totalPages} onClick={() => goToPage(safePage + 1)}>
                  Next
                </PagerBtn>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  isPkr,
  tint,
  icon,
}: {
  label: string
  value: string
  isPkr?: boolean
  tint: 'fuel' | 'amber' | 'sky' | 'rose'
  icon: 'wallet' | 'calendar' | 'bolt' | 'users'
}) {
  const bg =
    tint === 'fuel'
      ? 'bg-fuel-soft lg:bg-white'
      : tint === 'amber'
        ? 'bg-[#fff1e0] lg:bg-white'
        : tint === 'sky'
          ? 'bg-[#e0f2fe] lg:bg-white'
          : 'bg-[#fde8f0] lg:bg-white'

  return (
    <article className={`min-w-[7.6rem] shrink-0 rounded-2xl p-4 ${bg} ${panel} lg:min-w-0 lg:flex lg:items-start lg:gap-3`}>
      <div
        className={`hidden size-11 shrink-0 place-items-center rounded-xl lg:grid ${
          tint === 'fuel'
            ? 'bg-fuel-soft text-[#c99700]'
            : tint === 'amber'
              ? 'bg-[#fff1e0] text-orange'
              : tint === 'sky'
                ? 'bg-[#e8f0fe] text-[#2563eb]'
                : 'bg-[#fde8f0] text-[#db2777]'
        }`}
      >
        <SummaryIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.72rem] font-semibold text-muted lg:text-[0.78rem]">{label}</p>
        <h3 className="mt-1 mb-0 text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap lg:text-[1.1rem]">
          {value}
          {isPkr ? (
            <span className="ml-1 text-[0.68rem] font-normal text-muted lg:text-[0.72rem]">PKR</span>
          ) : null}
        </h3>
      </div>
    </article>
  )
}

function PagerBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-[2.25rem] cursor-pointer rounded-lg border px-2.5 py-1.5 text-[0.78rem] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-fuel bg-fuel text-ink'
          : 'border-line bg-white text-ink hover:bg-[#f7f8fa]'
      }`}
    >
      {children}
    </button>
  )
}

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V8l8-4 8 4v12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function FuelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M5 20h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
