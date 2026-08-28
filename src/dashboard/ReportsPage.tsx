import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PRODUCT_SUMMARY,
  REPORT_CUSTOMERS,
  REPORT_DATE_LABEL,
  REPORT_PRODUCTS,
  REPORT_RECENT_TX,
  REPORT_SUMMARY,
  REPORT_TYPES,
} from './reportsData'
import { panel } from './styles'
import { toast } from '../toast'

type Props = {
  homePath: string
  txPath: string
  searchQuery?: string
}

export function ReportsPage({ homePath, txPath }: Props) {
  const navigate = useNavigate()
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0])
  const [customer, setCustomer] = useState<string>(REPORT_CUSTOMERS[0])
  const [product, setProduct] = useState<string>(REPORT_PRODUCTS[0])
  const [dateLabel] = useState(REPORT_DATE_LABEL)

  function generate() {
    toast.success('Report generated for selected filters.')
  }

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
            Reports
          </h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="text-ink">Reports</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info('Export coming soon.')}
          className="hidden cursor-pointer items-center gap-2 rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.84rem] font-bold text-ink shadow-[0_6px_16px_rgba(245,197,24,0.32)] hover:brightness-95 lg:inline-flex"
        >
          <DownloadIcon />
          Export
          <ChevronDown />
        </button>
      </div>

      {/* Filters */}
      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Report filters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_1fr_auto]">
          <FieldSelect
            label="Report Type"
            value={reportType}
            onChange={setReportType}
            options={[...REPORT_TYPES]}
          />
          <FieldDate label="Date Range" value={dateLabel} />
          <FieldSelect
            label="Customer"
            value={customer}
            onChange={setCustomer}
            options={[...REPORT_CUSTOMERS]}
          />
          <div className="hidden xl:block">
            <FieldSelect
              label="Product / Service"
              value={product}
              onChange={setProduct}
              options={[...REPORT_PRODUCTS]}
            />
          </div>
          <div className="flex items-end sm:col-span-2 xl:col-span-1">
            <button
              type="button"
              onClick={generate}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.85rem] font-bold text-ink shadow-[0_4px_12px_rgba(245,197,24,0.28)] hover:brightness-95"
            >
              <ChartIcon />
              Generate Report
            </button>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section
        className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4"
        aria-label="Report summary"
      >
        <KpiCard
          label="Total Credit"
          value={`${REPORT_SUMMARY.totalCredit.value} PKR`}
          change={REPORT_SUMMARY.totalCredit.change}
          changeFull={REPORT_SUMMARY.totalCredit.changeFull}
          tone="up"
          iconBg="bg-credit-bg text-credit"
          icon="down"
        />
        <KpiCard
          label="Total Debit"
          value={`${REPORT_SUMMARY.totalDebit.value} PKR`}
          change={REPORT_SUMMARY.totalDebit.change}
          changeFull={REPORT_SUMMARY.totalDebit.changeFull}
          tone="down"
          iconBg="bg-debit-bg text-debit"
          icon="up"
        />
        <KpiCard
          label="Net Flow"
          value={`${REPORT_SUMMARY.netFlow.value} PKR`}
          change={REPORT_SUMMARY.netFlow.change}
          changeFull={REPORT_SUMMARY.netFlow.changeFull}
          tone="up"
          iconBg="bg-fuel-soft text-[#c99700]"
          icon="wallet"
        />
        <KpiCard
          label="Total Transactions"
          value={REPORT_SUMMARY.totalTx.value}
          change={REPORT_SUMMARY.totalTx.change}
          changeFull={REPORT_SUMMARY.totalTx.changeFull}
          tone="up"
          iconBg="bg-[#e8f0fe] text-[#2563eb]"
          icon="doc"
        />
      </section>

      {/* Desktop table */}
      <section className="hidden xl:block" aria-label="Report tables">
        <article className={`${panel} rounded-2xl p-5`}>
          <h2 className="mb-3 text-[0.95rem] font-extrabold">Product / Service Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse">
              <thead>
                <tr>
                  {['Product / Service', 'Total Credit (PKR)', 'Total Debit (PKR)', 'Net Flow (PKR)'].map(
                    (h) => (
                      <Th key={h}>{h}</Th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {PRODUCT_SUMMARY.map((row) => (
                  <tr key={row.product} className="hover:bg-[#fcfcfd]">
                    <Td className="font-semibold text-ink">{row.product}</Td>
                    <Td>{row.credit}</Td>
                    <Td>{row.debit}</Td>
                    <Td className="font-bold text-credit">{row.net}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* Mobile recent transactions */}
      <section className={`${panel} rounded-2xl p-4 xl:hidden`} aria-label="Recent transactions">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="m-0 text-[1rem] font-extrabold text-ink">Recent Transactions</h2>
          <button
            type="button"
            onClick={() => navigate(txPath)}
            className="cursor-pointer border-0 bg-transparent text-[0.8rem] font-bold text-[#c99700]"
          >
            View All
          </button>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {REPORT_RECENT_TX.map((row) => {
            const isCredit = row.type === 'Credit'
            return (
              <li
                key={row.id}
                className="flex items-center gap-2 border-b border-[#ECEEF2] py-3.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[0.88rem] font-extrabold text-ink">{row.id}</p>
                  <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">{row.when}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
                    isCredit ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
                  }`}
                >
                  {row.type}
                </span>
                <p
                  className={`m-0 shrink-0 text-right text-[0.82rem] font-extrabold ${
                    isCredit ? 'text-credit' : 'text-debit'
                  }`}
                >
                  {row.amount} PKR
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-line bg-[#fafbfc] py-2.5 pr-9 pl-3 text-[0.85rem] font-medium text-ink outline-none focus:border-fuel"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
          <ChevronDown />
        </span>
      </div>
    </label>
  )
}

function FieldDate({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">{label}</span>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value}
          className="w-full rounded-xl border border-line bg-[#fafbfc] py-2.5 pr-10 pl-3 text-[0.85rem] font-medium text-ink outline-none"
        />
        <svg
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    </label>
  )
}

function KpiCard({
  label,
  value,
  change,
  changeFull,
  tone,
  iconBg,
  icon,
}: {
  label: string
  value: string
  change: string
  changeFull: string
  tone: 'up' | 'down'
  iconBg: string
  icon: 'down' | 'up' | 'wallet' | 'doc'
}) {
  return (
    <article className={`${panel} flex flex-col gap-2 rounded-2xl p-3.5 lg:flex-row lg:items-start lg:gap-3 lg:p-4`}>
      <div className={`grid size-10 shrink-0 place-items-center rounded-full ${iconBg} lg:size-11`}>
        <KpiIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.72rem] font-semibold text-muted lg:text-[0.78rem]">{label}</p>
        <h3 className="mt-1 mb-1 text-[0.95rem] font-extrabold tracking-[-0.02em] text-ink lg:text-[1.1rem]">
          {value}
        </h3>
        <span
          className={`block text-[0.68rem] font-bold lg:text-[0.72rem] ${
            tone === 'up' ? 'text-credit' : 'text-debit'
          }`}
        >
          <span className="lg:hidden">↗ {change}</span>
          <span className="hidden lg:inline">{changeFull}</span>
        </span>
      </div>
    </article>
  )
}

function Th({ children }: { children: string }) {
  return (
    <th className="border-b border-line px-2 py-2.5 text-left text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap">
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
      className={`border-b border-[#f1f2f4] px-2 py-3 text-[0.8rem] whitespace-nowrap text-[#374151] ${className}`}
    >
      {children}
    </td>
  )
}

function ChevronDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v12M12 16l-4-4M12 16l4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function KpiIcon({ name }: { name: 'down' | 'up' | 'wallet' | 'doc' }) {
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
  if (name === 'wallet') {
    return (
      <svg {...p}>
        <path d="M4 9.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
        <path d="M4 9.5 6.5 5h11L20 9.5" />
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
