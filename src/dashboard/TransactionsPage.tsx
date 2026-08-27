import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserRole } from '../lib/auth'
import { toast } from '../toast'
import { applyDateRange, DateRangeFilter, MenuFilter, SearchableCustomerFilter } from './filters'
import { LoadingHint } from './loading'
import { PkrCell, PkrValue } from './customerDetails/ui'
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
  dateOnly,
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
  const [applied, setApplied] = useState<DraftFilters>(EMPTY_DRAFT)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [sort, setSort] = useState<TxSort>('recent')
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [customers, setCustomers] = useState<TransactionCustomer[]>(
    () => peekTransactionCustomers() ?? [],
  )

  const params: TransactionListParams = useMemo(
    () => ({
      q: debouncedQuery.trim(),
      accid: applied.accid ? Number(applied.accid) : '',
      dateFrom: applied.dateFrom,
      dateTo: applied.dateTo,
      kind: applied.kind,
      sort,
    }),
    [applied, debouncedQuery, sort],
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
    setOpenMenuId(null)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  function applyFilters() {
    setApplied({ ...draft })
    goToPage(1)
  }

  function resetFilters() {
    setDraft(EMPTY_DRAFT)
    setApplied(EMPTY_DRAFT)
    goToPage(1)
  }

  function toggleSort() {
    setSort((current) => (current === 'recent' ? 'oldest' : 'recent'))
    goToPage(1)
  }

  function openCustomer(row: TransactionRow) {
    setOpenMenuId(null)
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
        <div className="grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr_auto]">
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
            <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
              {rows.map((row, index) => (
                <MobileTxCard
                  key={row.trid}
                  row={row}
                  cardRef={index % TX_CHUNK === 4 ? afterFiveMobileRef : undefined}
                  menuOpen={openMenuId === row.trid}
                  canView={canViewCustomer}
                  onToggleMenu={() => setOpenMenuId((id) => (id === row.trid ? null : row.trid))}
                  onView={() => openCustomer(row)}
                />
              ))}
              <div ref={mobileSentinelRef} className="h-4 shrink-0" />
            </ul>

            <div className="hidden min-w-0 lg:block">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  {canViewCustomer ? <col className="w-[5%]" /> : null}
                </colgroup>
                <thead>
                  <tr>
                    <Th>
                      <button
                        type="button"
                        onClick={toggleSort}
                        className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase"
                      >
                        Date
                        <SortIcon dir={sort === 'oldest' ? 'asc' : 'desc'} />
                      </button>
                    </Th>
                    <Th>Customer</Th>
                    <Th>Type</Th>
                    <Th>Product / Service</Th>
                    <Th>Amount</Th>
                    <Th>Balance</Th>
                    <Th>Reference No.</Th>
                    <Th>Created By</Th>
                    {canViewCustomer ? <Th>Action</Th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isCredit = row.type === 'Credit'
                    return (
                      <tr
                        key={row.trid}
                        ref={index % TX_CHUNK === 4 ? afterFiveDesktopRef : undefined}
                        className="hover:bg-[#fcfcfd]"
                      >
                        <Td>
                          <span className="block leading-snug break-words">{dateOnly(row.when)}</span>
                        </Td>
                        <Td className="min-w-0 font-semibold text-ink">
                          <span className="line-clamp-2 break-words" title={row.customer}>
                            {row.customer}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                              isCredit ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
                            }`}
                          >
                            {row.type}
                          </span>
                        </Td>
                        <Td className="min-w-0">
                          <span className="line-clamp-2 break-words" title={row.product}>
                            {row.product}
                          </span>
                        </Td>
                        <Td className={isCredit ? 'font-bold text-credit' : 'font-bold text-debit'}>
                          <PkrCell value={row.amount} />
                        </Td>
                        <Td className="font-bold">
                          <PkrCell value={row.balance} />
                        </Td>
                        <Td>
                          <span className="block truncate" title={row.reference}>
                            {row.reference}
                          </span>
                        </Td>
                        <Td>
                          <span className="block break-words leading-snug">{row.by}</span>
                        </Td>
                        {canViewCustomer ? (
                          <Td>
                            <div className="relative">
                              <button
                                type="button"
                                className="rounded-lg border-0 bg-transparent px-1.5 py-1 font-extrabold tracking-widest text-muted hover:bg-[#f3f4f6] hover:text-ink"
                                aria-label={`Actions for ${row.customer}`}
                                onClick={() => setOpenMenuId((id) => (id === row.trid ? null : row.trid))}
                              >
                                ···
                              </button>
                              {openMenuId === row.trid ? (
                                <div className="absolute right-0 z-10 mt-1 min-w-[8.5rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_28px_rgba(26,29,33,0.14)]">
                                  <button
                                    type="button"
                                    className="block w-full border-0 bg-transparent px-3.5 py-2 text-left text-[0.8rem] font-semibold text-ink hover:bg-[#f7f8fa]"
                                    onClick={() => openCustomer(row)}
                                  >
                                    View
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </Td>
                        ) : null}
                      </tr>
                    )
                  })}
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

function MobileTxCard({
  row,
  cardRef,
  menuOpen,
  canView,
  onToggleMenu,
  onView,
}: {
  row: TransactionRow
  cardRef?: Ref<HTMLLIElement>
  menuOpen: boolean
  canView: boolean
  onToggleMenu: () => void
  onView: () => void
}) {
  const isCredit = row.type === 'Credit'
  return (
    <li ref={cardRef} className="border-b border-[#ECEEF2] py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[0.88rem] font-extrabold text-ink">{row.customer}</p>
          <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">{dateOnly(row.when)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold leading-none ${
              isCredit ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
            }`}
          >
            {row.type}
          </span>
          {canView ? (
            <div className="relative">
              <button
                type="button"
                className="rounded border-0 bg-transparent px-1.5 py-0.5 font-extrabold tracking-widest text-muted"
                aria-label="Actions"
                onClick={onToggleMenu}
              >
                ···
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-10 mt-1 min-w-[7.5rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_28px_rgba(26,29,33,0.14)]">
                  <button
                    type="button"
                    className="block w-full border-0 bg-transparent px-3 py-2 text-left text-[0.8rem] font-semibold"
                    onClick={onView}
                  >
                    View
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-0.5 mb-0 truncate text-[0.75rem] font-medium text-muted">{row.product}</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`m-0 text-[0.88rem] font-extrabold leading-none ${
              isCredit ? 'text-credit' : 'text-debit'
            }`}
          >
            <PkrValue value={row.amount} amountClass="font-extrabold" />
          </p>
          <p className="mt-1.5 mb-0 text-[0.68rem] font-medium text-muted">
            Balance: <PkrValue value={row.balance} className="inline text-[0.68rem]" />
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

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-line px-2 py-3 text-left text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase">
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
