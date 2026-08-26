import { getUserRole } from '../lib/auth'
import {
  fetchCustomerGroups,
  fetchCustomers,
  type Customer,
  type CustomerGroup,
  type CustomerStatus,
} from './customers'
import { TX_SUMMARY, type TransactionRow } from './transactionsData'

export const CUSTOMER_BATCH = 40
export const CUSTOMER_CHUNK = 15

export type CustomerListParams = {
  q?: string
  dateFrom?: string
  dateTo?: string
  status?: CustomerStatus | ''
  type?: string
}

export const EMPTY_CUSTOMER_FILTERS: CustomerListParams = {
  q: '',
  dateFrom: '',
  dateTo: '',
  status: '',
  type: '',
}

type CustomerListEntry = {
  customers: Customer[]
  total: number
  at: number
}

type TxPageCache = {
  rows: TransactionRow[]
  summary: typeof TX_SUMMARY
  customers: string[]
  at: number
}

const listCache = new Map<string, CustomerListEntry>()
const listInflight = new Map<string, Promise<{ customers: Customer[]; total: number; page: number }>>()
let groupsCache: { groups: CustomerGroup[]; at: number } | null = null
let groupsInflight: Promise<CustomerGroup[]> | null = null
let txCache: TxPageCache | null = null
let txInflight: Promise<TxPageCache> | null = null

export function customerListKey(params: CustomerListParams) {
  return JSON.stringify({
    q: params.q?.trim() ?? '',
    dateFrom: params.dateFrom ?? '',
    dateTo: params.dateTo ?? '',
    status: params.status ?? '',
    type: params.type ?? '',
  })
}

export function peekCustomerList(params: CustomerListParams) {
  return listCache.get(customerListKey(params)) ?? null
}

export function peekCustomerGroups() {
  return groupsCache?.groups ?? null
}

export function peekTransactions() {
  return txCache
}

export function clearPageCache() {
  listCache.clear()
  listInflight.clear()
  groupsCache = null
  groupsInflight = null
  txCache = null
  txInflight = null
}

export function prefetchDashboardPages() {
  const role = getUserRole()
  if (role === 'Administrator' || role === 'Accountant') {
    void loadCustomerListPage(EMPTY_CUSTOMER_FILTERS, 1, { force: true })
    void loadCustomerGroups({ force: true })
  }
  void loadTransactionsPage({ force: true })
}

export async function loadCustomerGroups(opts?: { force?: boolean }) {
  if (!opts?.force && groupsCache) return groupsCache.groups
  if (groupsInflight) return groupsInflight
  groupsInflight = fetchCustomerGroups()
    .then((groups) => {
      groupsCache = { groups, at: Date.now() }
      return groups
    })
    .finally(() => {
      groupsInflight = null
    })
  return groupsInflight
}

export async function loadCustomerListPage(
  params: CustomerListParams,
  page: number,
  opts?: { force?: boolean },
) {
  const key = customerListKey(params)
  const inflightKey = `${key}:${page}`
  const cached = listCache.get(key)

  if (page === 1 && !opts?.force && cached) {
    const existing = listInflight.get(inflightKey)
    if (existing) return existing
    return { customers: cached.customers, total: cached.total, page: 1 }
  }
  const existing = listInflight.get(inflightKey)
  if (existing) return existing

  const request = fetchCustomers({
    q: params.q,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    status: params.status,
    type: params.type,
    page,
    pageSize: CUSTOMER_BATCH,
  }).then((data) => {
    if (page === 1) {
      listCache.set(key, {
        customers: data.customers,
        total: data.total,
        at: Date.now(),
      })
    } else {
      const prev = listCache.get(key)
      const seen = new Set((prev?.customers ?? []).map((row) => row.accid))
      listCache.set(key, {
        total: data.total,
        at: Date.now(),
        customers: [...(prev?.customers ?? []), ...data.customers.filter((row) => !seen.has(row.accid))],
      })
    }
    return { customers: data.customers, total: data.total, page: data.page }
  })

  listInflight.set(inflightKey, request)
  try {
    return await request
  } finally {
    listInflight.delete(inflightKey)
  }
}

export async function loadTransactionsPage(opts?: { force?: boolean }) {
  if (!opts?.force && txCache) return txCache
  if (txInflight) return txInflight
  txInflight = import('./transactionsData').then((mod) => {
    txCache = {
      rows: mod.ALL_TRANSACTIONS,
      summary: mod.TX_SUMMARY,
      customers: mod.TX_CUSTOMERS,
      at: Date.now(),
    }
    return txCache
  }).finally(() => {
    txInflight = null
  })
  return txInflight
}
