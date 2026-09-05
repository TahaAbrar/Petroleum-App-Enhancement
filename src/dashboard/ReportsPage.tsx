import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getUserRole } from '../lib/auth'
import { LoadingHint } from './loading'
import { MobileSearchField } from './MobileSearchField'
import {
  fetchStockStatement,
  formatLastRate,
  formatStockQty,
  formatStockValue,
  updateStockSaleRate,
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
  onSearchChange?: (value: string) => void
}

export function ReportsPage({
  homePath,
  stockPath,
  searchQuery = '',
  onSearchChange,
}: Props) {
  const { itemId: itemIdParam } = useParams<{ itemId?: string }>()
  const itemId = itemIdParam ? Number(itemIdParam) : NaN

  if (itemIdParam && Number.isFinite(itemId) && itemId > 0) {
    return <StockLedgerPage itemId={itemId} stockPath={stockPath} homePath={homePath} />
  }

  return (
    <StockStatementBrowse
      homePath={homePath}
      stockPath={stockPath}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    />
  )
}

function StockStatementBrowse({
  homePath,
  stockPath,
  searchQuery = '',
  onSearchChange,
}: Props) {
  const navigate = useNavigate()
  const canEdit = getUserRole() === 'Administrator'
  const [items, setItems] = useState<StockStatementRow[]>([])
  const [totalStockValue, setTotalStockValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState<StockStatementRow | null>(null)
  const [saleRateInput, setSaleRateInput] = useState('')
  const [saving, setSaving] = useState(false)

  const q = searchQuery.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    if (!q) return items
    return items.filter(
      (row) =>
        row.itemName.toLowerCase().includes(q) ||
        String(row.itemId).includes(q),
    )
  }, [items, q])
  const filteredTotal = useMemo(
    () => filteredItems.reduce((sum, row) => sum + (row.stockValue || 0), 0),
    [filteredItems],
  )
  const displayTotal = q ? filteredTotal : totalStockValue

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

  function openEdit(row: StockStatementRow) {
    setEditRow(row)
    setSaleRateInput(String(row.saleRate))
  }

  function closeEdit() {
    if (saving) return
    setEditRow(null)
  }

  async function saveSaleRate() {
    if (!editRow) return
    const saleRate = Number(saleRateInput)
    if (!Number.isFinite(saleRate) || saleRate < 0) {
      toast.error('Enter a valid sale rate')
      return
    }
    setSaving(true)
    try {
      const data = await updateStockSaleRate(editRow.itemId, saleRate)
      setItems((prev) =>
        prev.map((row) =>
          row.itemId === editRow.itemId ? { ...row, saleRate: data.item.saleRate } : row,
        ),
      )
      toast.success(data.message || 'Sale rate updated')
      setEditRow(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update sale rate')
    } finally {
      setSaving(false)
    }
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

      {onSearchChange ? (
        <MobileSearchField
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search stock items..."
          ariaLabel="Search stock items"
        />
      ) : null}

      {loading && items.length === 0 ? (
        <LoadingHint label="Loading stock statement…" />
      ) : (
        <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Stock statement">
          {filteredItems.length === 0 ? (
            <p className="my-6 text-center text-sm font-semibold text-muted">No stock items found.</p>
          ) : (
            <>
              <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
                {filteredItems.map((row) => (
                  <li key={row.itemId} className="border-b border-[#ECEEF2] py-3.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openItem(row.itemId)}
                        className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
                      >
                        <p className="m-0 text-[0.88rem] font-extrabold text-ink">
                          {row.itemId} {row.itemName}
                        </p>
                        <dl className="mt-2 mb-0 grid grid-cols-2 gap-2">
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
                          <div>
                            <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                              Stock Value
                            </dt>
                            <dd className="m-0 mt-0.5 text-[0.78rem] font-extrabold tabular-nums text-ink">
                              {formatStockValue(row.stockValue)}
                            </dd>
                          </div>
                          <div className="text-right">
                            <dt className="text-[0.62rem] font-bold tracking-[0.04em] text-muted uppercase">
                              Sale Rate
                            </dt>
                            <dd className="m-0 mt-0.5 text-[0.78rem] font-semibold tabular-nums text-ink">
                              {formatLastRate(row.saleRate)}
                            </dd>
                          </div>
                        </dl>
                      </button>
                      <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="cursor-pointer border-0 bg-transparent p-0 text-[0.78rem] font-bold text-muted hover:text-ink"
                          >
                            Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openItem(row.itemId)}
                          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.78rem] font-bold text-[#c99700]"
                        >
                          Open <ChevronRight />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[680px] border-collapse">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <Th align="left">Item Name</Th>
                      <Th align="right">Stock</Th>
                      <Th align="right">Last Rate</Th>
                      <Th align="right">Stock Value</Th>
                      <Th align="right">Sale Rate</Th>
                      <Th align="right">{''}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((row) => (
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
                        <Td align="right">{formatLastRate(row.saleRate)}</Td>
                        <Td align="right">
                          <span className="inline-flex items-center justify-end gap-3">
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(row)
                                }}
                                className="cursor-pointer border-0 bg-transparent p-0 text-[0.78rem] font-bold text-muted hover:text-ink"
                              >
                                Edit
                              </button>
                            ) : null}
                            <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#c99700]">
                              Open <ChevronRight />
                            </span>
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end">
                <TotalBox value={formatStockValue(displayTotal)} />
              </div>
            </>
          )}
        </section>
      )}

      {editRow ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-ink/45 backdrop-blur-[2px]"
            aria-label="Close sale rate editor"
            disabled={saving}
            onClick={closeEdit}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-rate-title"
            className="relative z-10 w-full max-w-[22rem] rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(26,29,33,0.2)] animate-rise"
          >
            <h2
              id="sale-rate-title"
              className="m-0 text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink"
            >
              Edit Sale Rate
            </h2>
            <p className="mt-2 mb-0 text-[0.88rem] font-medium text-muted">
              {editRow.itemId} {editRow.itemName}
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[0.75rem] font-bold uppercase tracking-[0.04em] text-muted">
                Sale Rate
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={saleRateInput}
                disabled={saving}
                onChange={(e) => setSaleRateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void saveSaleRate()
                  }
                }}
                className="h-10 w-full rounded-[0.65rem] border border-line bg-[#fafbfc] px-3 text-[0.88rem] font-semibold tabular-nums text-ink outline-none focus:border-fuel disabled:opacity-60"
              />
            </label>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={closeEdit}
                className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSaleRate()}
                className="cursor-pointer rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.85rem] font-extrabold text-ink shadow-[0_6px_14px_rgba(245,197,24,0.28)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
