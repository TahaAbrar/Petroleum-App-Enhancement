import { apiGet, apiPost } from '../lib/api'

export type StockStatementRow = {
  itemId: number
  itemName: string
  stock: number
  lastRate: number
  saleRate: number
  stockValue: number
}

export type StockStatement = {
  items: StockStatementRow[]
  totalStockValue: number
}

export type StockLedgerEntry = {
  trid: number
  date: string
  vno: string
  description: string
  sx: number | null
  rate: number
  reference: string
  stockIn: number
  stockOut: number
  balance: number
}

export type StockLedgerItem = {
  itemId: number
  itemName: string
  brandName: string
  lastRate: number
  stock: number
  stockValue: number
}

export type StockLedgerTotals = {
  stockIn: number
  stockOut: number
  closingBalance: number
  stockValue: number
}

export type StockLedger = {
  item: StockLedgerItem
  openingStock: number
  dateFrom: string
  dateTo: string
  entries: StockLedgerEntry[]
  totals: StockLedgerTotals
}

export function formatStockQty(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatLastRate(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatStockValue(value: number) {
  return Math.round(value).toLocaleString('en-US')
}

export function formatSx(value: number | null) {
  if (value == null) return ''
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Display blank when qty is zero (legacy stock ledger style). */
export function formatQtyCell(value: number) {
  if (!value) return ''
  return formatStockQty(value)
}

export function formatDisplayDateRange(from: string, to: string) {
  if (!from && !to) return 'All dates'
  const fmt = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }
  if (from && to) return `From: ${fmt(from)} To ${fmt(to)}`
  if (from) return `From: ${fmt(from)}`
  return `To: ${fmt(to)}`
}

export async function fetchStockStatement(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true } & StockStatement>('/api/reports/stock-statement', {
    signal,
  })
  return { items: data.items, totalStockValue: data.totalStockValue }
}

export async function fetchStockLedger(itemId: number, signal?: AbortSignal) {
  const data = await apiGet<{ ok: true } & StockLedger>(
    `/api/reports/stock-statement/${itemId}`,
    { signal },
  )
  return data
}

/** Administrator only — update ItemReg.SaleRate. */
export async function updateStockSaleRate(
  itemId: number,
  saleRate: number,
  signal?: AbortSignal,
) {
  const data = await apiPost<{
    ok: true
    item: { itemId: number; saleRate: number }
    message: string
  }>(`/api/reports/stock-statement/${itemId}/sale-rate`, { saleRate }, { signal })
  return data
}
