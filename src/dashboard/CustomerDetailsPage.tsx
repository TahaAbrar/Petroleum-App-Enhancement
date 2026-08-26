import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '../toast'
import {
  displayText,
  fetchCustomerBySlug,
  fetchCustomerTransactions,
  formatFilterDate,
  formatPkr,
  type Customer,
  type CustomerDetail,
  type CustomerTransaction,
  type CustomerTxType,
  type HistoryKind,
  type HistorySort,
} from './customers'
import { CustomerMark } from './icons'
import { applyDateRange, DateRangeFilter } from './filters'
import { LoadingHint } from './loading'
import { panel } from './styles'

type Props = {
  slug: string
  listPath: string
  onBack: () => void
}

const PAGE = 15
const PREFETCH = 50

function useHistory(
  accid: number | null,
  kind: HistoryKind,
  dateFrom: string,
  dateTo: string,
  sort: HistorySort,
) {
  const [fetched, setFetched] = useState<CustomerTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [visible, setVisible] = useState(PAGE)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const inflight = useRef(false)
  const fetchedRef = useRef<CustomerTransaction[]>([])
  const totalRef = useRef(0)
  const gen = useRef(0)

  useEffect(() => {
    fetchedRef.current = fetched
  }, [fetched])
  useEffect(() => {
    totalRef.current = total
  }, [total])

  useEffect(() => {
    if (!accid) {
      setFetched([])
      setTotal(0)
      setLoading(false)
      return
    }
    const id = ++gen.current
    const ac = new AbortController()
    inflight.current = true
    setLoading(true)
    setFetched([])
    setVisible(PAGE)
    setTotal(0)
    fetchCustomerTransactions(
      accid,
      {
        kind,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort,
        offset: 0,
        limit: PAGE,
      },
      ac.signal,
    )
      .then((data) => {
        if (id !== gen.current) return
        setFetched(data.transactions)
        setTotal(data.total)
        setVisible(Math.min(PAGE, data.total))
      })
      .catch((err) => {
        if (ac.signal.aborted || id !== gen.current) return
        setFetched([])
        setTotal(0)
        toast.error(err instanceof Error ? err.message : 'Could not load transactions')
      })
      .finally(() => {
        if (id === gen.current) {
          inflight.current = false
          setLoading(false)
        }
      })
    return () => {
      ac.abort()
      inflight.current = false
    }
  }, [accid, kind, dateFrom, dateTo, sort])

  const loadFromServer = useCallback(
    async (limit: number) => {
      if (!accid || inflight.current) return
      const offset = fetchedRef.current.length
      if (offset >= totalRef.current) return
      inflight.current = true
      setLoadingMore(true)
      try {
        const data = await fetchCustomerTransactions(accid, {
          kind,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sort,
          offset,
          limit: Math.min(limit, 50),
        })
        setTotal(data.total)
        setFetched((prev) => {
          const seen = new Set(prev.map((row) => row.trid))
          return [...prev, ...data.transactions.filter((row) => !seen.has(row.trid))]
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load more transactions')
      } finally {
        inflight.current = false
        setLoadingMore(false)
      }
    },
    [accid, kind, dateFrom, dateTo, sort],
  )

  const revealMore = useCallback(() => {
    if (visible >= totalRef.current) return
    const next = visible + PAGE
    if (fetchedRef.current.length < Math.min(next, totalRef.current)) {
      void loadFromServer(PREFETCH)
    }
    setVisible((v) => Math.min(v + PAGE, totalRef.current || v + PAGE))
  }, [visible, loadFromServer])

  const prefetch = useCallback(() => {
    if (fetchedRef.current.length >= totalRef.current) return
    void loadFromServer(PREFETCH)
  }, [loadFromServer])

  useEffect(() => {
    if (loading) return
    void loadFromServer(PREFETCH)
  }, [loading, loadFromServer])

  return {
    rows: fetched.slice(0, Math.min(visible, fetched.length)),
    total,
    loading,
    loadingMore,
    hasMore: visible < total,
    emptyRange: Boolean(dateFrom || dateTo) && !loading && total === 0,
    revealMore,
    prefetch,
  }
}

export function CustomerDetailsPage({ slug, listPath, onBack }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const preview = (location.state as { customer?: Customer } | null)?.customer
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [tab, setTab] = useState<HistoryKind>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<HistorySort>('recent')
  const history = useHistory(detail?.accid ?? null, tab, dateFrom, dateTo, sort)
  const afterFiveMobileRef = useRef<HTMLLIElement | null>(null)
  const afterFiveDesktopRef = useRef<HTMLTableRowElement | null>(null)
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null)
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setDetailLoading(true)
    fetchCustomerBySlug(slug, ac.signal)
      .then((customer) => {
        setDetail(customer)
        if (customer.slug && customer.slug !== slug) {
          navigate(`${listPath}/${customer.slug}`, { replace: true, state: location.state })
        }
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load customer details')
        navigate(listPath)
      })
      .finally(() => {
        if (!ac.signal.aborted) setDetailLoading(false)
      })
    return () => ac.abort()
  }, [slug, listPath, navigate, location.state])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const watch = (target: Element | null) => {
      if (!target) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) history.revealMore()
        },
        { root: null, rootMargin: '160px 0px', threshold: 0.01 },
      )
      observer.observe(target)
      observers.push(observer)
    }
    watch(afterFiveMobileRef.current)
    watch(afterFiveDesktopRef.current)
    watch(mobileSentinelRef.current)
    watch(desktopSentinelRef.current)
    return () => observers.forEach((o) => o.disconnect())
  }, [history.revealMore, history.hasMore, tab, history.rows.length])

  const view: CustomerDetail = detail ?? {
    accid: preview?.accid ?? 0,
    id: preview?.id ?? '—',
    slug: preview?.slug ?? slug,
    name: preview?.name ?? 'Loading…',
    phone: preview?.phone ?? '',
    email: preview?.email ?? '',
    cnic: preview?.cnic ?? '',
    address: preview?.address ?? '',
    notes: preview?.notes ?? '',
    currentBalance: preview?.currentBalance ?? 0,
    openingBalance: preview?.openingBalance ?? 0,
    status: preview?.status ?? 'Active',
    type: preview?.type ?? '',
    createdAt: preview?.createdAt ?? '',
    totalCredit: 0,
    totalDebit: 0,
    transactionCount: 0,
  }

  function handleTab(next: HistoryKind) {
    if (next === tab) return
    setDateFrom('')
    setDateTo('')
    setTab(next)
  }

  const emptyMessage = history.emptyRange
    ? 'No transactions in this date range'
    : 'No records found.'

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent px-0 py-1 text-[0.9rem] font-bold text-[#c99700]"
        >
          <BackChevron />
          Back
        </button>
        <h1 className="m-0 flex-1 text-center text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink pr-12">
          Customer Details
        </h1>
      </div>

      <div className="hidden items-center justify-between gap-3 lg:flex">
        <p className="m-0 text-[0.82rem] font-medium text-muted">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 font-medium text-muted hover:text-ink"
          >
            Customers
          </button>
          <span className="mx-1.5 text-[#c4c9d2]">›</span>
          <span className="font-semibold text-ink">Customer Details</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
        >
          <BackChevron />
          Back to Customers
        </button>
      </div>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Customer profile">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5 lg:items-center">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-fuel-soft text-[#c99700] lg:size-[4.25rem]">
              <CustomerMark />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-[1.15rem] font-extrabold tracking-[-0.02em] text-ink lg:text-[1.35rem]">
                  {view.name}
                </h2>
                <StatusPill status={view.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <IdChip label="Customer ID" value={displayText(view.id)} accent />
                <IdChip label="CNIC" value={displayText(view.cnic)} />
              </div>
            </div>
          </div>

          <div className="hidden gap-3 lg:flex">
            <BalanceChip
              label="Opening Balance"
              value={formatPkr(view.openingBalance)}
              icon="wallet"
              tone="muted"
            />
            <BalanceChip
              label="Closing Balance"
              value={formatPkr(view.currentBalance)}
              icon="wallet"
              tone={view.currentBalance < 0 ? 'debit' : 'credit'}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 lg:hidden">
        <BalanceCard
          label="Opening Balance"
          value={formatPkr(view.openingBalance)}
          valueClass="text-ink"
          iconTone="fuel"
        />
        <BalanceCard
          label="Closing Balance"
          value={formatPkr(view.currentBalance)}
          valueClass={view.currentBalance < 0 ? 'text-debit' : 'text-credit'}
          iconTone="amber"
        />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            label="Total Credit"
            value={detailLoading ? '…' : compactPkr(view.totalCredit)}
            tone="credit"
          />
          <MiniStat
            label="Total Debit"
            value={detailLoading ? '…' : compactPkr(view.totalDebit)}
            tone="debit"
          />
          <MiniStat
            label="Transactions"
            value={detailLoading ? '…' : String(view.transactionCount)}
            tone="blue"
          />
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1fr_250px] lg:gap-4">
        <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Customer information">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">
            Customer Information
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <InfoIconCard icon="user" iconTone="fuel" label="Customer Name" value={view.name} />
            <InfoIconCard icon="phone" iconTone="sky" label="Phone" value={displayText(view.phone)} />
            <InfoIconCard icon="email" iconTone="credit" label="Email" value={displayText(view.email)} />
            <InfoIconCard
              icon="pin"
              iconTone="amber"
              label="Address"
              value={displayText(view.address)}
              className="sm:col-span-2 xl:col-span-2"
            />
            <InfoIconCard
              icon="clipboard"
              iconTone="orange"
              label="Opening Balance"
              value={formatPkr(view.openingBalance)}
            />
            <InfoIconCard
              icon="down"
              iconTone="credit"
              label="Closing Balance"
              value={formatPkr(view.currentBalance)}
              valueTone={view.currentBalance < 0 ? 'debit' : 'credit'}
            />
            <InfoIconCard
              icon="note"
              iconTone="fuel"
              label="Notes"
              value={displayText(view.notes)}
              className="sm:col-span-2 xl:col-span-2"
            />
            <InfoIconCard
              icon="calendar"
              iconTone="sky"
              label="Account Since"
              value={formatFilterDate(view.createdAt)}
            />
          </div>
        </section>

        <aside className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Summary">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">Summary</h3>
          <div className="flex flex-col gap-2.5">
            <SummaryCard
              label="Total Credit"
              value={detailLoading ? '…' : formatPkr(view.totalCredit)}
              tone="credit"
              icon="down"
            />
            <SummaryCard
              label="Total Debit"
              value={detailLoading ? '…' : formatPkr(view.totalDebit)}
              tone="debit"
              icon="up"
            />
            <SummaryCard
              label="Transactions"
              value={detailLoading ? '…' : String(view.transactionCount)}
              tone="blue"
              icon="doc"
            />
          </div>
        </aside>
      </div>

      <section
        className={`${panel} rounded-2xl p-4 lg:p-5`}
        aria-label="Transaction history"
        tabIndex={0}
        onFocus={history.prefetch}
        onPointerEnter={history.prefetch}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-1 border-b border-line sm:border-0">
            {(
              [
                ['all', 'Transaction History'],
                ['credit', 'Credit History'],
                ['debit', 'Debit History'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTab(id)}
                className={`cursor-pointer border-0 bg-transparent px-3 py-2.5 text-[0.8rem] font-bold transition ${
                  tab === id
                    ? 'border-b-2 border-fuel text-ink'
                    : 'border-b-2 border-transparent text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <DateRangeFilter
              variant="pill"
              grouped
              from={dateFrom}
              to={dateTo}
              onFromChange={(next) => {
                const range = applyDateRange('from', next, dateFrom, dateTo)
                setDateFrom(range.from)
                setDateTo(range.to)
              }}
              onToChange={(next) => {
                const range = applyDateRange('to', next, dateFrom, dateTo)
                setDateFrom(range.from)
                setDateTo(range.to)
              }}
            />
            <div
              className="inline-flex rounded-full border border-line bg-[#f4f5f7] p-0.5"
              role="group"
              aria-label="Sort transactions"
            >
              {(
                [
                  ['recent', 'Recent'],
                  ['oldest', 'Oldest'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-[0.72rem] font-bold ${
                    sort === id ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
          {history.rows.map((row, index) => (
            <li
              key={row.trid}
              ref={index === 4 ? afterFiveMobileRef : undefined}
              className="flex items-center justify-between gap-3 border-b border-[#ECEEF2] py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="m-0 text-[0.84rem] font-extrabold text-ink">{row.id}</p>
                <p className="mt-0.5 mb-0 truncate text-[0.72rem] font-medium text-muted">
                  {row.when} · {row.product}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <TypeBadge type={row.type} />
                <p
                  className={`mt-1 mb-0 text-[0.8rem] font-extrabold ${
                    row.type === 'Credit' ? 'text-credit' : 'text-debit'
                  }`}
                >
                  {row.type === 'Credit' ? '+' : '-'}
                  {formatPkr(row.amount)}
                </p>
              </div>
            </li>
          ))}
          {history.loading && (
            <li>
              <LoadingHint label="Loading transactions…" />
            </li>
          )}
          {!history.loading && history.rows.length === 0 && (
            <li className="py-8 text-center text-sm font-medium text-muted">{emptyMessage}</li>
          )}
          <div ref={mobileSentinelRef} className="h-4 shrink-0" />
          {history.loadingMore && (
            <li>
              <LoadingHint compact label="Loading more…" />
            </li>
          )}
        </ul>

        <div className="hidden min-w-0 lg:block">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[7%]" />
              <col className="w-[20%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr>
                {[
                  'ID',
                  'Date & Time',
                  'Type',
                  'Product / Service',
                  'Quantity',
                  'Rate',
                  'Amount',
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
              {history.rows.map((row, index) => (
                <tr
                  key={row.trid}
                  ref={index === 4 ? afterFiveDesktopRef : undefined}
                  className="hover:bg-[#fcfcfd]"
                >
                  <Td className="font-semibold text-ink">
                    <span className="block truncate" title={row.id}>
                      {row.id}
                    </span>
                  </Td>
                  <Td>
                    <WhenCell value={row.when} />
                  </Td>
                  <Td>
                    <TypeBadge type={row.type} />
                  </Td>
                  <Td className="min-w-0">
                    <span className="line-clamp-2 break-words" title={row.product}>
                      {row.product}
                    </span>
                  </Td>
                  <Td>
                    <span className="block break-words">{row.quantity}</span>
                  </Td>
                  <Td>
                    <span className="block break-words">{row.rate}</span>
                  </Td>
                  <Td className={row.type === 'Credit' ? 'font-bold text-credit' : 'font-bold text-debit'}>
                    <PkrCell value={row.amount} />
                  </Td>
                  <Td className="font-bold">
                    <PkrCell value={row.balance} />
                  </Td>
                  <Td>
                    <span className="block break-words leading-snug">{row.by}</span>
                  </Td>
                </tr>
              ))}
              {history.loading && (
                <tr>
                  <td colSpan={9}>
                    <LoadingHint label="Loading transactions…" />
                  </td>
                </tr>
              )}
              {!history.loading && history.rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm font-medium text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div ref={desktopSentinelRef} className="h-4" />
          {history.loadingMore && <LoadingHint compact label="Loading more…" />}
        </div>
      </section>
    </div>
  )
}

function compactPkr(value: number) {
  return Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function StatusPill({ status }: { status: Customer['status'] }) {
  const active = status === 'Active'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
        active ? 'bg-credit-bg text-credit' : 'bg-[#f3f4f6] text-muted'
      }`}
    >
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: CustomerTxType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
        type === 'Credit' ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
      }`}
    >
      {type}
    </span>
  )
}

function BalanceCard({
  label,
  value,
  valueClass,
  iconTone,
}: {
  label: string
  value: string
  valueClass: string
  iconTone: 'fuel' | 'amber'
}) {
  return (
    <article className={`${panel} flex items-center gap-3 rounded-2xl p-3.5`}>
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          iconTone === 'fuel' ? 'bg-fuel-soft text-[#c99700]' : 'bg-[#fff1e0] text-orange'
        }`}
      >
        <WalletIcon />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.72rem] font-semibold text-muted">{label}</p>
        <p className={`mt-0.5 mb-0 text-[1.05rem] font-extrabold tracking-[-0.02em] ${valueClass}`}>
          {value}
        </p>
      </div>
    </article>
  )
}

function BalanceChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  icon: string
  tone: 'muted' | 'credit' | 'debit'
}) {
  return (
    <div className="min-w-[11rem] rounded-2xl border border-line bg-[#fafbfc] px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-[#c99700]">
        <WalletIcon />
        <span className="text-[0.72rem] font-semibold text-muted">{label}</span>
      </div>
      <p
        className={`m-0 text-[1.05rem] font-extrabold ${
          tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'credit' | 'debit' | 'blue'
}) {
  const color =
    tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-[#2563eb]'
  return (
    <article className="rounded-2xl border border-line bg-white px-2.5 py-3 text-center shadow-card">
      <p className="m-0 text-[0.65rem] font-semibold text-muted">{label}</p>
      <p className={`mt-1 mb-0 text-[0.95rem] font-extrabold ${color}`}>{value}</p>
    </article>
  )
}

function IdChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-[#f4f5f7] px-2.5 py-1.5 text-[0.72rem]">
      <span className="font-semibold text-muted">{label}</span>
      <span className={`font-extrabold ${accent ? 'text-[#c99700]' : 'text-ink'}`}>{value}</span>
    </span>
  )
}

type IconTone = 'fuel' | 'sky' | 'credit' | 'amber' | 'orange' | 'debit'

function iconToneClass(tone: IconTone) {
  switch (tone) {
    case 'sky':
      return 'bg-[#e8f0fe] text-[#2563eb]'
    case 'credit':
      return 'bg-credit-bg text-credit'
    case 'amber':
      return 'bg-fuel-soft text-[#c99700]'
    case 'orange':
      return 'bg-[#fff1e0] text-orange'
    case 'debit':
      return 'bg-debit-bg text-debit'
    default:
      return 'bg-fuel-soft text-[#c99700]'
  }
}

function InfoIconCard({
  icon,
  iconTone,
  label,
  value,
  valueTone,
  className = '',
}: {
  icon: 'user' | 'phone' | 'email' | 'pin' | 'clipboard' | 'down' | 'note' | 'calendar'
  iconTone: IconTone
  label: string
  value: string
  valueTone?: 'credit' | 'debit'
  className?: string
}) {
  return (
    <article
      className={`flex items-start gap-3 rounded-2xl border border-line bg-[#fafbfc] p-3.5 ${className}`}
    >
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconToneClass(iconTone)}`}
      >
        <FieldIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.7rem] font-semibold text-muted">{label}</p>
        <p
          className={`mt-1 mb-0 text-[0.9rem] font-bold leading-snug break-words ${
            valueTone === 'credit'
              ? 'text-credit'
              : valueTone === 'debit'
                ? 'text-debit'
                : 'text-ink'
          }`}
        >
          {value}
        </p>
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone: 'credit' | 'debit' | 'blue'
  icon: 'down' | 'up' | 'doc'
}) {
  const color =
    tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-[#2563eb]'
  const bg =
    tone === 'credit' ? 'bg-credit-bg' : tone === 'debit' ? 'bg-debit-bg' : 'bg-[#e8f0fe]'
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-line bg-[#fafbfc] p-3.5">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${bg} ${color}`}>
        <SideIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.7rem] font-semibold text-muted">{label}</p>
        <p className={`mt-1 mb-0 text-[0.95rem] font-extrabold ${color}`}>{value}</p>
      </div>
    </article>
  )
}

