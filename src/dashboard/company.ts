import { apiGet } from '../lib/api'

export type CompanyProfile = {
  name: string
  address: string
  phone: string
  logoUrl: string | null
}

export const FALLBACK_COMPANY: CompanyProfile = {
  name: 'FuelLedger',
  address: '',
  phone: '',
  logoUrl: null,
}

let cache: { company: CompanyProfile; at: number } | null = null
let inflight: Promise<CompanyProfile> | null = null

export function peekCompany() {
  return cache?.company ?? null
}

export async function fetchCompany(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; company: CompanyProfile }>('/api/company', { signal })
  return data.company
}

export async function loadCompany(opts?: { force?: boolean }) {
  if (!opts?.force && cache) return cache.company
  if (inflight) return inflight
  inflight = fetchCompany()
    .then((company) => {
      cache = { company, at: Date.now() }
      return company
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** One-line address similar length to old subtitle (~28–36 chars). */
export function truncateAddress(address: string, max = 34) {
  const text = String(address || '').trim()
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}
