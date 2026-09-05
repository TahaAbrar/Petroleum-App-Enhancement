import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserRole } from '../lib/auth'
import { toast } from '../toast'
import { formatPkrAmount } from './customers'
import { BalanceTrendChart, CreditDebitChart } from './charts'
import {
  EMPTY_DASHBOARD_STATS,
  fetchBalanceTrend,
  fetchCreditDebitChart,
  fetchDashboardStats,
  type BalanceTrendPoint,
  type ChartRange,
  type CreditDebitPoint,
  type DashboardStats,
} from './dashboard'
import { StatIcon } from './icons'
import { LoadingHint } from './loading'
import { MobileSearchField } from './MobileSearchField'
import {
  EMPTY_TX_FILTERS,
  loadTransactionsPage,
  peekTransactions,
  clearPageCache,
} from './pageCache'
import { panel, selectBtn } from './styles'
import {
  DeleteTxModal,
  MobileVoucherCard,
  TxLedgerRow,
  TxTableColgroup,
  TxTableHead,
} from './TxListViews'
import {
  buildTransactionDisplayRows,
  deleteTransaction,
  groupByVoucher,
  realDeleteTrid,
  type TransactionRow,
} from './transactions'

type Props = {
  txPath: string
  searchQuery?: string
  onSearchChange?: (value: string) => void
}

const RECENT_LIMIT = 5

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '1m', label: '1 Month' },
  { value: '6m', label: '6 Months' },
]

