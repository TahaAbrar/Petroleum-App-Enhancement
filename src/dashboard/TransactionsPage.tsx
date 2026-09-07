import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserRole } from '../lib/auth'
import { toast } from '../toast'
import { applyDateRange, DateRangeFilter, MenuFilter, SearchableCustomerFilter } from './filters'
import { LoadingHint } from './loading'
import { PkrValue } from './customerDetails/ui'
import {
  loadTransactionCustomers,
  loadTransactionsPage,
  peekTransactionCustomers,
  peekTransactions,
  clearPageCache,
  TX_PAGE_SIZE,
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
  EMPTY_TX_SUMMARY,
  buildTransactionDisplayRows,
  deleteTransaction,
  groupByVoucher,
  realDeleteTrid,
  updateTransactionAccid,
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
  const canDelete = role === 'Administrator'
  const customersPath = role === 'Accountant' ? '/accountant/customers' : '/customers'

  const [draft, setDraft] = useState<DraftFilters>(EMPTY_DRAFT)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [sort] = useState<TxSort>('oldest')
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
  const [loading, setLoading] = useState(() => !seeded)
  const [deleteRow, setDeleteRow] = useState<TransactionRow | null>(null)
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'password'>('confirm')
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [editRow, setEditRow] = useState<TransactionRow | null>(null)
  const [editAccid, setEditAccid] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const skipSearchPageReset = useRef(true)
  const loadSerial = useRef(0)

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

  const applyTxPage = useCallback(
    (data: { rows: TransactionRow[]; total: number; summary: TransactionSummary }) => {
      setFetched(data.rows)
      setTotal(data.total)
      setSummary(data.summary)
    },
    [],
  )

  const refreshTx = useCallback(
    async (silent: boolean, serial?: number) => {
      const mine = serial ?? loadSerial.current
      const cached = peekTransactions(params, page)
      if (!silent && !cached) setLoading(true)
      try {
        const data = await loadTransactionsPage(params, page, { force: true })
        if (mine !== loadSerial.current) return
        applyTxPage(data)
        if (!silent && page * TX_PAGE_SIZE < data.total) {
          void loadTransactionsPage(params, page + 1, { force: true })
        }
      } catch (err) {
        if (mine !== loadSerial.current || silent || cached) return
        setFetched([])
        setTotal(0)
        setSummary(EMPTY_TX_SUMMARY)
        toast.error(err instanceof Error ? err.message : 'Could not load transactions')
      } finally {
        if (mine === loadSerial.current && !silent) setLoading(false)
      }
    },
    [params, page, applyTxPage],
  )

  useEffect(() => {
    const mine = ++loadSerial.current
    const cached = peekTransactions(params, page)
    if (cached) {
      applyTxPage(cached)
      setLoading(false)
    } else {
      setFetched([])
      setLoading(true)
    }
    void refreshTx(false, mine)
  }, [params, page, applyTxPage, refreshTx])

  useLiveRefresh(() => {
    void refreshTx(true)
  })

  const displayRows = useMemo(() => buildTransactionDisplayRows(fetched), [fetched])
  const voucherGroups = useMemo(() => groupByVoucher(displayRows), [displayRows])
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

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
        vno: Number(editRow.vno),
        type: editRow.ledgerType,
      })
      clearPageCache()
      notifyDataChanged()
      setEditRow(null)
      setEditAccid('')
      setEditPassword('')
      toast.success(result.message || 'Account updated')
      const data = await loadTransactionsPage(params, page, { force: true })
      applyTxPage(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update account')
    } finally {
      setSavingEdit(false)
    }
  }, [editRow, savingEdit, editPassword, editAccid, params, page, applyTxPage])

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
      const data = await loadTransactionsPage(params, page, { force: true })
      applyTxPage(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete transaction')
    } finally {
      setDeleting(false)
    }
  }, [deleteRow, deleting, adminPassword, voucherGroups, displayRows, params, page, applyTxPage])

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
        <div className="relative z-30 grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr]">
          <div className="relative z-30 flex min-w-0 flex-col gap-1.5 overflow-visible">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Customer</span>
            <SearchableCustomerFilter
              value={draft.accid}
              customers={customers}
              onChange={(next) => setDraft((current) => ({ ...current, accid: next }))}
            />
          </div>

          <div className="relative z-20 flex min-w-0 flex-col gap-1.5 overflow-visible">
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
          </div>

          <div className="relative z-10 flex min-w-0 flex-col gap-1.5 overflow-visible">
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
          </div>
        </div>
      </section>

      <section className="relative z-0 lg:hidden" aria-label="Summary">
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

      <section className="relative z-0 hidden grid-cols-4 gap-4 lg:grid" aria-label="Summary">
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

        {loading && fetched.length === 0 ? (
          <LoadingHint label="Loading transactions…" />
        ) : total === 0 ? (
          <p className="my-10 text-center text-sm font-semibold text-muted">No transactions found.</p>
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
                        onEdit={requestEdit}
                        onDelete={requestDelete}
                      />
                    )),
                  )}
                </tbody>
              </table>
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
          accounts={customers}
          newAccid={editAccid}
          password={editPassword}
          saving={savingEdit}
          onAccidChange={setEditAccid}
          onPasswordChange={setEditPassword}
          onClose={closeEditModal}
          onConfirm={() => void confirmEdit()}
        />
      ) : null}
    </div>
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
