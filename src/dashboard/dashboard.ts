import { apiGet } from '../lib/api'

export type DashboardStats = {
  totalCustomers: number
  totalCredit: number
  totalDebit: number
  todayTransactions: number
}

export type CreditDebitPoint = {
  label: string
  credit: number
  debit: number
}

export type BalanceTrendPoint = {
  label: string
  value: number
}

export type ChartRange = '7d' | '1m' | '6m'

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalCustomers: 0,
  totalCredit: 0,
  totalDebit: 0,
  todayTransactions: 0,
}

export async function fetchDashboardStats(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; stats: DashboardStats }>('/api/dashboard/stats', { signal })
  return data.stats
}

export async function fetchCreditDebitChart(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; creditDebit: CreditDebitPoint[] }>(
    '/api/dashboard/credit-debit',
    { signal },
  )
  return data.creditDebit
}

export async function fetchBalanceTrend(range: ChartRange = '7d', signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; range: ChartRange; balanceTrend: BalanceTrendPoint[] }>(
    `/api/dashboard/balance-trend?range=${range}`,
    { signal },
  )
  return data.balanceTrend
}
