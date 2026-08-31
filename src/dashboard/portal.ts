import { apiGet } from '../lib/api'
import type {
  CustomerDetail,
  CustomerTransaction,
  HistoryKind,
  HistorySort,
} from './customers'

export type PortalFuelSummary = {
  hsd: number
  pmg: number
  ho: number
  advance: number
  others: number
}

type MeResponse = {
  ok: true
  customer: CustomerDetail
  summary: PortalFuelSummary
}

type SummaryResponse = {
  ok: true
  summary: PortalFuelSummary
}

type TxResponse = {
  ok: true
  total: number
  offset: number
  limit: number
  transactions: CustomerTransaction[]
}

export async function fetchPortalMe(
  params: { dateFrom?: string; dateTo?: string } = {},
  signal?: AbortSignal,
) {
  const q = new URLSearchParams()
  if (params.dateFrom) q.set('dateFrom', params.dateFrom)
  if (params.dateTo) q.set('dateTo', params.dateTo)
  const qs = q.toString()
  const data = await apiGet<MeResponse>(`/api/portal/me${qs ? `?${qs}` : ''}`, { signal })
  return { customer: data.customer, summary: data.summary }
}

export async function fetchPortalSummary(
  params: { dateFrom?: string; dateTo?: string } = {},
  signal?: AbortSignal,
) {
  const q = new URLSearchParams()
  if (params.dateFrom) q.set('dateFrom', params.dateFrom)
  if (params.dateTo) q.set('dateTo', params.dateTo)
  const qs = q.toString()
  const data = await apiGet<SummaryResponse>(`/api/portal/summary${qs ? `?${qs}` : ''}`, {
    signal,
  })
  return data.summary
}

export async function fetchPortalTransactions(
  params: {
    kind?: HistoryKind
    dateFrom?: string
    dateTo?: string
    sort?: HistorySort
    offset?: number
    limit?: number
  } = {},
  signal?: AbortSignal,
) {
  const q = new URLSearchParams()
  if (params.kind) q.set('kind', params.kind)
  if (params.dateFrom) q.set('dateFrom', params.dateFrom)
  if (params.dateTo) q.set('dateTo', params.dateTo)
  if (params.sort) q.set('sort', params.sort)
  if (params.offset != null) q.set('offset', String(params.offset))
  if (params.limit != null) q.set('limit', String(params.limit))
  const qs = q.toString()
  const data = await apiGet<TxResponse>(`/api/portal/transactions${qs ? `?${qs}` : ''}`, {
    signal,
  })
  return { transactions: data.transactions, total: data.total }
}
