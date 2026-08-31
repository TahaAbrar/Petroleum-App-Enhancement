import { apiGet } from '../lib/api'

export const VOUCHER_TYPES = [
  'Cash Payment',
  'Cash Received',
  'JV',
  'Online',
  'Cheque',
  'Transfer',
] as const

export type VoucherType = (typeof VOUCHER_TYPES)[number]

export type CashbookAccount = {
  accid: number
  name: string
  accNo: string
  balance: number
}

export function formatCashbookBalance(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function todayIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Allow only digits and at most one decimal point. */
export function sanitizeAmountInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return cleaned
  return `${parts[0]}.${parts.slice(1).join('').replace(/\./g, '')}`
}

export async function fetchCashbookAccounts(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; accounts: CashbookAccount[] }>(
    '/api/cashbook/accounts',
    { signal },
  )
  return data.accounts
}