function WhenCell({ value }: { value: string }) {
  const match = value.match(/^(.+?)\s+(\d{1,2}:\d{2}\s*[AP]M)$/i)
  if (!match) {
    return <span className="block leading-snug break-words">{value}</span>
  }
  return (
    <span className="block leading-snug">
      <span className="block">{match[1]}</span>
      <span className="block text-[0.7rem] font-medium text-muted">{match[2]}</span>
    </span>
  )
}

function PkrCell({ value }: { value: number }) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (
    <span className="block leading-tight tabular-nums">
      {value < 0 ? '-' : ''}
      {formatted}
      <span className="mt-0.5 block text-[0.62rem] font-semibold tracking-wide text-muted">PKR</span>
    </span>
  )
}

function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={`border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151] ${className}`}
    >
      {children}
    </td>
  )
}

function BackChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9.5 6.5 5h11L20 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function FieldIcon({
  name,
}: {
  name: 'user' | 'phone' | 'email' | 'pin' | 'clipboard' | 'down' | 'note' | 'calendar'
}) {
  const p = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'user') {
    return (
      <svg {...p}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 19.5c1.5-3.2 3.8-4.8 7-4.8s5.5 1.6 7 4.8" />
      </svg>
    )
  }
  if (name === 'phone') {
    return (
      <svg {...p}>
        <path d="M7 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3A2 2 0 0 1 18.5 19 14.5 14.5 0 0 1 5 5.5 2 2 0 0 1 7 3.5Z" />
      </svg>
    )
  }
  if (name === 'email') {
    return (
      <svg {...p}>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="m4.5 7.5 7.5 6 7.5-6" />
      </svg>
    )
  }
  if (name === 'pin') {
    return (
      <svg {...p}>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2" />
      </svg>
    )
  }
  if (name === 'clipboard') {
    return (
      <svg {...p}>
        <rect x="6" y="5" width="12" height="15" rx="2" />
        <path d="M9 5.5V4h6v1.5M9 11h6M9 15h4" />
      </svg>
    )
  }
  if (name === 'down') {
    return (
      <svg {...p}>
        <path d="M12 5v14M7 14l5 5 5-5" />
      </svg>
    )
  }
  if (name === 'note') {
    return (
      <svg {...p}>
        <path d="M8 4h7l3 3v13H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M15 4v3h3M9 12h6M9 16h4" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
    </svg>
  )
}

function SideIcon({ name }: { name: 'down' | 'up' | 'doc' }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'down') {
    return (
      <svg {...p}>
        <path d="M12 5v14M7 14l5 5 5-5" />
      </svg>
    )
  }
  if (name === 'up') {
    return (
      <svg {...p}>
        <path d="M12 19V5M7 10l5-5 5 5" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </svg>
  )
}
