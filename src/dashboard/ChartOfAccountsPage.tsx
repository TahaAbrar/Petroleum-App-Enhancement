import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from '../toast'
import { CoaAccountLedgerPage } from './CoaAccountLedgerPage'
import {
  fetchCoaAccounts,
  fetchCoaCharts,
  fetchCoaSubCharts,
  formatCoaPkr,
  type CoaAccount,
  type CoaChart,
  type CoaSubChart,
} from './chartOfAccounts'
import { useCoaGroupHistory } from './coa/useCoaAccountHistory'
import { applyDateRange, DateRangeFilter } from './filters'
import { LoadingHint } from './loading'
import { MobileSearchField } from './MobileSearchField'
import { panel } from './styles'
import { formatTxDate, ledgerAmount } from './transactions'
import { TxTableColgroup } from './TxListViews'

type Level = 'charts' | 'subCharts' | 'accounts'

type CoaBackState = {
  level: Level
  chart: CoaChart
  subChart: CoaSubChart
}

type Props = {
  homePath: string
  coaPath: string
  searchQuery?: string
  onSearchChange?: (value: string) => void
}

export function ChartOfAccountsPage({
  homePath,
  coaPath,
  searchQuery = '',
  onSearchChange,
}: Props) {
  const { accid: accidParam } = useParams<{ accid?: string }>()
  const accid = accidParam ? Number(accidParam) : NaN

  if (accidParam && Number.isFinite(accid) && accid > 0) {
    return <CoaAccountLedgerPage accid={accid} coaPath={coaPath} homePath={homePath} />
  }

  return (
    <ChartOfAccountsBrowse
      homePath={homePath}
      coaPath={coaPath}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    />
  )
}

