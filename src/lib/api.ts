import { getSession } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || ''
const READ_KEY = import.meta.env.VITE_API_READ_KEY || ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiGet<T>(path: string, init?: { signal?: AbortSignal }): Promise<T> {
  const session = getSession()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-FuelLedger-Key': READ_KEY,
  }
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers,
    signal: init?.signal,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    throw new ApiError(data.message || 'Request failed', res.status)
  }
  return data as T
}
