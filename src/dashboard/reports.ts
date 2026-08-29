import { apiGet } from '../lib/api'

export type ReportCustomer = {
  accid: number
  name: string
  accNo: string
}

export type ReportSummary = {
  totalCredit: number
  totalDebit: number
  netFlow: number
  totalTx: number
}

export type ReportProductRow = {
  product: string
  credit: string
  debit: string
  net: string
}

export type ReportRecentTx = {
  id: string
  when: string
  type: 'Credit' | 'Debit'
  amount: string
}

export type ReportFilters = {
  types: string[]
  products: string[]
  customers: ReportCustomer[]
  defaultDateFrom: string
  defaultDateTo: string
}

export function formatReportPkr(value: number) {
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildSearch(params: {
  dateFrom?: string
  dateTo?: string
  accid?: number | ''
  type?: string
  product?: string
}) {
  const search = new URLSearchParams()
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  if (params.accid) search.set('accid', String(params.accid))
  if (params.type) search.set('type', params.type)
  if (params.product) search.set('product', params.product)
  return search.toString()
}

export async function fetchReportFilters(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true } & ReportFilters>('/api/reports/filters', { signal })
  return data
}

export async function fetchReportSummary(
  params: {
    dateFrom?: string
    dateTo?: string
    accid?: number | ''
    type?: string
    product?: string
  },
  signal?: AbortSignal,
) {
  const qs = buildSearch(params)
  const data = await apiGet<{ ok: true; summary: ReportSummary }>(
    `/api/reports/summary${qs ? `?${qs}` : ''}`,
    { signal },
  )
  return data.summary
}

export async function fetchReportProducts(
  params: {
    dateFrom?: string
    dateTo?: string
    accid?: number | ''
    type?: string
  },
  signal?: AbortSignal,
) {
  const qs = buildSearch(params)
  const data = await apiGet<{ ok: true; products: ReportProductRow[] }>(
    `/api/reports/products${qs ? `?${qs}` : ''}`,
    { signal },
  )
  return data.products
}

export async function fetchReportRecent(
  params: {
    dateFrom?: string
    dateTo?: string
    accid?: number | ''
    type?: string
    product?: string
  },
  signal?: AbortSignal,
) {
  const qs = buildSearch(params)
  const data = await apiGet<{ ok: true; transactions: ReportRecentTx[] }>(
    `/api/reports/recent${qs ? `?${qs}` : ''}`,
    { signal },
  )
  return data.transactions
}
