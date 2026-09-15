import { apiGet } from '../lib/api'

export type DashboardStats = {
  totalCustomers: number
  totalCredit: number
  totalDebit: number
  todayTransactions: number
  dieselSale: number
  petrolSale: number
  cashSale: number
  udharSale: number
}

export type CreditDebitPoint = {
  label: string
  credit: number
  debit: number
}

export type BankRow = {
  accid: number
  name: string
  balance: number
}

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalCustomers: 0,
  totalCredit: 0,
  totalDebit: 0,
  todayTransactions: 0,
  dieselSale: 0,
  petrolSale: 0,
  cashSale: 0,
  udharSale: 0,
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

export async function fetchBanks(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; totalBalance: number; banks: BankRow[] }>(
    '/api/dashboard/banks',
    { signal },
  )
  return { totalBalance: data.totalBalance, banks: data.banks }
}