function ChartOfAccountsBrowse({
  homePath,
  coaPath,
  searchQuery = '',
  onSearchChange,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const restored = (location.state as { coaBack?: CoaBackState } | null)?.coaBack

  const [level, setLevel] = useState<Level>(restored?.level ?? 'charts')
  const [chart, setChart] = useState<CoaChart | null>(restored?.chart ?? null)
  const [subChart, setSubChart] = useState<CoaSubChart | null>(restored?.subChart ?? null)

  const [charts, setCharts] = useState<CoaChart[]>([])
  const [subCharts, setSubCharts] = useState<CoaSubChart[]>([])

  const [chartsLoading, setChartsLoading] = useState(true)
  const [subChartsLoading, setSubChartsLoading] = useState(false)

  const q = searchQuery.trim().toLowerCase()

  useEffect(() => {
    const ac = new AbortController()
    setChartsLoading(true)
    fetchCoaCharts(ac.signal)
      .then(setCharts)
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load charts')
      })
      .finally(() => {
        if (!ac.signal.aborted) setChartsLoading(false)
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (!chart || level === 'charts') return
    const ac = new AbortController()
    setSubChartsLoading(true)
    fetchCoaSubCharts(chart.chartId, ac.signal)
      .then(setSubCharts)
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load sub charts')
      })
      .finally(() => {
        if (!ac.signal.aborted) setSubChartsLoading(false)
      })
    return () => ac.abort()
  }, [chart, level])

  const filteredCharts = useMemo(() => {
    if (!q || level !== 'charts') return charts
    return charts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        String(c.chartId).includes(q),
    )
  }, [charts, q, level])

  const filteredSubCharts = useMemo(() => {
    if (!q || level !== 'subCharts') return subCharts
    return subCharts.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.groupId).includes(q),
    )
  }, [subCharts, q, level])

  function openChart(item: CoaChart) {
    setChart(item)
    setSubChart(null)
    setSubCharts([])
    setLevel('subCharts')
  }

  function openSubChart(item: CoaSubChart) {
    setSubChart(item)
    setLevel('accounts')
  }

  function openAccount(item: CoaAccount) {
    if (!chart || !subChart) return
    navigate(`${coaPath}/account/${item.accid}`, {
      state: { coaBack: { level: 'accounts', chart, subChart } },
    })
  }

  function goCharts() {
    setLevel('charts')
    setChart(null)
    setSubChart(null)
    setSubCharts([])
  }

  function goSubCharts() {
    if (!chart) return
    setLevel('subCharts')
    setSubChart(null)
  }

  const title =
    level === 'charts'
      ? 'Chart of Accounts'
      : level === 'subCharts'
        ? 'Sub Chart of Accounts'
        : 'Accounts'

  const subtitle =
    level === 'charts'
      ? 'Select a chart to view its sub charts'
      : level === 'subCharts'
        ? `Sub charts under ${chart?.name ?? ''}`
        : `Accounts under ${subChart?.name ?? ''}`

  const totalSubCharts = charts.reduce((n, c) => n + c.subChartCount, 0)
  const totalAccounts = charts.reduce((n, c) => n + c.accountCount, 0)

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
            {title}
          </h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <button
              type="button"
              onClick={goCharts}
              className={`cursor-pointer border-0 bg-transparent p-0 font-medium ${
                level === 'charts' ? 'font-semibold text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              Chart of Accounts
            </button>
            {chart && (
              <>
                <span className="mx-1.5 text-[#c4c9d2]">›</span>
                <button
                  type="button"
                  onClick={goSubCharts}
                  className={`cursor-pointer border-0 bg-transparent p-0 font-medium ${
                    level === 'subCharts' ? 'font-semibold text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  {chart.name}
                </button>
              </>
            )}
            {subChart && (
              <>
                <span className="mx-1.5 text-[#c4c9d2]">›</span>
                <span className="font-semibold text-ink">{subChart.name}</span>
              </>
            )}
          </p>
          <p className="mt-1.5 mb-0 text-[0.8rem] font-medium text-muted">{subtitle}</p>
        </div>

        {level !== 'charts' && (
          <button
            type="button"
            onClick={level === 'accounts' ? goSubCharts : goCharts}
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
          >
            <BackIcon />
            {level === 'accounts' ? 'Back to Sub Charts' : 'Back to Charts'}
          </button>
        )}
      </div>

      {onSearchChange ? (
        <MobileSearchField
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search chart of accounts..."
          ariaLabel="Search chart of accounts"
        />
      ) : null}

      {level === 'charts' && (
        <>
          <SummaryStrip
            items={[
              { label: 'Charts', value: String(charts.length), tone: 'fuel' },
              { label: 'Sub Charts', value: String(totalSubCharts), tone: 'sky' },
              { label: 'Accounts', value: String(totalAccounts), tone: 'credit' },
            ]}
          />
          {chartsLoading ? (
            <LoadingHint label="Loading charts…" />
          ) : (
            <ChartsLevel charts={filteredCharts} onOpen={openChart} />
          )}
        </>
      )}

      {level === 'subCharts' && chart && (
        subChartsLoading ? (
          <LoadingHint label="Loading sub charts…" />
        ) : (
          <SubChartsLevel chart={chart} subCharts={filteredSubCharts} onOpen={openSubChart} />
        )
      )}

      {level === 'accounts' && subChart && chart && (
        <AccountsLevel
          chart={chart}
          subChart={subChart}
          searchQuery={searchQuery}
          onOpen={openAccount}
        />
      )}
    </div>
  )
}

