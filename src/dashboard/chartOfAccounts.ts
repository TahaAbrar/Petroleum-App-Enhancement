import { apiGet } from '../lib/api'

export type CoaChart = {
  chartId: number
  name: string
  type: string
  subChartCount: number
  accountCount: number
}

export type CoaSubChart = {
  groupId: number
  name: string
  balance: number
  accountCount: number
}

export type CoaAccount = {
  accid: number
  accNo: string
  name: string
  phone: string
  urdu: string
  balance: number
  status: 'Active' | 'Inactive'
  normalBalance: 'Debit' | 'Credit'
  groupName: string
  chartId: number
}

export type CoaAccountDetail = {
  accid: number
  accNo: string
  name: string
  phone: string
  balance: number
  status: 'Active' | 'Inactive'
  normalBalance: 'Debit' | 'Credit'
  groupName: string
  chartName: string
}

export type CoaFuelSummary = {
  hsd: number
  pmg: number
  ho: number
  advance: number
  others: number
}

export type CoaTxType = 'Credit' | 'Debit'
export type CoaHistoryKind = 'all' | 'credit' | 'debit'
export type CoaHistorySort = 'recent' | 'oldest'

export type CoaTransaction = {
  trid: number
  id: string
  when: string
  type: CoaTxType
  product: string
  quantity: string
  rate: string
  amount: number
  balance: number
  by: string
}

export function formatCoaPkr(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${formatted} PKR`
}

export async function fetchCoaCharts(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; charts: CoaChart[] }>('/api/chart-of-accounts/charts', {
    signal,
  })
  return data.charts
}

export async function fetchCoaSubCharts(chartId: number, signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; subCharts: CoaSubChart[] }>(
    `/api/chart-of-accounts/charts/${chartId}/sub-charts`,
    { signal },
  )
  return data.subCharts
}

export async function fetchCoaAccounts(groupId: number, signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; accounts: CoaAccount[] }>(
    `/api/chart-of-accounts/groups/${groupId}/accounts`,
    { signal },
  )
  return data.accounts
}

export async function fetchCoaAccount(accid: number, signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; account: CoaAccountDetail }>(
    `/api/chart-of-accounts/accounts/${accid}`,
    { signal },
  )
  return data.account
}

export async function fetchCoaAccountSummary(
  accid: number,
  params: { dateFrom?: string; dateTo?: string },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  const qs = search.toString()
  const data = await apiGet<{ ok: true; summary: CoaFuelSummary }>(
    `/api/chart-of-accounts/accounts/${accid}/summary${qs ? `?${qs}` : ''}`,
    { signal },
  )
  return data.summary
}

export async function fetchCoaAccountTransactions(
  accid: number,
  params: {
    kind: CoaHistoryKind
    dateFrom?: string
    dateTo?: string
    sort?: CoaHistorySort
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
  return apiGet<{
    ok: true
    total: number
    offset: number
    limit: number
    transactions: CoaTransaction[]
  }>(`/api/chart-of-accounts/accounts/${accid}/transactions?${search.toString()}`, { signal })
}
