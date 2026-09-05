import { useEffect, useRef } from 'react'
import { type HistoryKind, type HistorySort } from '../customers'
import { applyDateRange, DateRangeFilter } from '../filters'
import { LoadingHint } from '../loading'
import { panel } from '../styles'
import { formatTxDate, ledgerAmount } from '../transactions'
import type { CustomerHistoryState } from './useCustomerHistory'
import { PkrValue, Td } from './ui'

const TABS = [
  ['all', 'Transaction History'],
  ['credit', 'Credit History'],
  ['debit', 'Debit History'],
] as const

const SORTS = [
  ['recent', 'Recent'],
  ['oldest', 'Oldest'],
] as const

const COLUMNS = ['Date', 'Description', 'V.No', 'Debit', 'Credit']

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
  const showTotals =
    !history.loading && (Boolean(dateFrom || dateTo) || tab === 'credit' || tab === 'debit')

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
            className="flex flex-col gap-1.5 border-b border-[#ECEEF2] py-3 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-[0.72rem] font-semibold text-muted">
                  {formatTxDate(row.when)} · V.No {row.vno || '—'}
                </p>
                <p className="mt-0.5 mb-0 text-[0.84rem] font-extrabold text-ink">
                  {row.description || row.product || '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.78rem]">
              <span className={`font-extrabold ${row.debit > 0 ? 'text-debit' : 'text-muted'}`}>
                Dr {ledgerAmount(row.debit ?? 0)}
              </span>
              <span className={`font-extrabold ${row.credit > 0 ? 'text-credit' : 'text-muted'}`}>
                Cr {ledgerAmount(row.credit ?? 0)}
              </span>
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
        {showTotals ? (
          <li className="border-t-2 border-ink/10 bg-[#f7f8fa] px-1 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.84rem]">
              <span className="font-extrabold text-ink">Total</span>
              {tab !== 'credit' ? (
                <span className="font-extrabold text-debit">
                  Debit <PkrValue value={history.totalDebit} amountClass="font-extrabold" />
                </span>
              ) : null}
              {tab !== 'debit' ? (
                <span className="font-extrabold text-credit">
                  Credit <PkrValue value={history.totalCredit} amountClass="font-extrabold" />
                </span>
              ) : null}
            </div>
          </li>
        ) : null}
      </ul>

      <div className="hidden min-w-0 lg:block">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[38%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((h) => (
                <th
                  key={h}
                  className={`border-b border-line px-2 py-3 text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase ${
                    h === 'Debit' || h === 'Credit' ? 'text-right' : 'text-left'
                  }`}
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
                <Td>
                  <span className="block leading-snug break-words">{formatTxDate(row.when)}</span>
                </Td>
                <Td className="min-w-0">
                  <span
                    className="line-clamp-2 break-words"
                    title={row.description || row.product}
                  >
                    {row.description || row.product || '—'}
                  </span>
                </Td>
                <Td className="font-semibold text-ink">{row.vno || '—'}</Td>
                <Td className={`text-right font-bold ${row.debit > 0 ? 'text-debit' : ''}`}>
                  {row.debit > 0 ? <PkrValue value={row.debit} /> : ledgerAmount(0)}
                </Td>
                <Td className={`text-right font-bold ${row.credit > 0 ? 'text-credit' : ''}`}>
                  {row.credit > 0 ? <PkrValue value={row.credit} /> : ledgerAmount(0)}
                </Td>
              </tr>
            ))}
            {history.loading && (
              <tr>
                <td colSpan={5}>
                  <LoadingHint label="Loading transactions…" />
                </td>
              </tr>
            )}
            {!history.loading && history.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm font-medium text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {showTotals ? (
              <tr className="bg-[#f7f8fa]">
                <Td className="font-extrabold text-ink" />
                <Td className="font-extrabold text-ink">Total</Td>
                <Td />
                <Td className="text-right font-extrabold text-debit">
                  {tab === 'credit' ? (
                    ledgerAmount(0)
                  ) : (
                    <PkrValue value={history.totalDebit} amountClass="font-extrabold" />
                  )}
                </Td>
                <Td className="text-right font-extrabold text-credit">
                  {tab === 'debit' ? (
                    ledgerAmount(0)
                  ) : (
                    <PkrValue value={history.totalCredit} amountClass="font-extrabold" />
                  )}
                </Td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div ref={desktopSentinelRef} className="h-4" />
        {history.loadingMore && <LoadingHint compact label="Loading more…" />}
      </div>
    </section>
  )
}
