import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserRole } from '../lib/auth'
import { toast } from '../toast'
import { applyDateRange, MenuFilter, SearchableCustomerFilter } from './filters'
import { LoadingHint } from './loading'
import { PkrValue } from './customerDetails/ui'
import {
  loadTransactionCustomers,
  loadTransactionsPage,
  peekTransactionCustomers,
  peekTransactions,
  TX_CHUNK,
  TX_PAGE_SIZE,
} from './pageCache'
import { panel } from './styles'
import {
  EMPTY_TX_SUMMARY,
  buildTransactionDisplayRows,
  formatTxDate,
  groupByVoucher,
  ledgerAmount,
  type TransactionCustomer,
  type TransactionListParams,
  type TransactionRow,
  type TransactionSummary,
  type TxKind,
  type TxSort,
} from './transactions'

type Props = {
  homePath: string
  searchQuery?: string
}

type DraftFilters = {
  accid: string
  dateFrom: string
  dateTo: string
  kind: TxKind
}

const EMPTY_DRAFT: DraftFilters = {
  accid: '',
  dateFrom: '',
  dateTo: '',
  kind: 'all',
}

export function TransactionsPage({ homePath, searchQuery = '' }: Props) {
  const navigate = useNavigate()
  const role = getUserRole()
  const canViewCustomer = role === 'Administrator' || role === 'Accountant'
  const customersPath = role === 'Accountant' ? '/accountant/customers' : '/customers'

  const [draft, setDraft] = useState<DraftFilters>(EMPTY_DRAFT)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [sort, setSort] = useState<TxSort>('recent')
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState<TransactionCustomer[]>(
    () => peekTransactionCustomers() ?? [],
  )

  const params: TransactionListParams = useMemo(
    () => ({
      q: debouncedQuery.trim(),
      accid: draft.accid ? Number(draft.accid) : '',
      dateFrom: draft.dateFrom,
      dateTo: draft.dateTo,
      kind: draft.kind,
      sort,
    }),
    [draft, debouncedQuery, sort],
  )

  const seeded = peekTransactions(params, page)
  const [fetched, setFetched] = useState<TransactionRow[]>(() => seeded?.rows ?? [])
  const [total, setTotal] = useState(() => seeded?.total ?? 0)
  const [summary, setSummary] = useState<TransactionSummary>(() => seeded?.summary ?? EMPTY_TX_SUMMARY)
  const [visible, setVisible] = useState(() => Math.min(TX_CHUNK, seeded?.rows.length ?? 0))
  const [loading, setLoading] = useState(() => !seeded)
  const fetchedRef = useRef(fetched)
  const afterFiveMobileRef = useRef<HTMLLIElement | null>(null)
  const afterFiveDesktopRef = useRef<HTMLTableRowElement | null>(null)
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null)
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null)

  const skipSearchPageReset = useRef(true)

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
    const cached = peekTransactions(params, page)
    if (cached) {
      setFetched(cached.rows)
      setTotal(cached.total)
      setSummary(cached.summary)
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
        setSummary(data.summary)
        setVisible(Math.min(TX_CHUNK, data.rows.length))
        if (data.rows.length === TX_PAGE_SIZE && page * TX_PAGE_SIZE < data.total) {
          void loadTransactionsPage(params, page + 1)
        }
      })
      .catch((err) => {
        if (cancelled || cached) return
        setFetched([])
        setTotal(0)
        setSummary(EMPTY_TX_SUMMARY)
        toast.error(err instanceof Error ? err.message : 'Could not load transactions')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [params, page])

  const rows = fetched.slice(0, Math.min(visible, fetched.length))
  const displayRows = useMemo(() => buildTransactionDisplayRows(rows), [rows])
  const voucherGroups = useMemo(() => groupByVoucher(displayRows), [displayRows])
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
  }, [draft.accid, draft.dateFrom, draft.dateTo, draft.kind])

  function openCustomer(row: TransactionRow) {
    if (!canViewCustomer) return
    navigate(`${customersPath}/${row.slug}`)
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

      <section
        className={`${panel} relative z-30 overflow-visible rounded-2xl p-4 lg:p-5`}
        aria-label="Filters"
      >
        <div className="grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr]">
          <label className="relative z-10 flex min-w-0 flex-col gap-1.5 overflow-visible">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Customer</span>
            <SearchableCustomerFilter
              value={draft.accid}
              customers={customers}
              onChange={(next) => setDraft((current) => ({ ...current, accid: next }))}
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Date Range</span>
            <div
              className="flex w-full items-center gap-1.5"
              role="group"
              aria-label="Filter by date range"
            >
              <input
                type="date"
                value={draft.dateFrom}
                onChange={(e) => {
                  const range = applyDateRange('from', e.target.value, draft.dateFrom, draft.dateTo)
                  setDraft((current) => ({ ...current, dateFrom: range.from, dateTo: range.to }))
                }}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-[#fafbfc] px-3 text-[0.82rem] font-medium text-ink outline-none focus:border-fuel sm:h-11"
                aria-label="From date"
              />
              <span className="hidden text-[0.75rem] font-semibold text-muted sm:inline" aria-hidden="true">
                –
              </span>
              <input
                type="date"
                value={draft.dateTo}
                onChange={(e) => {
                  const range = applyDateRange('to', e.target.value, draft.dateFrom, draft.dateTo)
                  setDraft((current) => ({ ...current, dateFrom: range.from, dateTo: range.to }))
                }}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-[#fafbfc] px-3 text-[0.82rem] font-medium text-ink outline-none focus:border-fuel sm:h-11"
                aria-label="To date"
              />
            </div>
          </label>

          <label className="relative z-10 flex min-w-0 flex-col gap-1.5 overflow-visible">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">
              Transaction Type
            </span>
            <MenuFilter
              fullWidth
              icon="type"
              value={draft.kind === 'all' ? '' : draft.kind}
              placeholder="All Types"
              ariaLabel="Filter by transaction type"
              onChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  kind: next === 'credit' || next === 'debit' ? next : 'all',
                }))
              }
              options={[
                { value: '', label: 'All Types' },
                { value: 'credit', label: 'Credit' },
                { value: 'debit', label: 'Debit' },
              ]}
            />
          </label>
        </div>
      </section>

      <section className="lg:hidden" aria-label="Summary">
        <h2 className="mb-2.5 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">Summary</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryMobile
            tone="fuel"
            label="Total Transactions"
            value={String(summary.totalTransactions)}
            icon="swap"
          />
          <SummaryMobile
            tone="credit"
            label="Total Credit"
            value={summary.totalCredit}
            isPkr
            icon="down"
          />
          <SummaryMobile
            tone="debit"
            label="Total Debit"
            value={summary.totalDebit}
            isPkr
            icon="up"
          />
          <SummaryMobile
            tone="blue"
            label="Net Flow"
            value={summary.netFlow}
            isPkr
            icon="wallet"
          />
        </div>
      </section>

      <section className="hidden grid-cols-4 gap-4 lg:grid" aria-label="Summary">
        <SummaryDesktop
          label="Total Transactions"
          value={summary.totalTransactions.toLocaleString('en-US')}
          iconBg="bg-fuel text-ink"
          icon="swap"
        />
        <SummaryDesktop
          label="Total Credit"
          value={summary.totalCredit}
          isPkr
          iconBg="bg-credit-bg text-credit"
          icon="down"
        />
        <SummaryDesktop
          label="Total Debit"
          value={summary.totalDebit}
          isPkr
          iconBg="bg-debit-bg text-debit"
          icon="up"
        />
        <SummaryDesktop
          label="Net Flow"
          value={summary.netFlow}
          isPkr
          iconBg="bg-[#e8f0fe] text-[#2563eb]"
          icon="wallet"
        />
      </section>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="All transactions">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">
            All Transactions
          </h2>
        </div>

        {loading && rows.length === 0 ? (
          <LoadingHint label="Loading transactions…" />
        ) : total === 0 ? (
          <p className="my-10 text-center text-sm font-semibold text-muted">No transactions found.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
              {voucherGroups.map((group, groupIndex) => (
                <MobileVoucherCard
                  key={group.key}
                  group={group}
                  cardRef={
                    groupIndex > 0 && groupIndex % Math.max(1, Math.floor(TX_CHUNK / 2)) === 0
                      ? afterFiveMobileRef
                      : undefined
                  }
                  canView={canViewCustomer}
                  onView={openCustomer}
                />
              ))}
              <div ref={mobileSentinelRef} className="h-4 shrink-0" />
            </ul>

            <div className="hidden min-w-0 lg:block">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[30%]" />
                  <col className="w-[12%]" />
                  <col className="w-[19%]" />
                  <col className="w-[19%]" />
                </colgroup>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>V.No</Th>
                    <Th>Account Name</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Debit</Th>
                    <Th className="text-right">Credit</Th>
                  </tr>
                </thead>
                <tbody>
                  {voucherGroups.flatMap((group, groupIndex) =>
                    group.rows.map((row, legIndex) => (
                      <tr
                        key={row.trid}
                        ref={
                          groupIndex % Math.max(1, Math.floor(TX_CHUNK / 2)) === 4 &&
                          legIndex === 0
                            ? afterFiveDesktopRef
                            : undefined
                        }
                        className={`hover:bg-[#fcfcfd] ${
                          legIndex === group.rows.length - 1 ? 'border-b-2 border-[#e8eaee]' : ''
                        }`}
                      >
                        <Td>
                          <span className="block leading-snug break-words">{formatTxDate(row.when)}</span>
                        </Td>
                        <Td className="font-semibold text-ink">{row.vno || '—'}</Td>
                        <Td className="min-w-0 font-semibold text-ink">
                          {canViewCustomer ? (
                            <button
                              type="button"
                              onClick={() => openCustomer(row)}
                              className="line-clamp-2 cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-ink hover:text-[#c99700]"
                              title={row.customer}
                            >
                              {row.customer}
                            </button>
                          ) : (
                            <span className="line-clamp-2 break-words" title={row.customer}>
                              {row.customer}
                            </span>
                          )}
                        </Td>
                        <Td>{row.paymentType || '—'}</Td>
                        <Td className={`text-right font-bold ${row.debit > 0 ? 'text-debit' : ''}`}>
                          {ledgerAmount(row.debit)}
                        </Td>
                        <Td className={`text-right font-bold ${row.credit > 0 ? 'text-credit' : ''}`}>
                          {ledgerAmount(row.credit)}
                        </Td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
              <div ref={desktopSentinelRef} className="h-4" />
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-1 lg:justify-end">
                <PagerBtn
                  disabled={safePage <= 1}
                  onClick={() => goToPage(Math.max(1, safePage - 1))}
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
                      onClick={() => goToPage(n)}
                      ariaLabel={`Page ${n}`}
                    >
                      {n}
                    </PagerBtn>
                  ),
                )}
                <PagerBtn
                  disabled={safePage >= totalPages}
                  onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
                  ariaLabel="Next page"
                >
                  ›
                </PagerBtn>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function MobileVoucherCard({
  group,
  cardRef,
  canView,
  onView,
}: {
  group: { key: string; rows: TransactionRow[] }
  cardRef?: Ref<HTMLLIElement>
  canView: boolean
  onView: (row: TransactionRow) => void
}) {
  return (
    <li ref={cardRef} className={`${panel} rounded-2xl p-3.5`}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {group.rows.map((row) => (
          <li key={row.trid} className="rounded-xl bg-[#fafbfc] px-3 py-2.5">
            <p className="m-0 text-[0.72rem] font-semibold text-muted">
              {formatTxDate(row.when)} · V.No {row.vno} · {row.paymentType}
            </p>
            {canView ? (
              <button
                type="button"
                onClick={() => onView(row)}
                className="m-0 block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[0.84rem] font-extrabold text-ink"
              >
                {row.customer}
              </button>
            ) : (
              <p className="m-0 truncate text-[0.84rem] font-extrabold text-ink">{row.customer}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 text-[0.78rem]">
              <div>
                <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">Debit</p>
                <p className={`mt-1 mb-0 font-extrabold ${row.debit > 0 ? 'text-debit' : 'text-muted'}`}>
                  {ledgerAmount(row.debit)}
                </p>
              </div>
              <div>
                <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">Credit</p>
                <p className={`mt-1 mb-0 font-extrabold ${row.credit > 0 ? 'text-credit' : 'text-muted'}`}>
                  {ledgerAmount(row.credit)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </li>
  )
}

function SummaryMobile({
  tone,
  label,
  value,
  isPkr,
  icon,
}: {
  tone: 'fuel' | 'credit' | 'debit' | 'blue'
  label: string
  value: string | number
  isPkr?: boolean
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
        {isPkr && typeof value === 'number' ? (
          <PkrValue value={value} amountClass="font-extrabold" />
        ) : (
          value
        )}
      </p>
    </article>
  )
}

function SummaryDesktop({
  label,
  value,
  isPkr,
  iconBg,
  icon,
}: {
  label: string
  value: string | number
  isPkr?: boolean
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
        <h3 className="mt-1 mb-0 text-[1.15rem] font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap">
          {isPkr && typeof value === 'number' ? (
            <PkrValue value={value} amountClass="font-extrabold" />
          ) : (
            value
          )}
        </h3>
      </div>
    </article>
  )
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-line px-2 py-3 text-left text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
  rowSpan,
}: {
  children: ReactNode
  className?: string
  rowSpan?: number
}) {
  return (
    <td
      rowSpan={rowSpan}
      className={`border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151] ${className}`}
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
