import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATS, TRANSACTIONS } from './data'
import { BalanceTrendChart, CreditDebitChart } from './charts'
import { CustomerMark, StatIcon } from './icons'
import { panel, selectBtn } from './styles'

type Props = {
  txPath: string
  searchQuery?: string
}

export function DashboardHome({ txPath, searchQuery = '' }: Props) {
  const navigate = useNavigate()

  const filteredTx = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return TRANSACTIONS
    return TRANSACTIONS.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.product.toLowerCase().includes(q),
    )
  }, [searchQuery])

  return (
    <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Summary">
        {STATS.map((s, i) => {
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
                  className={`mt-1 mb-1 font-extrabold tracking-[-0.02em] text-ink whitespace-nowrap ${
                    isHalf
                      ? 'text-[1rem] leading-none xl:text-[1.15rem]'
                      : 'text-[1.35rem] leading-tight xl:text-[1.25rem]'
                  }`}
                >
                  {s.value}
                  {s.unit ? (
                    <span
                      className={`ml-1 font-bold text-muted ${
                        isHalf ? 'text-[0.68rem]' : 'text-[0.75rem]'
                      }`}
                    >
                      {s.unit}
                    </span>
                  ) : null}
                </h3>
                <span
                  className={`block font-semibold leading-snug ${
                    isHalf ? 'text-[0.65rem]' : 'text-[0.72rem]'
                  } ${s.tone === 'up' ? 'text-credit' : 'text-debit'}`}
                >
                  {s.change}
                </span>
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
          <CreditDebitChart />
        </article>

        <article className={`${panel} rounded-3xl p-4`} style={{ animationDelay: '0.26s' }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 text-[0.95rem] font-extrabold tracking-[-0.01em] xl:text-base">
              Balance Trend
            </h2>
            <button type="button" className={`${selectBtn} text-[0.65rem]`}>
              This Month
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <BalanceTrendChart />
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

        <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
          {filteredTx.slice(0, 4).map((row) => {
            const isCredit = row.type === 'Credit'
            return (
              <li
                key={row.id}
                className="flex items-center gap-2.5 border-b border-[#ECEEF2] py-3.5 last:border-b-0"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(26,29,33,0.1)] ring-1 ring-black/5">
                  <CustomerMark />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[0.9rem] font-bold text-[#1A1D21]">{row.customer}</p>
                  <p className="mt-0.5 m-0 truncate text-[0.75rem] font-medium text-[#8B93A1]">
                    {row.product}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold leading-none ${
                    isCredit ? 'bg-[#E8F8EE] text-[#16A34A]' : 'bg-[#FDE8EC] text-[#E11D48]'
                  }`}
                >
                  {row.type}
                </span>
                <p
                  className={`m-0 shrink-0 whitespace-nowrap text-right text-[0.8rem] font-bold leading-none ${
                    isCredit ? 'text-[#16A34A]' : 'text-[#E11D48]'
                  }`}
                >
                  {row.amount} PKR
                </p>
              </li>
            )
          })}
        </ul>

        <div className="-mx-1 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr>
                {['ID', 'Customer', 'Type', 'Product / Service', 'Amount', 'Balance', 'Date & Time', 'Created By'].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((row) => (
                <tr key={row.id} className="hover:bg-[#fcfcfd]">
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                    {row.id}
                  </td>
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                    {row.customer}
                  </td>
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
                        row.type === 'Credit' ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                    {row.product}
                  </td>
                  <td
                    className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-bold whitespace-nowrap ${
                      row.type === 'Credit' ? 'text-credit' : 'text-debit'
                    }`}
                  >
                    {row.amount} PKR
                  </td>
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                    {row.balance} PKR
                  </td>
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                    {row.when}
                  </td>
                  <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                    {row.by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