function ChartsLevel({
  charts,
  onOpen,
}: {
  charts: CoaChart[]
  onOpen: (c: CoaChart) => void
}) {
  if (charts.length === 0) {
    return <EmptyState message="No charts found." />
  }

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
        {charts.map((item) => (
          <li key={item.chartId}>
            <button
              type="button"
              onClick={() => onOpen(item)}
              className={`${panel} flex w-full cursor-pointer items-center gap-3 rounded-2xl border-0 p-3.5 text-left hover:bg-[#fcfcfd]`}
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
                <LedgerIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-0 text-[0.95rem] font-extrabold text-ink">{item.name}</p>
                <p className="mt-0.5 mb-0 truncate text-[0.72rem] font-medium text-muted">
                  {item.subChartCount} sub charts · {item.accountCount} accounts
                </p>
              </div>
              <ChevronRight />
            </button>
          </li>
        ))}
      </ul>

      <section className={`hidden ${panel} rounded-2xl p-4 lg:block lg:p-5`}>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fafbfc]">
                {['Chart Name', 'Sub Charts', 'Accounts', ''].map((h) => (
                  <Th key={h || 'action'}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charts.map((item) => (
                <tr
                  key={item.chartId}
                  className="cursor-pointer hover:bg-[#fcfcfd]"
                  onClick={() => onOpen(item)}
                >
                  <Td className="font-semibold text-ink">{item.name}</Td>
                  <Td>{item.subChartCount}</Td>
                  <Td>{item.accountCount}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                      Open <ChevronRight />
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function SubChartsLevel({
  chart,
  subCharts,
  onOpen,
}: {
  chart: CoaChart
  subCharts: CoaSubChart[]
  onOpen: (s: CoaSubChart) => void
}) {
  return (
    <>
      <article className={`${panel} flex items-center gap-3 rounded-2xl p-4`}>
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
          <LedgerIcon />
        </div>
        <div className="min-w-0">
          <p className="m-0 text-[0.72rem] font-semibold text-muted">Parent Chart</p>
          <p className="mt-0.5 mb-0 text-[1rem] font-extrabold text-ink">{chart.name}</p>
        </div>
      </article>

      {subCharts.length === 0 ? (
        <EmptyState message="No sub charts found." />
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
            {subCharts.map((item) => (
              <li key={item.groupId}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className={`${panel} flex w-full cursor-pointer items-center gap-3 rounded-2xl border-0 p-3.5 text-left hover:bg-[#fcfcfd]`}
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
                    <FolderIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0 text-[0.95rem] font-extrabold text-ink">{item.name}</p>
                    <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">
                      {item.accountCount} accounts
                    </p>
                  </div>
                  <ChevronRight />
                </button>
              </li>
            ))}
          </ul>

          <section className={`hidden ${panel} rounded-2xl p-4 lg:block lg:p-5`}>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafbfc]">
                    {['Sub Chart Name', 'Accounts', ''].map((h) => (
                      <Th key={h || 'action'}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subCharts.map((item) => (
                    <tr
                      key={item.groupId}
                      className="cursor-pointer hover:bg-[#fcfcfd]"
                      onClick={() => onOpen(item)}
                    >
                      <Td className="font-semibold text-ink">{item.name}</Td>
                      <Td>{item.accountCount}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                          Open <ChevronRight />
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}

function defaultMonthDateRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${d}` }
}

function AccountsLevel({
  chart,
  subChart,
  searchQuery = '',
  onOpen,
}: {
  chart: CoaChart
  subChart: CoaSubChart
  searchQuery?: string
  onOpen: (a: CoaAccount) => void
}) {
  const defaults = useMemo(() => defaultMonthDateRange(), [])
  const [draftFrom, setDraftFrom] = useState(defaults.from)
  const [draftTo, setDraftTo] = useState(defaults.to)
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [accounts, setAccounts] = useState<CoaAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)

  const history = useCoaGroupHistory(subChart.groupId, appliedFrom, appliedTo)
  const afterTenMobileRef = useRef<HTMLLIElement | null>(null)
  const afterTenDesktopRef = useRef<HTMLTableRowElement | null>(null)
  const sentinelMobileRef = useRef<HTMLLIElement | null>(null)
  const sentinelDesktopRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setAccountsLoading(true)
    fetchCoaAccounts(
      subChart.groupId,
      { dateFrom: appliedFrom || undefined, dateTo: appliedTo || undefined },
      ac.signal,
    )
      .then(setAccounts)
      .catch((err) => {
        if (ac.signal.aborted) return
        setAccounts([])
        toast.error(err instanceof Error ? err.message : 'Could not load accounts')
      })
      .finally(() => {
        if (!ac.signal.aborted) setAccountsLoading(false)
      })
    return () => ac.abort()
  }, [subChart.groupId, appliedFrom, appliedTo])

  useEffect(() => {
    if (history.loading || !history.hasMore) return
    const observers: IntersectionObserver[] = []
    const watch = (target: Element | null) => {
      if (!target) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) history.revealMore()
        },
        { root: null, rootMargin: '220px 0px', threshold: 0.01 },
      )
      observer.observe(target)
      observers.push(observer)
    }
    watch(afterTenMobileRef.current)
    watch(afterTenDesktopRef.current)
    watch(sentinelMobileRef.current)
    watch(sentinelDesktopRef.current)
    return () => observers.forEach((o) => o.disconnect())
  }, [history.revealMore, history.hasMore, history.rows.length, history.loading])

  const q = searchQuery.trim().toLowerCase()
  const filteredAccounts = useMemo(() => {
    if (!q) return accounts
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.accNo.toLowerCase().includes(q) ||
        String(a.accid).includes(q),
    )
  }, [accounts, q])

  const emptyMessage = history.emptyRange
    ? 'No transactions in this date range.'
    : 'No transactions found.'

  function runSearch() {
    const range = applyDateRange('from', draftFrom, draftFrom, draftTo)
    const nextFrom = range.from
    const nextTo = range.to
    setDraftFrom(nextFrom)
    setDraftTo(nextTo)
    setAppliedFrom(nextFrom)
    setAppliedTo(nextTo)
  }

  function openTxAccount(accid: number | undefined, name: string, balance: number) {
    if (!accid) return
    const match = accounts.find((a) => a.accid === accid)
    if (match) {
      onOpen(match)
      return
    }
    onOpen({
      accid,
      accNo: '',
      name,
      phone: '',
      urdu: '',
      balance,
      totalDebit: 0,
      totalCredit: 0,
      status: 'Active',
      normalBalance: 'Debit',
      groupName: subChart.name,
      chartId: chart.chartId,
    })
  }

  return (
    <>
      <article className={`${panel} flex flex-wrap items-center gap-3 rounded-2xl p-4`}>
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
          <FolderIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.72rem] font-semibold text-muted">
            {chart.name} › Sub Chart
          </p>
          <p className="mt-0.5 mb-0 text-[1rem] font-extrabold text-ink">{subChart.name}</p>
        </div>
        <span className="rounded-full bg-[#f4f5f7] px-3 py-1 text-[0.72rem] font-bold text-muted">
          {filteredAccounts.length} accounts
        </span>
      </article>

      <section
        className={`${panel} relative z-10 overflow-visible rounded-2xl p-4`}
        aria-label="Date filter"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
            <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Date Range</span>
            <DateRangeFilter
              grouped
              fullWidth
              from={draftFrom}
              to={draftTo}
              onFromChange={(next) => {
                const range = applyDateRange('from', next, draftFrom, draftTo)
                setDraftFrom(range.from)
                setDraftTo(range.to)
              }}
              onToChange={(next) => {
                const range = applyDateRange('to', next, draftFrom, draftTo)
                setDraftFrom(range.from)
                setDraftTo(range.to)
              }}
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-fuel px-5 py-2.5 text-[0.85rem] font-extrabold text-ink shadow-[0_6px_14px_rgba(245,197,24,0.28)] hover:brightness-95 sm:w-auto"
          >
            Search
          </button>
        </div>
      </section>

      {accountsLoading ? (
        <LoadingHint label="Loading accounts…" />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState message="No accounts found." />
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
            {filteredAccounts.map((item) => (
              <li key={item.accid}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className={`${panel} w-full cursor-pointer rounded-2xl border-0 p-3.5 text-left hover:bg-[#fcfcfd]`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="mb-0 text-[0.92rem] font-extrabold text-ink">{item.name}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                      Open <ChevronRight />
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div>
                      <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">
                        Balance
                      </p>
                      <p className="mt-0.5 mb-0 text-[0.84rem] font-extrabold text-ink">
                        {formatCoaPkr(item.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">
                        Debit
                      </p>
                      <p className="mt-0.5 mb-0 text-[0.84rem] font-bold text-debit">
                        {formatCoaPkr(item.totalDebit ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">
                        Credit
                      </p>
                      <p className="mt-0.5 mb-0 text-[0.84rem] font-bold text-credit">
                        {formatCoaPkr(item.totalCredit ?? 0)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <section className={`hidden ${panel} rounded-2xl p-4 lg:block lg:p-5`}>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-[#fafbfc]">
                    <Th>Account</Th>
                    <Th className="text-right">Balance (PKR)</Th>
                    <Th className="text-right">Debit</Th>
                    <Th className="text-right">Credit</Th>
                    <Th>{''}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((item) => (
                    <tr
                      key={item.accid}
                      className="cursor-pointer hover:bg-[#fcfcfd]"
                      onClick={() => onOpen(item)}
                    >
                      <Td className="font-semibold text-ink">{item.name}</Td>
                      <Td className="text-right font-bold text-ink">{formatCoaPkr(item.balance)}</Td>
                      <Td className="text-right font-bold text-debit">
                        {formatCoaPkr(item.totalDebit ?? 0)}
                      </Td>
                      <Td className="text-right font-bold text-credit">
                        {formatCoaPkr(item.totalCredit ?? 0)}
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                          Open <ChevronRight />
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className={`${panel} rounded-2xl p-3.5 lg:p-5`} aria-label="Group transactions">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <h2 className="m-0 text-[1rem] font-extrabold tracking-[-0.01em] text-ink">
            All Transactions
          </h2>
          {!history.loading && history.total > 0 ? (
            <span className="text-[0.72rem] font-bold text-muted">{history.total} total</span>
          ) : null}
        </div>

        {history.loading ? (
          <LoadingHint label="Loading transactions…" />
        ) : history.rows.length === 0 ? (
          <p className="m-0 py-10 text-center text-sm font-semibold text-muted">{emptyMessage}</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
              {history.rows.map((row, index) => (
                <li
                  key={row.trid}
                  ref={
                    (index + 1) % 30 === 10
                      ? afterTenMobileRef
                      : index === history.rows.length - 1
                        ? sentinelMobileRef
                        : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => openTxAccount(row.accid, row.customer || '', row.balance)}
                    className="w-full cursor-pointer rounded-xl border border-[#f1f2f4] bg-white p-3 text-left hover:bg-[#fcfcfd]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="mb-0 text-[0.72rem] font-semibold text-muted">
                          {formatTxDate(row.when)} · V.No {row.vno || '—'} ·{' '}
                          {row.paymentType || '—'}
                        </p>
                        <p className="mt-1 mb-0 text-[0.88rem] font-extrabold text-ink">
                          {row.customer || '—'}
                        </p>
                        <p className="mt-0.5 mb-0 text-[0.78rem] text-muted">
                          {row.description && row.description !== '—' ? row.description : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <div>
                        <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">
                          Debit
                        </p>
                        <p
                          className={`mt-0.5 mb-0 text-[0.84rem] font-bold ${
                            (row.debit ?? 0) > 0 ? 'text-debit' : 'text-ink'
                          }`}
                        >
                          {ledgerAmount(row.debit ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">
                          Credit
                        </p>
                        <p
                          className={`mt-0.5 mb-0 text-[0.84rem] font-bold ${
                            (row.credit ?? 0) > 0 ? 'text-credit' : 'text-ink'
                          }`}
                        >
                          {ledgerAmount(row.credit ?? 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">
                          Acc Bal.
                        </p>
                        <p className="mt-0.5 mb-0 text-[0.84rem] font-bold text-ink">
                          {ledgerAmount(row.balance)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-line lg:block">
              <table className="w-full table-fixed border-collapse">
                <TxTableColgroup canDelete={false} />
                <thead>
                  <tr className="bg-[#fafbfc]">
                    <Th>Date</Th>
                    <Th>V.No</Th>
                    <Th>Account</Th>
                    <Th>Description</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Debit</Th>
                    <Th className="text-right">Credit</Th>
                    <Th className="text-right">Acc Bal.</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((row, index) => (
                    <tr
                      key={row.trid}
                      ref={(index + 1) % 30 === 10 ? afterTenDesktopRef : undefined}
                      className="cursor-pointer hover:bg-[#fcfcfd]"
                      onClick={() => openTxAccount(row.accid, row.customer || '', row.balance)}
                    >
                      <Td>
                        <span className="block leading-snug break-words">
                          {formatTxDate(row.when)}
                        </span>
                      </Td>
                      <Td className="font-semibold text-ink">{row.vno || '—'}</Td>
                      <Td className="min-w-0 font-semibold text-ink">
                        <span className="line-clamp-2 break-words" title={row.customer}>
                          {row.customer || '—'}
                        </span>
                      </Td>
                      <Td className="min-w-0">
                        <span
                          className="line-clamp-2 break-words"
                          title={row.description || ''}
                        >
                          {row.description && row.description !== '—' ? row.description : '—'}
                        </span>
                      </Td>
                      <Td>{row.paymentType || '—'}</Td>
                      <Td
                        className={`text-right font-bold ${
                          (row.debit ?? 0) > 0 ? 'text-debit' : ''
                        }`}
                      >
                        {ledgerAmount(row.debit ?? 0)}
                      </Td>
                      <Td
                        className={`text-right font-bold ${
                          (row.credit ?? 0) > 0 ? 'text-credit' : ''
                        }`}
                      >
                        {ledgerAmount(row.credit ?? 0)}
                      </Td>
                      <Td className="text-right font-bold text-ink">
                        {ledgerAmount(row.balance)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={sentinelDesktopRef} className="h-1" aria-hidden="true" />
            </div>

            {history.loadingMore ? (
              <p className="mt-3 mb-0 text-center text-[0.78rem] font-semibold text-muted">
                Loading more…
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:max-w-md sm:ml-auto">
              <article className="rounded-2xl bg-debit-bg px-3 py-3">
                <p className="m-0 text-[0.68rem] font-semibold text-muted">Total Debit</p>
                <p className="mt-1 mb-0 text-[1.05rem] font-extrabold text-debit">
                  {formatCoaPkr(history.summary.totalDebit)}
                </p>
              </article>
              <article className="rounded-2xl bg-credit-bg px-3 py-3">
                <p className="m-0 text-[0.68rem] font-semibold text-muted">Total Credit</p>
                <p className="mt-1 mb-0 text-[1.05rem] font-extrabold text-credit">
                  {formatCoaPkr(history.summary.totalCredit)}
                </p>
              </article>
            </div>
          </>
        )}
      </section>
    </>
  )
}

function SummaryStrip({
  items,
}: {
  items: { label: string; value: string; tone: 'fuel' | 'sky' | 'credit' }[]
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((item) => (
        <article
          key={item.label}
          className={`rounded-2xl px-3 py-3 ${
            item.tone === 'fuel'
              ? 'bg-fuel-soft'
              : item.tone === 'sky'
                ? 'bg-[#e8f0fe]'
                : 'bg-credit-bg'
          }`}
        >
          <p className="m-0 text-[0.68rem] font-semibold text-muted">{item.label}</p>
          <p className="mt-1 mb-0 text-[1.15rem] font-extrabold text-ink">{item.value}</p>
        </article>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className={`${panel} rounded-2xl py-12 text-center`}>
      <p className="m-0 text-sm font-semibold text-muted">{message}</p>
    </section>
  )
}

export function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
        status === 'Active' ? 'bg-credit-bg text-credit' : 'bg-[#f3f4f6] text-muted'
      }`}
    >
      {status}
    </span>
  )
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-line px-2.5 py-2.5 text-left text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap ${className}`}
    >
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

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-muted">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1M3.5 8.5h17v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
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
