import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserRole } from '../lib/auth'
import { toast } from '../toast'
import { formatPkrAmount } from './customers'
import { CreditDebitChart } from './charts'
import {
  EMPTY_DASHBOARD_STATS,
  fetchBanks,
  fetchCreditDebitChart,
  fetchDashboardStats,
  type BankRow,
  type CreditDebitPoint,
  type DashboardStats,
} from './dashboard'
import { StatIcon } from './icons'
import { LoadingHint } from './loading'
import { MobileSearchField } from './MobileSearchField'
import {
  clearPageCache,
  EMPTY_TX_FILTERS,
  loadTransactionCustomers,
  loadTransactionsPage,
  peekTransactionCustomers,
  peekTransactions,
} from './pageCache'
import { notifyDataChanged, useLiveRefresh } from './liveRefresh'
import { panel } from './styles'
import {
  DeleteTxModal,
  EditAccidModal,
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
  updateTransactionAccid,
  type TransactionCustomer,
  type TransactionRow,
} from './transactions'

type Props = {
  txPath: string
  searchQuery?: string
  onSearchChange?: (value: string) => void
}

const RECENT_LIMIT = 5

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
  const [banks, setBanks] = useState<BankRow[]>([])
  const [bankTotal, setBankTotal] = useState(0)
  const [banksLoading, setBanksLoading] = useState(true)
  const [deleteRow, setDeleteRow] = useState<TransactionRow | null>(null)
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'password'>('confirm')
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [editRow, setEditRow] = useState<TransactionRow | null>(null)
  const [editAccid, setEditAccid] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [accounts, setAccounts] = useState<TransactionCustomer[]>(
    () => peekTransactionCustomers() ?? [],
  )

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

  const liveTick = useRef(0)

  useLiveRefresh(() => {
    liveTick.current += 1
    const tick = liveTick.current
    void loadTransactionsPage(EMPTY_TX_FILTERS, 1, { force: true })
      .then((data) => setRows(data.rows))
      .catch(() => {})
    void fetchDashboardStats()
      .then(setStats)
      .catch(() => {})
    // Banks change less often — refresh every 2nd poll (~30s)
    if (tick % 2 === 0) {
      void fetchBanks()
        .then((data) => {
          setBanks(data.banks)
          setBankTotal(data.totalBalance)
        })
        .catch(() => {})
    }
  })

  useEffect(() => {
    loadTransactionCustomers()
      .then(setAccounts)
      .catch(() => toast.error('Could not load accounts'))
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
    setBanksLoading(true)
    fetchBanks()
      .then((data) => {
        if (!cancelled) {
          setBanks(data.banks)
          setBankTotal(data.totalBalance)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBanks([])
          setBankTotal(0)
        }
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const requestEdit = useCallback((row: TransactionRow) => {
    setEditRow(row)
    setEditAccid('')
    setEditPassword('')
  }, [])

  const closeEditModal = useCallback(() => {
    if (savingEdit) return
    setEditRow(null)
    setEditAccid('')
    setEditPassword('')
  }, [savingEdit])

  const confirmEdit = useCallback(async () => {
    if (!editRow || savingEdit) return
    const password = editPassword.trim()
    const newAccid = Number(editAccid)
    if (!password || !Number.isFinite(newAccid) || newAccid <= 0) {
      toast.error('Enter Accid and admin password')
      return
    }
    setSavingEdit(true)
    try {
      const result = await updateTransactionAccid({
        trid: editRow.trid,
        newAccid,
        password,
      })
      clearPageCache()
      setEditRow(null)
      setEditAccid('')
      setEditPassword('')
      toast.success(result.message || 'Account updated')
      const data = await loadTransactionsPage(EMPTY_TX_FILTERS, 1, { force: true })
      setRows(data.rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update account')
    } finally {
      setSavingEdit(false)
    }
  }, [editRow, savingEdit, editPassword, editAccid])

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
      notifyDataChanged()
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

  const fuelCards = [
    {
      id: 'diesel',
      label: 'Total Diesel Sale',
      value: statsLoading
        ? '…'
        : stats.dieselSale.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      unit: statsLoading ? '' : 'L',
      isPkr: false,
      icon: 'debit' as const,
      mobileSpan: 'half' as const,
      highlightLabel: true,
    },
    {
      id: 'petrol',
      label: 'Total Petrol Sale',
      value: statsLoading
        ? '…'
        : stats.petrolSale.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      unit: statsLoading ? '' : 'L',
      isPkr: false,
      icon: 'credit' as const,
      mobileSpan: 'half' as const,
      highlightLabel: true,
    },
    {
      id: 'cash',
      label: 'Total Cash',
      value: statsLoading ? '…' : formatPkrAmount(stats.cashSale),
      isPkr: !statsLoading,
      icon: 'tx' as const,
      mobileSpan: 'half' as const,
      highlightLabel: true,
    },
    {
      id: 'udhar',
      label: 'Total Udhar',
      value: statsLoading ? '…' : formatPkrAmount(stats.udharSale),
      isPkr: !statsLoading,
      icon: 'customers' as const,
      mobileSpan: 'half' as const,
      highlightLabel: true,
    },
  ]

  function renderStatCard(
    s: {
      id: string
      label: string
      value: string
      unit?: string
      isPkr?: boolean
      icon: 'customers' | 'credit' | 'debit' | 'tx'
      mobileSpan: 'full' | 'half'
      highlightLabel?: boolean
    },
    i: number,
  ) {
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
            className={`m-0 font-extrabold leading-tight tracking-[-0.01em] text-ink ${
              isHalf ? 'text-[0.78rem] xl:text-[0.82rem]' : 'text-[0.85rem]'
            }`}
          >
            {s.label}
          </p>
          <h3
            className={`mt-1 mb-0 font-semibold tracking-[-0.02em] text-ink whitespace-nowrap ${
              isHalf
                ? 'text-[1rem] leading-none xl:text-[1.1rem]'
                : 'text-[1.25rem] leading-tight xl:text-[1.2rem]'
            }`}
          >
            {s.value}
            {s.isPkr ? (
              <span
                className={`ml-1 font-semibold text-muted ${
                  isHalf ? 'text-[0.72rem]' : 'text-[0.78rem]'
                }`}
              >
                PKR
              </span>
            ) : s.unit ? (
              <span
                className={`ml-1.5 inline-block font-extrabold text-ink ${
                  isHalf ? 'text-[0.85rem]' : 'text-[0.9rem]'
                }`}
              >
                {s.unit}
              </span>
            ) : null}
          </h3>
        </div>
      </article>
    )
  }

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
        {statCards.map((s, i) => renderStatCard(s, i))}
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Fuel sales summary">
        {fuelCards.map((s, i) => renderStatCard(s, i + 4))}
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

        <article className={`${panel} flex flex-col rounded-3xl p-4`} style={{ animationDelay: '0.26s' }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 shrink-0 text-[0.95rem] font-extrabold tracking-[-0.01em] xl:text-base">
              Banks
            </h2>
            <div className="rounded-xl border border-line bg-[#fafbfc] px-3 py-1.5 text-right">
              <p className="m-0 text-[0.62rem] font-semibold leading-tight text-muted">Total Balance</p>
              <p className="mt-0.5 mb-0 whitespace-nowrap text-[0.85rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ink">
                {banksLoading ? '…' : formatPkrAmount(bankTotal)}
                {!banksLoading ? (
                  <span className="ml-1 text-[0.65rem] font-normal text-muted">PKR</span>
                ) : null}
              </p>
            </div>
          </div>

          {banksLoading && banks.length === 0 ? (
            <LoadingHint label="Loading banks…" />
          ) : banks.length === 0 ? (
            <p className="my-6 text-center text-sm font-semibold text-muted">No banks found.</p>
          ) : (
            <div className="max-h-[220px] min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-line">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-[1]">
                  <tr className="border-b border-line bg-[#fafbfc] text-left text-[0.65rem] font-bold uppercase tracking-[0.03em] text-muted">
                    <th className="px-3 py-2">Bank</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((bank) => (
                    <tr key={bank.accid} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-[0.8rem] font-semibold text-ink">{bank.name}</td>
                      <td
                        className={`px-3 py-2 text-right text-[0.8rem] font-semibold tabular-nums ${
                          bank.balance < 0 ? 'text-debit' : 'text-ink'
                        }`}
                      >
                        {formatPkrAmount(bank.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  onEdit={requestEdit}
                  onDelete={requestDelete}
                />
              ))}
            </ul>

            <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-line lg:block">
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
                        onEdit={requestEdit}
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

      {editRow ? (
        <EditAccidModal
          currentAccid={editRow.accid}
          vno={editRow.vno}
          type={editRow.ledgerType}
          accounts={accounts}
          newAccid={editAccid}
          password={editPassword}
          saving={savingEdit}
          onAccidChange={setEditAccid}
          onPasswordChange={setEditPassword}
          onClose={closeEditModal}
          onConfirm={() => void confirmEdit()}
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
