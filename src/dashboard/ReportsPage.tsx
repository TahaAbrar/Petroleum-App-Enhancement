import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingHint } from './loading'
import {
  fetchStockStatement,
  formatLastRate,
  formatStockQty,
  formatStockValue,
  type StockStatementRow,
} from './reports'
import { StockLedgerPage } from './StockLedgerPage'
import { panel } from './styles'
import { toast } from '../toast'

type Props = {
  homePath: string
  stockPath: string
  txPath?: string
  searchQuery?: string
}

export function ReportsPage({ homePath, stockPath }: Props) {
  const { itemId: itemIdParam } = useParams<{ itemId?: string }>()
  const itemId = itemIdParam ? Number(itemIdParam) : NaN

  if (itemIdParam && Number.isFinite(itemId) && itemId > 0) {
    return <StockLedgerPage itemId={itemId} stockPath={stockPath} homePath={homePath} />
  }

  return <StockStatementBrowse homePath={homePath} stockPath={stockPath} />
}

function StockStatementBrowse({ homePath, stockPath }: Props) {
  const navigate = useNavigate()
  const [items, setItems] = useState<StockStatementRow[]>([])
  const [totalStockValue, setTotalStockValue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    fetchStockStatement(ac.signal)
      .then((data) => {
        if (ac.signal.aborted) return
        setItems(data.items)
        setTotalStockValue(data.totalStockValue)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load stock statement')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [])

  function openItem(itemId: number) {
    navigate(`${stockPath}/item/${itemId}`)
  }

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
            Stock statement
          </h1>
          <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
            <Link to={homePath} className="text-muted no-underline hover:text-ink">
              Home
            </Link>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="text-ink">Stock statement</span>
          </p>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <LoadingHint label="Loading stock statement…" />
      ) : (
        <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Stock statement">
          {items.length === 0 ? (
            <p className="my-6 text-center text-sm font-semibold text-muted">No stock items found.</p>
          ) : (
            <>
              <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
                {items.map((row) => (
                  <li key={row.itemId} className="border-b border-[#ECEEF2] py-3.5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openItem(row.itemId)}
                      className="flex w-full cursor-pointer items-start justify-between gap-2 border-0 bg-transparent p-0 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[0.88rem] font-extrabold text-ink">
                          {row.itemId} {row.itemName}
                        </p>
                        <dl className="mt-2 mb-0 grid grid-cols-3 gap-2">
                          <div>
                            <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                              Stock
                            </dt>
                            <dd className="m-0 mt-0.5 text-[0.78rem] font-semibold tabular-nums text-ink">
                              {formatStockQty(row.stock)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                              Last Rate
                            </dt>
                            <dd className="m-0 mt-0.5 text-[0.78rem] font-semibold tabular-nums text-ink">
                              {formatLastRate(row.lastRate)}
                            </dd>
                          </div>
                          <div className="text-right">
                            <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                              Stock Value
                            </dt>
                            <dd className="m-0 mt-0.5 text-[0.78rem] font-extrabold tabular-nums text-ink">
                              {formatStockValue(row.stockValue)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                        Open <ChevronRight />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[560px] border-collapse">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <Th align="left">Item Name</Th>
                      <Th align="right">Stock</Th>
                      <Th align="right">Last Rate</Th>
                      <Th align="right">Stock Value</Th>
                      <Th align="right">{''}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr
                        key={row.itemId}
                        className="cursor-pointer hover:bg-[#fcfcfd]"
                        onClick={() => openItem(row.itemId)}
                      >
                        <Td className="font-semibold text-ink">
                          {row.itemId} {row.itemName}
                        </Td>
                        <Td align="right">{formatStockQty(row.stock)}</Td>
                        <Td align="right">{formatLastRate(row.lastRate)}</Td>
                        <Td align="right" className="font-semibold text-ink">
                          {formatStockValue(row.stockValue)}
                        </Td>
                        <Td align="right">
                          <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                            Open <ChevronRight />
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end">
                <TotalBox value={formatStockValue(totalStockValue)} />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

function TotalBox({ value }: { value: string }) {
  return (
    <div className="min-w-[10.5rem] rounded-xl border border-line bg-[#fafbfc] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <p className="m-0 text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase">
        Total Stock Value
      </p>
      <p className="mt-1 mb-0 text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">
        {value}
      </p>
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

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-muted"
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
