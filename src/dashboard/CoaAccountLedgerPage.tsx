import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from '../toast'
import {
  fetchCoaAccount,
  fetchCoaAccountSummary,
  formatCoaPkr,
  type CoaAccountDetail,
  type CoaFuelSummary,
  type CoaHistoryKind,
  type CoaHistorySort,
} from './chartOfAccounts'
import { useCoaAccountHistory } from './coa/useCoaAccountHistory'
import { applyDateRange, DateRangeFilter } from './filters'
import { LoadingHint } from './loading'
import { panel } from './styles'

type Props = {
  accid: number
  coaPath: string
  homePath: string
}

const TABS = [
  ['all', 'Transaction History'],
  ['credit', 'Credit History'],
  ['debit', 'Debit History'],
] as const

const SORTS = [
  ['recent', 'Recent'],
  ['oldest', 'Oldest'],
] as const

const COLUMNS = [
  'ID',
  'Date & Time',
  'Type',
  'Product / Service',
  'Quantity',
  'Rate',
  'Amount',
  'Balance',
  'Created By',
]

export function CoaAccountLedgerPage({ accid, coaPath, homePath }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const backState = (location.state as { coaBack?: unknown } | null)?.coaBack

  const [account, setAccount] = useState<CoaAccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<CoaFuelSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [tab, setTab] = useState<CoaHistoryKind>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<CoaHistorySort>('recent')

  const history = useCoaAccountHistory(accid, tab, dateFrom, dateTo, sort)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    fetchCoaAccount(accid, ac.signal)
      .then(setAccount)
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load account')
        navigate(coaPath, { state: backState ? { coaBack: backState } : undefined })
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [accid, coaPath, navigate, backState])

  useEffect(() => {
    const ac = new AbortController()
    setSummaryLoading(true)
    fetchCoaAccountSummary(
      accid,
      { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      ac.signal,
    )
      .then(setSummary)
      .catch(() => {
        if (!ac.signal.aborted) setSummary(null)
      })
      .finally(() => {
        if (!ac.signal.aborted) setSummaryLoading(false)
      })
    return () => ac.abort()
  }, [accid, dateFrom, dateTo])

  function handleBack() {
    navigate(coaPath, { state: backState ? { coaBack: backState } : undefined })
  }

  function handleTab(next: CoaHistoryKind) {
    if (next === tab) return
    setDateFrom('')
    setDateTo('')
    setTab(next)
  }

  const view = account ?? {
    accid,
    accNo: '—',
    name: 'Loading…',
    phone: '',
    balance: 0,
    status: 'Active' as const,
    normalBalance: 'Debit' as const,
    groupName: '',
    chartName: '',
  }

  const emptyMessage =
    history.emptyRange
      ? 'No transactions in this date range.'
      : tab === 'credit'
        ? 'No credit transactions for this account.'
        : tab === 'debit'
          ? 'No debit transactions for this account.'
          : 'No transactions for this account.'

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
            Account Ledger
          </h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <button
              type="button"
              onClick={handleBack}
              className="cursor-pointer border-0 bg-transparent p-0 font-medium text-muted hover:text-ink"
            >
              Chart of Accounts
            </button>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="font-semibold text-ink">{view.name}</span>
          </p>
          <p className="mt-1.5 mb-0 text-[0.8rem] font-medium text-muted">
            {view.chartName && view.groupName
              ? `${view.chartName} › ${view.groupName}`
              : 'Account transactions from ledger'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
        >
          <BackIcon />
          Back to Accounts
        </button>
      </div>

      <article className={`${panel} flex flex-wrap items-center gap-3 rounded-2xl p-4`}>
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
          <LedgerIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.72rem] font-semibold text-muted">Account</p>
          <p className="mt-0.5 mb-0 text-[1rem] font-extrabold text-ink">{view.name}</p>
          <p className="mt-0.5 mb-0 text-[0.75rem] font-medium text-muted">
            Acc No: {view.accNo || '—'}
            {view.phone ? ` · ${view.phone}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="m-0 text-[0.72rem] font-semibold text-muted">Balance</p>
          <p
            className={`mt-0.5 mb-0 text-[1rem] font-extrabold ${
              view.normalBalance === 'Credit' ? 'text-credit' : 'text-ink'
            }`}
          >
            {loading ? '…' : formatCoaPkr(view.balance)}
          </p>
        </div>
        <span className="rounded-full bg-[#f4f5f7] px-3 py-1 text-[0.72rem] font-bold text-muted">
          {view.status}
        </span>
      </article>

      <FuelSummaryStrip summary={summary} loading={summaryLoading} />

      <section className={`${panel} rounded-2xl p-3.5 lg:p-5`}>
        <div className="mb-3.5 flex flex-col gap-3 lg:mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTab(id)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-[0.74rem] font-bold ${
                  tab === id
                    ? 'border-fuel bg-fuel-soft text-[#9a7200]'
                    : 'border-line bg-white text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onFrom={(v) => applyDateRange(v, dateTo, setDateFrom, setDateTo)}
              onTo={(v) => applyDateRange(dateFrom, v, setDateFrom, setDateTo)}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CoaHistorySort)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-[0.78rem] font-semibold text-ink"
            >
              {SORTS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {history.loading ? (
          <LoadingHint label="Loading transactions…" />
        ) : history.rows.length === 0 ? (
          <p className="m-0 py-10 text-center text-sm font-semibold text-muted">{emptyMessage}</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
              {history.rows.map((row) => (
                <li key={row.trid} className="rounded-xl border border-[#f1f2f4] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="mb-0 text-[0.72rem] font-semibold text-muted">{row.id}</p>
                      <p className="mt-0.5 mb-0 text-[0.82rem] font-bold text-ink">{row.when}</p>
                      <p className="mt-1 mb-0 text-[0.78rem] text-muted">{row.product}</p>
                    </div>
                    <div className="text-right">
                      <TypeBadge type={row.type} />
                      <p
                        className={`mt-1 mb-0 text-[0.88rem] font-extrabold ${
                          row.type === 'Credit' ? 'text-credit' : 'text-debit'
                        }`}
                      >
                        {formatCoaPkr(row.amount)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr>
                    {COLUMNS.map((h) => (
                      <th
                        key={h}
                        className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((row) => (
                    <tr key={row.trid} className="hover:bg-[#fcfcfd]">
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] text-[#374151]">
                        {row.id}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] text-[#374151]">
                        {row.when}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5">
                        <TypeBadge type={row.type} />
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] text-[#374151]">
                        {row.product}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] text-[#374151]">
                        {row.quantity}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] text-[#374151]">
                        {row.rate}
                      </td>
                      <td
                        className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-bold ${
                          row.type === 'Credit' ? 'text-credit' : 'text-debit'
                        }`}
                      >
                        {formatCoaPkr(row.amount)}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-semibold text-ink">
                        {formatCoaPkr(row.balance)}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] text-[#374151]">
                        {row.by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {history.hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={history.revealMore}
                  disabled={history.loadingMore}
                  className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.82rem] font-bold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
                >
                  {history.loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <FuelSummaryStrip summary={summary} loading={summaryLoading} />
    </div>
  )
}

function FuelSummaryStrip({
  summary,
  loading,
}: {
  summary: CoaFuelSummary | null
  loading: boolean
}) {
  const items = [
    { label: 'HSD (Ltr)', value: summary?.hsd ?? 0 },
    { label: 'PMG (Ltr)', value: summary?.pmg ?? 0 },
    { label: 'HO (Ltr)', value: summary?.ho ?? 0 },
    { label: 'Advance', value: summary?.advance ?? 0 },
    { label: 'Others', value: summary?.others ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <article key={item.label} className={`${panel} rounded-2xl px-3 py-3`}>
          <p className="m-0 text-[0.68rem] font-semibold text-muted">{item.label}</p>
          <p className="mt-1 mb-0 text-[1rem] font-extrabold text-ink">
            {loading
              ? '…'
              : item.label.includes('Ltr')
                ? item.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                : formatCoaPkr(item.value)}
          </p>
        </article>
      ))}
    </div>
  )
}

function TypeBadge({ type }: { type: 'Credit' | 'Debit' }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
        type === 'Credit' ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
      }`}
    >
      {type}
    </span>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LedgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 4a2 2 0 0 0-2 2v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 9h7M10 13h7M10 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
