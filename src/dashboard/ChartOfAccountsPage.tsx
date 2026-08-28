import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  CHART_OF_ACCOUNTS,
  formatCoaPkr,
  type CoaAccount,
  type CoaChart,
  type CoaSubChart,
} from './chartOfAccountsData'
import { panel } from './styles'

type Level = 'charts' | 'subCharts' | 'accounts'

type Props = {
  homePath: string
  searchQuery?: string
}

export function ChartOfAccountsPage({ homePath, searchQuery = '' }: Props) {
  const [level, setLevel] = useState<Level>('charts')
  const [chart, setChart] = useState<CoaChart | null>(null)
  const [subChart, setSubChart] = useState<CoaSubChart | null>(null)

  const q = searchQuery.trim().toLowerCase()

  const charts = useMemo(() => {
    if (!q || level !== 'charts') return CHART_OF_ACCOUNTS
    return CHART_OF_ACCOUNTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.type.toLowerCase().includes(q),
    )
  }, [q, level])

  const subCharts = useMemo(() => {
    if (!chart) return []
    const list = chart.subCharts
    if (!q || level !== 'subCharts') return list
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.includes(q),
    )
  }, [chart, q, level])

  const accounts = useMemo(() => {
    if (!subChart) return []
    const list = subChart.accounts
    if (!q || level !== 'accounts') return list
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.includes(q) ||
        a.type.toLowerCase().includes(q),
    )
  }, [subChart, q, level])

  function openChart(item: CoaChart) {
    setChart(item)
    setSubChart(null)
    setLevel('subCharts')
  }

  function openSubChart(item: CoaSubChart) {
    setSubChart(item)
    setLevel('accounts')
  }

  function goCharts() {
    setLevel('charts')
    setChart(null)
    setSubChart(null)
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

      {level === 'charts' && (
        <>
          <SummaryStrip
            items={[
              { label: 'Charts', value: String(CHART_OF_ACCOUNTS.length), tone: 'fuel' },
              {
                label: 'Sub Charts',
                value: String(CHART_OF_ACCOUNTS.reduce((n, c) => n + c.subChartCount, 0)),
                tone: 'sky',
              },
              {
                label: 'Accounts',
                value: String(CHART_OF_ACCOUNTS.reduce((n, c) => n + c.accountCount, 0)),
                tone: 'credit',
              },
            ]}
          />
          <ChartsLevel charts={charts} onOpen={openChart} />
        </>
      )}

      {level === 'subCharts' && chart && (
        <SubChartsLevel chart={chart} subCharts={subCharts} onOpen={openSubChart} />
      )}

      {level === 'accounts' && subChart && chart && (
        <AccountsLevel chart={chart} subChart={subChart} accounts={accounts} />
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
          <li key={item.id}>
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
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Chart Name', 'Sub Charts', 'Accounts', ''].map((h) => (
                <Th key={h || 'action'}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {charts.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer hover:bg-[#fcfcfd]"
                onClick={() => onOpen(item)}
              >
                <Td className="font-bold text-ink">{item.name}</Td>
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
              <li key={item.id}>
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
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Sub Chart Name', 'Accounts', ''].map((h) => (
                    <Th key={h || 'action'}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subCharts.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer hover:bg-[#fcfcfd]"
                    onClick={() => onOpen(item)}
                  >
                    <Td className="font-bold text-ink">{item.name}</Td>
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
          </section>
        </>
      )}
    </>
  )
}

function AccountsLevel({
  chart,
  subChart,
  accounts,
}: {
  chart: CoaChart
  subChart: CoaSubChart
  accounts: CoaAccount[]
}) {
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
          {accounts.length} accounts
        </span>
      </article>

      {accounts.length === 0 ? (
        <EmptyState message="No accounts found." />
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
            {accounts.map((item) => (
              <li key={item.id} className={`${panel} rounded-2xl p-3.5`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="mb-0 text-[0.92rem] font-extrabold text-ink">{item.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#f4f5f7] px-2 py-0.5 text-[0.65rem] font-bold text-muted">
                        {item.normalBalance}
                      </span>
                      <StatusPill status={item.status} />
                    </div>
                  </div>
                  <p
                    className={`m-0 shrink-0 text-right text-[0.88rem] font-extrabold ${
                      item.normalBalance === 'Credit' ? 'text-credit' : 'text-ink'
                    }`}
                  >
                    {formatCoaPkr(item.balance)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <section className={`hidden ${panel} rounded-2xl p-4 lg:block lg:p-5`}>
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  {['Account Name', 'Normal Balance', 'Balance (PKR)', 'Status'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fcfcfd]">
                    <Td className="font-bold text-ink">{item.name}</Td>
                    <Td>{item.normalBalance}</Td>
                    <Td
                      className={
                        item.normalBalance === 'Credit'
                          ? 'font-bold text-credit'
                          : 'font-bold text-ink'
                      }
                    >
                      {formatCoaPkr(item.balance)}
                    </Td>
                    <Td>
                      <StatusPill status={item.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
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

function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
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

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap">
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
      className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151] ${className}`}
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
