import { apiGet, apiPost } from '../lib/api'

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

export type CashbookMeta = {
  nextVNo: number
  nextDNo: number
  bizId: number
  cashInHand: CashbookAccount
}

export type CashbookEntry = {
  trid: number
  vno: string
  accNo: string
  accName: string
  groupName: string
  mvno: string
  debit: number
  credit: number
  description: string
  dno: number | null
}

export function formatCashbookBalance(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCashbookAmount(value: number) {
  if (!value) return ''
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

export async function fetchCashbookMeta(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true } & CashbookMeta>('/api/cashbook/meta', { signal })
  return {
    nextVNo: data.nextVNo,
    nextDNo: data.nextDNo,
    bizId: data.bizId,
    cashInHand: data.cashInHand,
  }
}

export async function fetchCashbookEntries(signal?: AbortSignal) {
  const data = await apiGet<{ ok: true; entries: CashbookEntry[] }>('/api/cashbook/entries', {
    signal,
  })
  return data.entries
}

export async function saveCashbookEntry(
  body: {
    voucherType: VoucherType
    debitAccid: number
    creditAccid: number
    description: string
    amount: number
  },
  signal?: AbortSignal,
) {
  return apiPost<{
    ok: true
    voucher: { vno: number; dno: number; amount: number }
    nextVNo: number
    nextDNo: number
    cashInHand: CashbookAccount | null
    entries: CashbookEntry[]
  }>('/api/cashbook/entries', body, { signal })
}
