import { useEffect, useRef } from 'react'
import { formatPkr, type HistoryKind, type HistorySort } from '../customers'
import { applyDateRange, DateRangeFilter } from '../filters'
import { LoadingHint } from '../loading'
import { panel } from '../styles'
import type { CustomerHistoryState } from './useCustomerHistory'
import { PkrCell, Td, TypeBadge, WhenCell } from './ui'

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

type Props = {
  history: CustomerHistoryState
  tab: HistoryKind
  sort: HistorySort
  dateFrom: string
  dateTo: string
  emptyMessage: string
  onTab: (next: HistoryKind) => void
  onSort: (next: HistorySort) => void
  onDateFrom: (next: string) => void
  onDateTo: (next: string) => void
}

export function CustomerHistoryPanel({
  history,
  tab,
  sort,
  dateFrom,
  dateTo,
  emptyMessage,
  onTab,
  onSort,
  onDateFrom,
  onDateTo,
}: Props) {
  const afterFiveMobileRef = useRef<HTMLLIElement | null>(null)
  const afterFiveDesktopRef = useRef<HTMLTableRowElement | null>(null)
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null)
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null)

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

  return (
    <section
      className={`${panel} rounded-2xl p-4 lg:p-5`}
      aria-label="Transaction history"
      tabIndex={0}
      onFocus={history.prefetch}
      onPointerEnter={history.prefetch}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1 border-b border-line sm:border-0">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
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
              onDateFrom(range.from)
              onDateTo(range.to)
            }}
            onToChange={(next) => {
              const range = applyDateRange('to', next, dateFrom, dateTo)
              onDateFrom(range.from)
              onDateTo(range.to)
            }}
          />
          <div
            className="inline-flex rounded-full border border-line bg-[#f4f5f7] p-0.5"
            role="group"
            aria-label="Sort transactions"
          >
            {SORTS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onSort(id)}
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
              {COLUMNS.map((h) => (
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
  )
}
