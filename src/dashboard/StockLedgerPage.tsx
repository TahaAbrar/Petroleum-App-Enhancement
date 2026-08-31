import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from '../toast'
import { LoadingHint } from './loading'
import {
  fetchStockLedger,
  formatDisplayDateRange,
  formatLastRate,
  formatQtyCell,
  formatStockQty,
  formatStockValue,
  formatSx,
  type StockLedger,
} from './reports'
import { panel } from './styles'

type Props = {
  itemId: number
  stockPath: string
  homePath: string
}

export function StockLedgerPage({ itemId, stockPath, homePath }: Props) {
  const navigate = useNavigate()
  const [data, setData] = useState<StockLedger | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    fetchStockLedger(itemId, ac.signal)
      .then((next) => {
        if (ac.signal.aborted) return
        setData(next)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load stock ledger')
        navigate(stockPath)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [itemId, navigate, stockPath])

  if (loading && !data) {
    return <LoadingHint label="Loading stock ledger…" />
  }

  if (!data) {
    return (
      <p className="my-8 text-center text-sm font-semibold text-muted">Stock item not found.</p>
    )
  }

  const { item, openingStock, dateFrom, dateTo, entries, totals } = data

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
            Stock Ledger
          </h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <Link to={stockPath} className="text-muted no-underline hover:text-ink">
              Stock
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="text-ink">
              {item.itemId} {item.itemName}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(stockPath)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[0.65rem] border border-line bg-white px-3 py-2 text-[0.78rem] font-bold text-ink"
        >
          <BackIcon />
          Back
        </button>
      </div>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Stock ledger">
        <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-[0.72rem] font-bold tracking-[0.02em] text-muted">
              {formatDisplayDateRange(dateFrom, dateTo)}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.88rem]">
              <span className="font-bold text-ink">
                Item ID: <span className="font-extrabold">{item.itemId}</span>
              </span>
              <span className="font-extrabold text-ink">{item.itemName}</span>
              <span className="font-semibold text-muted">
                Brand: <span className="text-ink">{item.brandName}</span>
              </span>
            </div>
          </div>
          <p className="m-0 text-[0.78rem] font-bold text-ink">
            Opening Stock:{' '}
            <span className="tabular-nums">{formatStockQty(openingStock)}</span>
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="my-6 text-center text-sm font-semibold text-muted">
            No ledger entries for this item.
          </p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
              {entries.map((row) => (
                <li
                  key={row.trid}
                  className="border-b border-[#ECEEF2] py-3.5 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 text-[0.88rem] font-extrabold text-ink">{row.description}</p>
                      <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">
                        {row.date}
                        {row.vno ? ` · V.${row.vno}` : ''}
                        {row.reference && row.reference !== '—' ? ` · ${row.reference}` : ''}
                      </p>
                    </div>
                    <p className="m-0 shrink-0 text-[0.82rem] font-extrabold tabular-nums text-ink">
                      {formatStockQty(row.balance)}
                    </p>
                  </div>
                  <dl className="mt-2 mb-0 grid grid-cols-3 gap-2">
                    <div>
                      <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                        Rate
                      </dt>
                      <dd className="m-0 mt-0.5 text-[0.78rem] font-semibold tabular-nums text-ink">
                        {formatLastRate(row.rate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                        In
                      </dt>
                      <dd className="m-0 mt-0.5 text-[0.78rem] font-semibold tabular-nums text-credit">
                        {formatQtyCell(row.stockIn) || '—'}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                        Out
                      </dt>
                      <dd className="m-0 mt-0.5 text-[0.78rem] font-semibold tabular-nums text-debit">
                        {formatQtyCell(row.stockOut) || '—'}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>V.No</Th>
                    <Th>Description</Th>
                    <Th align="right">SX</Th>
                    <Th align="right">Rate</Th>
                    <Th>Reference</Th>
                    <Th align="right">Stock In</Th>
                    <Th align="right">Stock Out</Th>
                    <Th align="right">Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.trid} className="hover:bg-[#fcfcfd]">
                      <Td>{row.date}</Td>
                      <Td>{row.vno}</Td>
                      <Td className="max-w-[220px] whitespace-normal font-semibold text-ink">
                        {row.description}
                      </Td>
                      <Td align="right">{formatSx(row.sx)}</Td>
                      <Td align="right">{formatLastRate(row.rate)}</Td>
                      <Td>{row.reference}</Td>
                      <Td align="right">{formatQtyCell(row.stockIn)}</Td>
                      <Td align="right">{formatQtyCell(row.stockOut)}</Td>
                      <Td align="right" className="font-semibold text-ink">
                        {formatStockQty(row.balance)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <TotalBox label="Total Stock In" value={formatStockQty(totals.stockIn)} />
              <TotalBox label="Total Stock Out" value={formatStockQty(totals.stockOut)} />
              <TotalBox label="Closing Balance" value={formatStockQty(totals.closingBalance)} />
              <TotalBox label="Total Stock Value" value={formatStockValue(totals.stockValue)} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function TotalBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[9.5rem] rounded-xl border border-line bg-[#fafbfc] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <p className="m-0 text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase">{label}</p>
      <p className="mt-1 mb-0 text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">{value}</p>
    </div>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: string
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`border-b border-line px-2 py-2.5 text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
  align = 'left',
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  return (
    <td
      className={`border-b border-[#f1f2f4] px-2 py-3 text-[0.8rem] whitespace-nowrap text-[#374151] ${
        align === 'right' ? 'text-right tabular-nums' : ''
      } ${className}`}
    >
      {children}
    </td>
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
