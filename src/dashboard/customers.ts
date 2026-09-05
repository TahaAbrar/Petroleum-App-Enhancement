import { apiGet } from '../lib/api'

export type CustomerStatus = 'Active' | 'Inactive'
export type HistoryKind = 'all' | 'credit' | 'debit'
export type HistorySort = 'recent' | 'oldest'

export type Customer = {
  accid: number
  id: string
  slug: string
  name: string
  phone: string
  email: string
  cnic: string
  address: string
  notes: string
  currentBalance: number
  openingBalance: number
  status: CustomerStatus
  type: string
  groupId?: number
  groupAllowed?: boolean
  createdAt: string
}

export type CustomerGroup = {
  groupId: number
  groupName: string
  accCount: number
  totalBalance?: number
}

export type CustomerTxType = 'Credit' | 'Debit'

export type CustomerTransaction = {
  trid: number
  id: string
  vno: string
  when: string
  type: CustomerTxType
  product: string
  description: string
  quantity: string
  rate: string
  amount: number
  debit: number
  credit: number
  balance: number
  by: string
}

export type CustomerDetail = Customer & {
  totalCredit: number
  totalDebit: number
  transactionCount: number
}

export function slugifyName(name: string) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function customerSlug(customer: { name: string; accid: number; slug?: string }) {
  if (customer.slug) return customer.slug
  const base = slugifyName(customer.name) || 'customer'
  return `${base}-${customer.accid}`
}

export function displayText(value: string | null | undefined) {
  const s = String(value ?? '').trim()
  return s || '—'
}

export function formatPkrAmount(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${formatted}`
}

export function formatPkr(value: number) {
  return `${formatPkrAmount(value)} PKR`
}

export function formatFilterDate(iso: string) {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return '—'
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type ListResponse = {
  ok: true
  total: number
  page: number
  pageSize: number
  customers: Customer[]
}

type GroupsResponse = {
  ok: true
  groups: CustomerGroup[]
}

type DetailResponse = {
  ok: true
  customer: CustomerDetail
}

type TxResponse = {
  ok: true
  total: number
  totalDebit: number
  totalCredit: number
  offset: number
  limit: number
  transactions: CustomerTransaction[]
}

export async function fetchCustomerGroups(signal?: AbortSignal) {
  const data = await apiGet<GroupsResponse>('/api/customers/groups', { signal })
  return data.groups
}

export async function fetchCustomers(
  params: {
    q?: string
    dateFrom?: string
    dateTo?: string
    status?: CustomerStatus | ''
    type?: string
    page?: number
    pageSize?: number
  },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 40))
  return apiGet<ListResponse>(`/api/customers?${search.toString()}`, { signal })
}

export async function fetchCustomerBySlug(slug: string, signal?: AbortSignal) {
  const safe = encodeURIComponent(slug.toLowerCase())
  const data = await apiGet<DetailResponse>(`/api/customers/slug/${safe}`, { signal })
  return data.customer
}

export async function fetchCustomerDetail(accid: number, signal?: AbortSignal) {
  const data = await apiGet<DetailResponse>(`/api/customers/${accid}`, { signal })
  return data.customer
}

export async function fetchCustomerTransactions(
  accid: number,
  params: {
    kind: HistoryKind
    dateFrom?: string
    dateTo?: string
    sort?: HistorySort
    offset?: number
    limit?: number
  },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  search.set('kind', params.kind)
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  search.set('sort', params.sort ?? 'recent')
  search.set('offset', String(params.offset ?? 0))
  search.set('limit', String(params.limit ?? 15))
  return apiGet<TxResponse>(`/api/customers/${accid}/transactions?${search.toString()}`, {
    signal,
  })
}
