import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../toast'
import { getSession } from '../lib/auth'
import {
  displayText,
  formatFilterDate,
  formatPkrAmount,
  type CustomerDetail,
} from './customers'
import {
  BalanceCard,
  BalanceChip,
  IdChip,
  InfoIconCard,
  PkrValue,
  StatusPill,
} from './customerDetails/ui'
import { applyDateRange, DateRangeFilter } from './filters'
import { CustomerMark } from './icons'
import { LoadingHint } from './loading'
import { PortalTxTable } from './PortalTxTable'
import {
  fetchPortalMe,
  fetchPortalSummary,
  fetchPortalTransactions,
  type PortalFuelSummary,
  type PortalTransaction,
} from './portal'
import { panel } from './styles'

type Props = {
  txPath: string
}

const RECENT_LIMIT = 10

const EMPTY_SUMMARY: PortalFuelSummary = {
  hsd: 0,
  pmg: 0,
  ho: 0,
  advance: 0,
  others: 0,
}

export function CustomerPortalHome({ txPath }: Props) {
  const navigate = useNavigate()
  const session = getSession()
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [summary, setSummary] = useState<PortalFuelSummary>(EMPTY_SUMMARY)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [recent, setRecent] = useState<PortalTransaction[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentTotal, setRecentTotal] = useState(0)

  const summarySeeded = useRef(false)

  useEffect(() => {
    const ac = new AbortController()
    setDetailLoading(true)
    setSummaryLoading(true)
    fetchPortalMe({}, ac.signal)
      .then(({ customer, summary: fuel }) => {
        setDetail(customer)
        setSummary(fuel)
        summarySeeded.current = true
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load account summary')
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setDetailLoading(false)
          setSummaryLoading(false)
        }
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (!detail) return
    // Skip first empty-range run — /me already seeded all-time summary
    if (summarySeeded.current && !dateFrom && !dateTo) {
      summarySeeded.current = false
      return
    }
    const ac = new AbortController()
    setSummaryLoading(true)
    fetchPortalSummary(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
      ac.signal,
    )
      .then((fuel) => {
        if (!ac.signal.aborted) setSummary(fuel)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load fuel summary')
      })
      .finally(() => {
        if (!ac.signal.aborted) setSummaryLoading(false)
      })
    return () => ac.abort()
  }, [detail, dateFrom, dateTo])

  useEffect(() => {
    const ac = new AbortController()
    setRecentLoading(true)
    fetchPortalTransactions(
      {
        kind: 'all',
        sort: 'recent',
        offset: 0,
        limit: RECENT_LIMIT,
      },
      ac.signal,
    )
      .then((data) => {
        if (ac.signal.aborted) return
        setRecent(data.transactions.slice(0, RECENT_LIMIT))
        setRecentTotal(data.total)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        setRecent([])
        toast.error(err instanceof Error ? err.message : 'Could not load recent transactions')
      })
      .finally(() => {
        if (!ac.signal.aborted) setRecentLoading(false)
      })
    return () => ac.abort()
  }, [])

  const view: CustomerDetail = detail ?? {
    accid: session?.user?.accid ?? 0,
    id: '—',
    slug: '',
    name: session?.user?.name || session?.user?.username || 'Loading…',
    phone: '',
    email: '',
    cnic: '',
    address: '',
    notes: '',
    currentBalance: 0,
    openingBalance: 0,
    status: 'Active',
    type: '',
    createdAt: '',
    totalCredit: 0,
    totalDebit: 0,
    transactionCount: 0,
  }

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.55rem]">
            My Account
          </h1>
          <p className="mt-1 mb-0 text-[0.88rem] font-medium text-muted">
            Your fuel summary and recent activity
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(txPath)}
          className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa] lg:mt-0"
        >
          View all transactions
        </button>
      </div>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Account profile">
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
              </div>
            </div>
          </div>

          <div className="hidden gap-3 lg:flex">
            <BalanceChip
              label="Opening Balance"
              value={view.openingBalance}
              icon="wallet"
              tone="muted"
            />
            <BalanceChip
              label="Closing Balance"
              value={view.currentBalance}
              icon="wallet"
              tone={view.currentBalance < 0 ? 'debit' : 'credit'}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 lg:hidden">
        <BalanceCard
          label="Opening Balance"
          value={view.openingBalance}
          valueClass="text-ink"
          iconTone="fuel"
        />
        <BalanceCard
          label="Closing Balance"
          value={view.currentBalance}
          valueClass={view.currentBalance < 0 ? 'text-debit' : 'text-credit'}
          iconTone="amber"
        />
      </div>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Account information">
        <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">
          Account Information
        </h3>
        {detailLoading && !detail ? (
          <LoadingHint label="Loading account…" />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <InfoIconCard icon="user" iconTone="fuel" label="Customer Name" value={view.name} />
            <InfoIconCard
              icon="pin"
              iconTone="sky"
              label="Account Type / Group"
              value={displayText(view.type)}
            />
            <InfoIconCard
              icon="calendar"
              iconTone="sky"
              label="Account Since"
              value={formatFilterDate(view.createdAt)}
            />
            <InfoIconCard
              icon="clipboard"
              iconTone="orange"
              label="Opening Balance"
              valueNode={<PkrValue value={view.openingBalance} amountClass="font-bold" />}
            />
            <InfoIconCard
              icon="down"
              iconTone="credit"
              label="Closing Balance"
              valueNode={
                <PkrValue
                  value={view.currentBalance}
                  amountClass="font-bold"
                  className={view.currentBalance < 0 ? 'text-debit' : 'text-credit'}
                />
              }
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5" aria-label="Fuel summary">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="m-0 text-[1rem] font-extrabold text-ink">Summary</h3>
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
        </div>
        <FuelSummaryStrip summary={summary} loading={summaryLoading} />
      </section>

      <section aria-label="Recent transactions">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="m-0 text-[1rem] font-extrabold text-ink">Recent Transactions</h3>
          <button
            type="button"
            onClick={() => navigate(txPath)}
            className="cursor-pointer border-0 bg-transparent p-0 text-[0.8rem] font-bold text-[#c99700] hover:text-ink"
          >
            View all{recentTotal > RECENT_LIMIT ? ` (${recentTotal})` : ''}
          </button>
        </div>
        <PortalTxTable rows={recent} loading={recentLoading} showOpening={false} showTotals={false} />
      </section>
    </div>
  )
}

function FuelSummaryStrip({
  summary,
  loading,
}: {
  summary: PortalFuelSummary
  loading: boolean
}) {
  const items = [
    { label: 'HSD (Ltr)', value: summary.hsd, liters: true },
    { label: 'PMG (Ltr)', value: summary.pmg, liters: true },
    { label: 'HO (Ltr)', value: summary.ho, liters: true },
    { label: 'Advance', value: summary.advance, liters: false },
    { label: 'Others', value: summary.others, liters: false },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <article key={item.label} className={`${panel} rounded-2xl px-3 py-3`}>
          <p className="m-0 text-[0.68rem] font-semibold text-muted">{item.label}</p>
          <p className="mt-1 mb-0 text-[1rem] font-extrabold text-ink">
            {loading
              ? '…'
              : item.liters
                ? item.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                : formatPkrAmount(item.value)}
          </p>
        </article>
      ))}
    </div>
  )
}
