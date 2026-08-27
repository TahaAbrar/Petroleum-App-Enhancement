import { apiGet } from '../lib/api'

export type TxType = 'Credit' | 'Debit'
export type TxKind = 'all' | 'credit' | 'debit'
export type TxSort = 'recent' | 'oldest'

export type TransactionRow = {
  trid: number
  id: string
  accid: number
  slug: string
  when: string
  customer: string
  type: TxType
  product: string
  quantity: string
  rate: string
  amount: number
  balance: number
  reference: string
  by: string
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

/** Date part only — strips trailing "h:mm AM/PM" from API `when`. */
export function dateOnly(when: string) {
  return String(when || '')
    .replace(/\s+\d{1,2}:\d{2}\s*[AP]M$/i, '')
    .trim() || '—'
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
  return apiGet<ListResponse>(`/api/transactions?${search.toString()}`, { signal })
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
