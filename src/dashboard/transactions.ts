import { apiGet, apiPost } from '../lib/api'

export type TxType = 'Credit' | 'Debit'
export type TxKind = 'all' | 'credit' | 'debit'
export type TxSort = 'recent' | 'oldest'

export type TransactionRow = {
  trid: number
  id: string
  vno: string
  accid: number
  slug: string
  when: string
  customer: string
  type: TxType
  ledgerType: string
  paymentType: string
  product: string
  quantity: string
  rate: string
  amount: number
  debit: number
  credit: number
  balance: number
  reference: string
  by: string
  description?: string
}

export type TransactionCustomer = {
  accid: number
  name: string
  slug: string
}

export type TransactionSummary = {
  totalTransactions: number
  totalCredit: number
  totalDebit: number
  netFlow: number
}

export type TransactionListParams = {
  q?: string
  accid?: number | ''
  dateFrom?: string
  dateTo?: string
  kind?: TxKind
  sort?: TxSort
}

export const EMPTY_TX_SUMMARY: TransactionSummary = {
  totalTransactions: 0,
  totalCredit: 0,
  totalDebit: 0,
  netFlow: 0,
}

type ListResponse = {
  ok: true
  total: number
  page: number
  pageSize: number
  summary: TransactionSummary
  transactions: TransactionRow[]
}

type CustomersResponse = {
  ok: true
  customers: TransactionCustomer[]
}

export function formatAmount(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${formatted}`
}

/** Ledger amount cell — shows formatted PKR or 0 when empty. */
export function ledgerAmount(value: number) {
  if (!value) return '0'
  return formatAmount(value)
}

/** Date part only — strips trailing "h:mm AM/PM" from API `when`. */
export function dateOnly(when: string) {
  return String(when || '')
    .replace(/\s+\d{1,2}:\d{2}\s*[AP]M$/i, '')
    .trim() || '—'
}

const TX_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Transactions table date — DD-MM-YYYY (e.g. 31-08-2026). */
export function formatTxDate(when: string) {
  const bare = dateOnly(when)
  const match = bare.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/)
  if (match) {
    const monthIdx = TX_MONTHS.indexOf(match[2])
    if (monthIdx >= 0) {
      return `${match[1].padStart(2, '0')}-${String(monthIdx + 1).padStart(2, '0')}-${match[3]}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(bare)) {
    const [y, m, d] = bare.split('-')
    return `${d}-${m}-${y}`
  }
  return bare
}

export function voucherKey(row: TransactionRow) {
  return `${dateOnly(row.when)}|${row.vno}|${row.ledgerType}`
}

export function sortVoucherLegs(rows: TransactionRow[]) {
  return [...rows].sort((a, b) => {
    const rank = (row: TransactionRow) => {
      if (row.debit > 0 && row.credit === 0) return 0
      if (row.credit > 0 && row.debit === 0) return 1
      return 2
    }
    const diff = rank(a) - rank(b)
    return diff !== 0 ? diff : a.trid - b.trid
  })
}

export function groupByVoucher(rows: TransactionRow[]) {
  const groups: { key: string; rows: TransactionRow[] }[] = []
  for (const row of rows) {
    const key = voucherKey(row)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.rows.push(row)
    else groups.push({ key, rows: [row] })
  }
  return groups.map((group) => ({
    ...group,
    rows: sortVoucherLegs(group.rows),
  }))
}

/** Type column = real Leger.Type from DB (same as server). */
export function resolvePaymentType(
  row: Pick<TransactionRow, 'paymentType' | 'ledgerType' | 'customer' | 'product' | 'description'>,
): string {
  if (row.ledgerType && row.ledgerType !== '—') return row.ledgerType
  if (row.paymentType && row.paymentType !== '—') return row.paymentType
  return '—'
}

/**
 * Display exactly what the API returned from Leger — no synthetic Cash In Hand
 * legs and no inventing paired opposite rows.
 */
export function buildTransactionDisplayRows(rows: TransactionRow[]) {
  return rows.map((row) => {
    const normalized = normalizeTransactionRow(row)
    const paymentType = resolvePaymentType(normalized)
    return paymentType && paymentType !== '—'
      ? { ...normalized, paymentType }
      : normalized
  })
}

/** Fill vno / ledgerType / debit / credit when an older API response omits them. */
export function normalizeTransactionRow(row: TransactionRow): TransactionRow {
  let vno = row.vno
  if (!vno || vno === '—') {
    if (row.reference && row.reference !== '—') vno = row.reference
    else if (row.id?.includes('-')) vno = row.id.split('-').pop() ?? '—'
    else vno = '—'
  }

  let ledgerType = row.ledgerType
  if (!ledgerType || ledgerType === '—') {
    if (row.id?.includes('-')) ledgerType = row.id.split('-')[0] ?? '—'
    else ledgerType = '—'
  }

  let paymentType = resolvePaymentType({ ...row, ledgerType, paymentType: row.paymentType })

  let debit = row.debit ?? 0
  let credit = row.credit ?? 0
  if (debit === 0 && credit === 0 && row.amount) {
    if (row.type === 'Debit') debit = row.amount
    else if (row.type === 'Credit') credit = row.amount
  }

  return { ...row, vno, ledgerType, paymentType, debit, credit }
}

export async function fetchTransactions(
  params: TransactionListParams & { page?: number; pageSize?: number },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.accid) search.set('accid', String(params.accid))
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  search.set('kind', params.kind ?? 'all')
  search.set('sort', params.sort ?? 'oldest')
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 20))
  const data = await apiGet<ListResponse>(`/api/transactions?${search.toString()}`, { signal })
  return {
    ...data,
    transactions: data.transactions.map(normalizeTransactionRow),
  }
}

export async function fetchTransactionCustomers(q?: string, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (q) search.set('q', q)
  const qs = search.toString()
  const data = await apiGet<CustomersResponse>(
    `/api/transactions/customers${qs ? `?${qs}` : ''}`,
    { signal },
  )
  return data.customers
}

export type DeleteTransactionResult = {
  ok: true
  deletedLegs: number
  type: string
  vnos: number[]
  amount: number
  message: string
}

/** Permanently delete debit+credit pair (and type-specific related rows). Requires admin password. */
export async function deleteTransaction(
  trid: number,
  password: string,
  signal?: AbortSignal,
) {
  return apiPost<DeleteTransactionResult>(
    '/api/transactions/delete',
    { trid, password },
    { signal },
  )
}

/** Change Accid on one Leger row (scoped by Trid + VNo + Type). Admin password required. */
export async function updateTransactionAccid(
  body: { trid: number; newAccid: number; password: string; vno: number; type: string },
  signal?: AbortSignal,
) {
  return apiPost<{ ok: true; message: string }>('/api/transactions/edit-accid', body, { signal })
}

/** Prefer a real Leger Trid (guards against any leftover negative display ids). */
export function realDeleteTrid(row: TransactionRow, siblings: TransactionRow[] = []) {
  if (row.trid > 0) return row.trid
  const match = siblings.find((s) => s.trid > 0)
  return match?.trid ?? 0
}

export type KindStats = {
  totalCustomers: number
  total: number
  month: number
  today: number
}

export const EMPTY_KIND_STATS: KindStats = {
  totalCustomers: 0,
  total: 0,
  month: 0,
  today: 0,
}

export async function fetchKindStats(kind: 'credit' | 'debit', signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; stats: KindStats }>(
    `/api/transactions/stats?kind=${kind}`,
    { signal },
  )
  return data.stats
}