export function DashboardHome({ txPath, searchQuery = '', onSearchChange }: Props) {
  const navigate = useNavigate()
  const role = getUserRole()
  const canViewCustomer = role === 'Administrator' || role === 'Accountant'
  const canDelete = role === 'Administrator'
  const customersPath = role === 'Accountant' ? '/accountant/customers' : '/customers'

  const seeded = peekTransactions(EMPTY_TX_FILTERS, 1)
  const [rows, setRows] = useState<TransactionRow[]>(() => seeded?.rows ?? [])
  const [loading, setLoading] = useState(() => !seeded)
  const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS)
  const [statsLoading, setStatsLoading] = useState(true)
  const [creditDebit, setCreditDebit] = useState<CreditDebitPoint[]>([])
  const [creditDebitLoading, setCreditDebitLoading] = useState(true)
  const [trendRange, setTrendRange] = useState<ChartRange>('7d')
  const [balanceTrend, setBalanceTrend] = useState<BalanceTrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(true)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<TransactionRow | null>(null)
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'password'>('confirm')
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = peekTransactions(EMPTY_TX_FILTERS, 1)
    if (cached) {
      setRows(cached.rows)
      setLoading(false)
    } else {
      setLoading(true)
    }
    loadTransactionsPage(EMPTY_TX_FILTERS, 1, { force: true })
      .then((data) => {
        if (cancelled) return
        setRows(data.rows)
      })
      .catch((err) => {
        if (cancelled || cached) return
        setRows([])
        toast.error(err instanceof Error ? err.message : 'Could not load recent transactions')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)
    fetchDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_DASHBOARD_STATS)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setCreditDebitLoading(true)
    fetchCreditDebitChart()
      .then((data) => {
        if (!cancelled) setCreditDebit(data)
      })
      .catch(() => {
        if (!cancelled) setCreditDebit([])
      })
      .finally(() => {
        if (!cancelled) setCreditDebitLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setTrendLoading(true)
    fetchBalanceTrend(trendRange)
      .then((data) => {
        if (!cancelled) setBalanceTrend(data)
      })
      .catch(() => {
        if (!cancelled) setBalanceTrend([])
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [trendRange])

  const filteredTx = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.product.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        String(t.vno).toLowerCase().includes(q) ||
        t.paymentType.toLowerCase().includes(q),
    )
  }, [searchQuery, rows])

  const displayRows = useMemo(() => buildTransactionDisplayRows(filteredTx), [filteredTx])
  const voucherGroups = useMemo(
    () => groupByVoucher(displayRows).slice(0, RECENT_LIMIT),
    [displayRows],
  )

  const closeDeleteModal = useCallback(() => {
    if (deleting) return
    setDeleteRow(null)
    setDeleteStep('confirm')
    setAdminPassword('')
  }, [deleting])

  const requestDelete = useCallback((row: TransactionRow) => {
    setDeleteRow(row)
    setDeleteStep('confirm')
    setAdminPassword('')
  }, [])

  const openPasswordStep = useCallback(() => {
    if (!deleteRow || deleting) return
    setAdminPassword('')
    setDeleteStep('password')
  }, [deleteRow, deleting])

  const confirmDelete = useCallback(async () => {
    if (!deleteRow || deleting) return
    const password = adminPassword.trim()
    if (!password) {
      toast.error('Enter admin password')
      return
    }
    const group = voucherGroups.find((g) => g.rows.some((r) => r.trid === deleteRow.trid))
    const trid = realDeleteTrid(deleteRow, group?.rows ?? displayRows)
    if (!trid) {
      toast.error('Could not resolve this transaction for delete')
      return
    }
    setDeleting(true)
    try {
      const result = await deleteTransaction(trid, password)
      clearPageCache()
      setDeleteRow(null)
      setDeleteStep('confirm')
      setAdminPassword('')
      toast.success(result.message || 'Debit and Credit entries deleted')
      const data = await loadTransactionsPage(EMPTY_TX_FILTERS, 1, { force: true })
      setRows(data.rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete transaction')
    } finally {
      setDeleting(false)
    }
  }, [deleteRow, deleting, adminPassword, voucherGroups, displayRows])

  function openCustomer(row: TransactionRow) {
    if (!canViewCustomer) return
    navigate(`${customersPath}/${row.slug}`)
  }

  const statCards = [
    {
      id: 'customers',
      label: 'Total Customers',
      value: statsLoading ? '…' : stats.totalCustomers.toLocaleString('en-US'),
      unit: '',
      icon: 'customers' as const,
      mobileSpan: 'full' as const,
    },
    {
      id: 'credit',
      label: 'Total Credit',
      value: statsLoading ? '…' : formatPkrAmount(stats.totalCredit),
      isPkr: !statsLoading,
      icon: 'credit' as const,
      mobileSpan: 'half' as const,
    },
    {
      id: 'debit',
      label: 'Total Debit',
      value: statsLoading ? '…' : formatPkrAmount(stats.totalDebit),
      isPkr: !statsLoading,
      icon: 'debit' as const,
      mobileSpan: 'half' as const,
    },
    {
      id: 'tx',
      label: "Today's Transactions",
      value: statsLoading ? '…' : stats.todayTransactions.toLocaleString('en-US'),
      unit: '',
      icon: 'tx' as const,
      mobileSpan: 'full' as const,
    },
  ]

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === trendRange)?.label ?? '7 Days'

  return (
    <>
      {onSearchChange ? (
        <MobileSearchField
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search here..."
          ariaLabel="Search dashboard"
        />
      ) : null}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Summary">
        {statCards.map((s, i) => {
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
                  className={`mt-1 mb-0 font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap ${
                    isHalf
                      ? 'text-[1rem] leading-none xl:text-[1.15rem]'
                      : 'text-[1.35rem] leading-tight xl:text-[1.25rem]'
                  }`}
                >
                  {s.value}
                  {s.isPkr ? (
                    <span
                      className={`ml-1 font-normal text-muted ${
                        isHalf ? 'text-[0.68rem]' : 'text-[0.75rem]'
                      }`}
                    >
                      PKR
                    </span>
                  ) : s.unit ? (
                    <span
                      className={`ml-1 font-bold text-muted ${
                        isHalf ? 'text-[0.68rem]' : 'text-[0.75rem]'
                      }`}
                    >
                      {s.unit}
                    </span>
                  ) : null}
                </h3>
              </div>
            </article>
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-2 xl:gap-4" aria-label="Analytics">
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
          <CreditDebitChart data={creditDebit} loading={creditDebitLoading} />
        </article>

        <article className={`${panel} rounded-3xl p-4`} style={{ animationDelay: '0.26s' }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 text-[0.95rem] font-extrabold tracking-[-0.01em] xl:text-base">
              Balance Trend
            </h2>
            <div className="relative">
              <button
                type="button"
                className={`${selectBtn} text-[0.65rem]`}
                onClick={() => setRangeOpen((v) => !v)}
                aria-expanded={rangeOpen}
              >
                {rangeLabel}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              {rangeOpen ? (
                <div className="absolute right-0 z-20 mt-1 min-w-[8rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_28px_rgba(26,29,33,0.14)]">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`block w-full border-0 bg-transparent px-3.5 py-2 text-left text-[0.78rem] font-semibold hover:bg-[#f7f8fa] ${
                        opt.value === trendRange ? 'text-ink' : 'text-muted'
                      }`}
                      onClick={() => {
                        setTrendRange(opt.value)
                        setRangeOpen(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <BalanceTrendChart data={balanceTrend} loading={trendLoading} rangeKey={trendRange} />
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
            onClick={() => navigate(txPath)}
            className="cursor-pointer rounded-lg border border-[#F5C518]/35 bg-[#FFFCEB] px-3 py-1.5 text-[0.75rem] font-bold text-[#E6A800] shadow-none hover:brightness-95 lg:border-0 lg:bg-fuel lg:px-4 lg:py-2 lg:text-[0.8rem] lg:text-ink lg:shadow-[0_6px_14px_rgba(245,197,24,0.3)]"
          >
            View All
          </button>
        </div>

        {loading && voucherGroups.length === 0 ? (
          <LoadingHint label="Loading recent transactions…" />
        ) : voucherGroups.length === 0 ? (
          <p className="my-8 text-center text-sm font-semibold text-muted">No transactions found.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
              {voucherGroups.map((group) => (
                <MobileVoucherCard
                  key={group.key}
                  group={group}
                  canView={canViewCustomer}
                  canDelete={canDelete}
                  onView={openCustomer}
                  onDelete={requestDelete}
                />
              ))}
            </ul>

            <div className="hidden min-w-0 lg:block">
              <table className="w-full table-fixed border-collapse">
                <TxTableColgroup canDelete={canDelete} />
                <TxTableHead canDelete={canDelete} />
                <tbody>
                  {voucherGroups.flatMap((group) =>
                    group.rows.map((row, legIndex) => (
                      <TxLedgerRow
                        key={row.trid}
                        row={row}
                        legIndex={legIndex}
                        groupSize={group.rows.length}
                        canView={canViewCustomer}
                        canDelete={canDelete}
                        onView={openCustomer}
                        onDelete={requestDelete}
                      />
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {deleteRow ? (
        <DeleteTxModal
          step={deleteStep}
          password={adminPassword}
          deleting={deleting}
          onPasswordChange={setAdminPassword}
          onClose={closeDeleteModal}
          onBack={() => {
            if (deleting) return
            setDeleteStep('confirm')
            setAdminPassword('')
          }}
          onContinue={openPasswordStep}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </>
  )
}

export function SectionPlaceholder({ title, path }: { title: string; path: string }) {
  return (
    <section className={`${panel} animate-rise py-16 text-center`} aria-label={title}>
      <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted">
        This section is ready for content. URL is{' '}
        <code className="rounded bg-surface px-1.5 py-0.5 text-ink">{path}</code>
      </p>
    </section>
  )
}
