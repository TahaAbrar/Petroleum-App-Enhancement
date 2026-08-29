import { apiGet } from '../lib/api'

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

function isCreditLeg(row: TransactionRow) {
  return row.credit > 0 && row.debit === 0
}

function isDebitLeg(row: TransactionRow) {
  return row.debit > 0 && row.credit === 0
}

function txContext(row: TransactionRow) {
  return `${dateOnly(row.when)}|${row.ledgerType}`
}

/** Use the lower voucher number from a matched debit/credit pair (legacy report style). */
function pickPairVno(creditRow: TransactionRow, debitRow: TransactionRow) {
  const debitNo = Number.parseInt(debitRow.vno, 10)
  const creditNo = Number.parseInt(creditRow.vno, 10)
  if (Number.isFinite(debitNo) && Number.isFinite(creditNo)) {
    return String(Math.min(debitNo, creditNo))
  }
  return debitRow.vno !== '—' ? debitRow.vno : creditRow.vno
}

const CASH_IN_HAND = 'Cash In Hand'
const CASH_IN_HAND_ACCID = 1

function pickPaymentType(...types: string[]) {
  if (types.includes('Online')) return 'Online'
  if (types.includes('Transfer')) return 'Transfer'
  if (types.includes('Cash')) return 'Cash'
  return types.find((t) => t && t !== '—') ?? '—'
}

/** Match server resolvePaymentType — uses description/product text + account name. */
export function resolvePaymentType(
  row: Pick<TransactionRow, 'paymentType' | 'ledgerType' | 'customer' | 'product' | 'description'>,
): string {
  if (row.paymentType && row.paymentType !== '—') return row.paymentType

  const desc = `${row.description || ''} ${row.product || ''}`.toLowerCase()
  const acc = (row.customer || '').toLowerCase()
  const legerType = row.ledgerType || ''

  if (/\bonline\b|1bill|jazz\s*cash|\bpos\b|card\s*pos|card machine|byco company 1bill/.test(desc)) {
    return 'Online'
  }
  if (/\btransfer\b|khata|\bcheck\b|cheque/.test(desc)) return 'Transfer'
  if (/bank|mcb|alfalah|meezan|hbl|ubl|faysal/.test(acc)) return 'Online'
  if (legerType === 'JV') return 'Transfer'
  if (legerType === 'Slip') return 'Cash'
  if (legerType === 'Purchases' || legerType === 'DSales' || legerType === 'Adjustment') {
    return 'Transfer'
  }
  if (legerType === 'Sales') return 'Cash'

  return legerType || '—'
}

function withPaymentType(row: TransactionRow, paymentType: string): TransactionRow {
  return paymentType && paymentType !== '—' ? { ...row, paymentType } : row
}

/** Opposite leg for single-row Slip entries (legacy report always shows 2 lines). */
function syntheticCashLeg(row: TransactionRow, side: 'credit' | 'debit'): TransactionRow {
  const amount = side === 'credit' ? row.debit : row.credit
  return {
    ...row,
    trid: -row.trid,
    id: `${row.id}-syn-${side === 'credit' ? 'cr' : 'dr'}`,
    accid: CASH_IN_HAND_ACCID,
    slug: 'cash-in-hand',
    customer: CASH_IN_HAND,
    type: side === 'credit' ? 'Credit' : 'Debit',
    debit: side === 'debit' ? amount : 0,
    credit: side === 'credit' ? amount : 0,
    amount,
    balance: 0,
    product: '—',
    quantity: '—',
    rate: '—',
  }
}

function appendUnpairedRow(out: TransactionRow[], row: TransactionRow) {
  const paymentType = resolvePaymentType(row)
  const resolved = withPaymentType(row, paymentType)

  if (resolved.ledgerType !== 'Slip') {
    out.push(resolved)
    return
  }
  if (isDebitLeg(resolved)) {
    out.push(resolved)
    out.push(withPaymentType(syntheticCashLeg(resolved, 'credit'), paymentType))
    return
  }
  if (isCreditLeg(resolved)) {
    out.push(withPaymentType(syntheticCashLeg(resolved, 'debit'), paymentType))
    out.push(resolved)
    return
  }
  out.push(resolved)
}

/**
 * Pair debit/credit legs into 2-row transactions with the same display V.No.
 * DB often stores Slip pairs as consecutive Trids with different VNo (e.g. 272 / 273).
 */
export function buildTransactionDisplayRows(rows: TransactionRow[]) {
  const items = rows.map((row) => normalizeTransactionRow(row))
  const used = new Set<number>()
  const out: TransactionRow[] = []

  for (const row of items) {
    if (used.has(row.trid)) continue

    if (isCreditLeg(row)) {
      const match = items
        .filter(
          (d) =>
            !used.has(d.trid) &&
            isDebitLeg(d) &&
            txContext(d) === txContext(row) &&
            d.debit === row.credit,
        )
        .sort((a, b) => Math.abs(a.trid - row.trid) - Math.abs(b.trid - row.trid))[0]
      if (match) {
        const pairVno = pickPairVno(row, match)
        const paymentType = pickPaymentType(resolvePaymentType(row), resolvePaymentType(match))
        used.add(row.trid)
        used.add(match.trid)
        out.push(withPaymentType({ ...match, vno: pairVno }, paymentType))
        out.push(withPaymentType({ ...row, vno: pairVno }, paymentType))
        continue
      }
    }

    if (isDebitLeg(row)) {
      const match = items
        .filter(
          (c) =>
            !used.has(c.trid) &&
            isCreditLeg(c) &&
            txContext(c) === txContext(row) &&
            c.credit === row.debit,
        )
        .sort((a, b) => Math.abs(a.trid - row.trid) - Math.abs(b.trid - row.trid))[0]
      if (match) {
        const pairVno = pickPairVno(match, row)
        const paymentType = pickPaymentType(resolvePaymentType(row), resolvePaymentType(match))
        used.add(row.trid)
        used.add(match.trid)
        out.push(withPaymentType({ ...row, vno: pairVno }, paymentType))
        out.push(withPaymentType({ ...match, vno: pairVno }, paymentType))
        continue
      }
    }

    appendUnpairedRow(out, row)
    used.add(row.trid)
  }

  return out
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
  search.set('sort', params.sort ?? 'recent')
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 50))
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
