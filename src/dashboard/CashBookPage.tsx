import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../toast'
import {
  fetchCashbookAccounts,
  fetchCashbookEntries,
  fetchCashbookMeta,
  formatCashbookAmount,
  formatCashbookBalance,
  sanitizeAmountInput,
  saveCashbookEntry,
  VOUCHER_TYPES,
  type CashbookAccount,
  type CashbookEntry,
  type VoucherType,
} from './cashbook'
import { LoadingHint } from './loading'
import { panel } from './styles'

type Props = {
  homePath: string
}

const fieldLabel =
  'text-[0.78rem] font-bold text-ink sm:w-[7.75rem] sm:shrink-0 sm:pt-2.5'
const inputBase =
  'h-10 w-full rounded-[0.65rem] border border-line bg-white px-3 text-[0.88rem] font-semibold text-ink outline-none transition focus:border-fuel disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-muted'
const refSelectBase =
  'h-10 w-[5.75rem] shrink-0 rounded-[0.65rem] border border-line bg-fuel-soft px-1.5 text-[0.82rem] font-bold text-ink outline-none transition focus:border-fuel disabled:cursor-not-allowed disabled:opacity-70 sm:w-[6.25rem]'

export function CashBookPage({ homePath }: Props) {
  const [accounts, setAccounts] = useState<CashbookAccount[]>([])
  const [entries, setEntries] = useState<CashbookEntry[]>([])
  const [cashInHand, setCashInHand] = useState<CashbookAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [voucherNo, setVoucherNo] = useState('')
  const [voucherType, setVoucherType] = useState<VoucherType | ''>('')
  const [debitAccid, setDebitAccid] = useState('')
  const [creditAccid, setCreditAccid] = useState('')
  const [debitRef, setDebitRef] = useState('')
  const [creditRef, setCreditRef] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const debitLocked = voucherType === 'Cash Received'
  const creditLocked = voucherType === 'Cash Payment'
  const creditAboveDebit = voucherType === 'Cash Received'

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    Promise.all([
      fetchCashbookAccounts(ac.signal),
      fetchCashbookMeta(ac.signal),
      fetchCashbookEntries(ac.signal),
    ])
      .then(([accRows, meta, entryRows]) => {
        if (ac.signal.aborted) return
        setAccounts(accRows)
        setCashInHand(meta.cashInHand)
        setVoucherNo(String(meta.nextVNo))
        setEntries(entryRows)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load cash book')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (!cashInHand) return
    if (voucherType === 'Cash Payment') {
      setCreditAccid(String(cashInHand.accid))
      setCreditRef(cashInHand.accNo || '')
    } else if (voucherType === 'Cash Received') {
      setDebitAccid(String(cashInHand.accid))
      setDebitRef(cashInHand.accNo || '')
    }
  }, [voucherType, cashInHand])

  const debitAccount = useMemo(
    () => accounts.find((a) => String(a.accid) === debitAccid) ?? null,
    [accounts, debitAccid],
  )
  const creditAccount = useMemo(
    () => accounts.find((a) => String(a.accid) === creditAccid) ?? null,
    [accounts, creditAccid],
  )

  const refOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const acc of accounts) {
      const ref = (acc.accNo || '').trim()
      if (!ref) continue
      const key = ref.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      opts.push({ value: ref, label: ref })
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  }, [accounts])

  function selectDebit(accid: string) {
    if (debitLocked) return
    setDebitAccid(accid)
    const acc = accounts.find((a) => String(a.accid) === accid)
    setDebitRef(acc?.accNo || '')
  }

  function selectCredit(accid: string) {
    if (creditLocked) return
    setCreditAccid(accid)
    const acc = accounts.find((a) => String(a.accid) === accid)
    setCreditRef(acc?.accNo || '')
  }

  function selectDebitRef(ref: string) {
    if (debitLocked) return
    setDebitRef(ref)
    if (!ref) {
      setDebitAccid('')
      return
    }
    const match = accounts.find((a) => a.accNo.toLowerCase() === ref.toLowerCase())
    if (match) setDebitAccid(String(match.accid))
  }

  function selectCreditRef(ref: string) {
    if (creditLocked) return
    setCreditRef(ref)
    if (!ref) {
      setCreditAccid('')
      return
    }
    const match = accounts.find((a) => a.accNo.toLowerCase() === ref.toLowerCase())
    if (match) setCreditAccid(String(match.accid))
  }

  function resetPartyFields(keepType: boolean) {
    if (!keepType) setVoucherType('')
    setDebitAccid('')
    setCreditAccid('')
    setDebitRef('')
    setCreditRef('')
    setDescription('')
    setAmount('')
    if (keepType && cashInHand) {
      if (voucherType === 'Cash Payment') {
        setCreditAccid(String(cashInHand.accid))
        setCreditRef(cashInHand.accNo || '')
      } else if (voucherType === 'Cash Received') {
        setDebitAccid(String(cashInHand.accid))
        setDebitRef(cashInHand.accNo || '')
      }
    }
  }

  async function handleSave() {
    if (!voucherType) {
      toast.error('Select voucher type')
      return
    }
    if (!debitAccid || !creditAccid) {
      toast.error('Select debit and credit accounts')
      return
    }
    if (debitAccid === creditAccid) {
      toast.error('Debit and credit accounts must be different')
      return
    }
    const desc = description.trim()
    if (!desc) {
      toast.error('Description is required')
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!voucherNo) {
      toast.error('Voucher number not ready')
      return
    }

    setSaving(true)
    try {
      const result = await saveCashbookEntry({
        voucherType,
        debitAccid: Number(debitAccid),
        creditAccid: Number(creditAccid),
        description: desc,
        amount: amt,
      })
      setEntries(result.entries)
      setVoucherNo(String(result.nextVNo))
      if (result.cashInHand) setCashInHand(result.cashInHand)
      // refresh account balances
      const refreshed = await fetchCashbookAccounts()
      setAccounts(refreshed)
      resetPartyFields(true)
      toast.success(`Saved voucher #${result.voucher.vno}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save entry')
    } finally {
      setSaving(false)
    }
  }

  const formRef = useRef<HTMLDivElement>(null)

  const fieldOrder = useMemo(() => {
    if (creditAboveDebit) {
      return [
        'voucherType',
        ...(creditLocked ? [] : ['creditRef', 'creditAccount']),
        ...(debitLocked ? [] : ['debitRef', 'debitAccount']),
        'description',
        'amount',
      ]
    }
    return [
      'voucherType',
      ...(debitLocked ? [] : ['debitRef', 'debitAccount']),
      ...(creditLocked ? [] : ['creditRef', 'creditAccount']),
      'description',
      'amount',
    ]
  }, [creditAboveDebit, debitLocked, creditLocked])

  function focusNextFrom(currentId: string) {
    const idx = fieldOrder.indexOf(currentId)
    if (idx < 0) return
    for (let i = idx + 1; i < fieldOrder.length; i++) {
      const next = fieldOrder[i]
      const el = formRef.current?.querySelector<HTMLElement>(`[data-cb-field="${next}"]`)
      if (el && !(el as HTMLButtonElement | HTMLInputElement).disabled) {
        el.focus()
        return
      }
    }
  }

  function onFormEnter(event: KeyboardEvent, fieldId: string) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (fieldId === 'amount') {
      if (!saving) void handleSave()
      return
    }
    focusNextFrom(fieldId)
  }

  const debitRow = (
    <FormRow label="Debit Account">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="shrink-0">
            <RefSelect
              value={debitRef}
              options={refOptions}
              ariaLabel="Debit account reference"
              disabled={debitLocked}
              fieldId="debitRef"
              onChange={selectDebitRef}
              onEnterNext={() => focusNextFrom('debitRef')}
            />
          </div>
          <div className="min-w-0 flex-1">
            <AccountSelect
              value={debitAccid}
              accounts={accounts}
              placeholder="Select debit account"
              ariaLabel="Debit account"
              disabled={debitLocked}
              fieldId="debitAccount"
              onChange={selectDebit}
              onEnterNext={() => focusNextFrom('debitAccount')}
            />
          </div>
        </div>
        <AccBalBox balance={debitAccount?.balance ?? null} />
      </div>
    </FormRow>
  )

  const creditRow = (
    <FormRow label="Credit Account">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="shrink-0">
            <RefSelect
              value={creditRef}
              options={refOptions}
              ariaLabel="Credit account reference"
              disabled={creditLocked}
              fieldId="creditRef"
              onChange={selectCreditRef}
              onEnterNext={() => focusNextFrom('creditRef')}
            />
          </div>
          <div className="min-w-0 flex-1">
            <AccountSelect
              value={creditAccid}
              accounts={accounts}
              placeholder="Select credit account"
              ariaLabel="Credit account"
              disabled={creditLocked}
              fieldId="creditAccount"
              onChange={selectCredit}
              onEnterNext={() => focusNextFrom('creditAccount')}
            />
          </div>
        </div>
        <AccBalBox balance={creditAccount?.balance ?? null} />
      </div>
    </FormRow>
  )

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div>
        <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.65rem]">
          Cash Book
        </h1>
        <p className="mt-1 mb-0 text-[0.78rem] font-medium text-muted">
          <Link to={homePath} className="text-muted no-underline hover:text-ink">
            Home
          </Link>
          <span className="mx-1.5 text-[#c4c9d2]">›</span>
          <span className="text-ink">Cash Book</span>
        </p>
      </div>

      {loading && accounts.length === 0 ? (
        <LoadingHint label="Loading cash book…" />
      ) : (
        <section className={`${panel} overflow-visible rounded-2xl p-4 lg:p-5`} aria-label="Cash book form">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
                <CashIcon />
              </span>
              <div>
                <h2 className="m-0 text-[0.95rem] font-extrabold text-ink">Cash Book Entry</h2>
                <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">
                  Date &amp; time auto · RefNo WEB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[0.65rem] border-0 bg-fuel px-4 text-[0.84rem] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div
            ref={formRef}
            className="flex flex-col gap-3.5 sm:gap-4"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const target = e.target as HTMLElement
              const fieldId = target.getAttribute('data-cb-field')
              if (!fieldId) return
              // Dropdown search inputs handle Enter via option click; skip listbox search
              if (target.getAttribute('type') === 'search') return
              onFormEnter(e, fieldId)
            }}
          >
            <FormRow label="Voucher Type">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 sm:max-w-[18rem]">
                  <MenuSelect
                    value={voucherType}
                    placeholder="Select voucher type"
                    ariaLabel="Voucher type"
                    fieldId="voucherType"
                    options={VOUCHER_TYPES.map((t) => ({ value: t, label: t }))}
                    onChange={(next) => setVoucherType(next as VoucherType | '')}
                    onEnterNext={() => focusNextFrom('voucherType')}
                  />
                </div>
                <label className="flex items-center gap-2 sm:ml-auto">
                  <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted whitespace-nowrap">
                    Voucher #
                  </span>
                  <input
                    type="text"
                    value={voucherNo}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    className={`${inputBase} w-[7.5rem] text-right`}
                  />
                </label>
              </div>
            </FormRow>

            {creditAboveDebit ? (
              <>
                {creditRow}
                {debitRow}
              </>
            ) : (
              <>
                {debitRow}
                {creditRow}
              </>
            )}

            <FormRow label="Description">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  data-cb-field="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  className={`${inputBase} min-w-0 flex-1`}
                  maxLength={500}
                  required
                />
                <label className="flex items-center gap-2 sm:shrink-0">
                  <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted whitespace-nowrap">
                    Amount
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    data-cb-field="amount"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                    placeholder="0.00"
                    className={`${inputBase} w-full tabular-nums sm:w-[9.5rem]`}
                    autoComplete="off"
                    required
                  />
                </label>
              </div>
            </FormRow>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-[#fafbfc]">
                  {[
                    'VNo',
                    'AccNo',
                    'AccName',
                    'GroupName',
                    'MVNo',
                    'Debit',
                    'Credit',
                    'Description',
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-2.5 py-2.5 text-left text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-[0.82rem] font-semibold text-muted"
                    >
                      No web entries yet. Saved vouchers with RefNo WEB appear here.
                    </td>
                  </tr>
                ) : (
                  entries.map((row) => (
                    <tr key={row.trid} className="hover:bg-[#fcfcfd]">
                      <Td>{row.vno}</Td>
                      <Td>{row.accNo}</Td>
                      <Td className="font-semibold text-ink">{row.accName}</Td>
                      <Td>{row.groupName}</Td>
                      <Td>{row.mvno || '—'}</Td>
                      <Td align="right">{formatCashbookAmount(row.debit)}</Td>
                      <Td align="right">{formatCashbookAmount(row.credit)}</Td>
                      <Td className="max-w-[220px] whitespace-normal">{row.description || '—'}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className={fieldLabel}>{label}</span>
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  )
}

function AccBalBox({ balance }: { balance: number | null }) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:w-[13rem]">
      <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted whitespace-nowrap">
        Acc Bal.
      </span>
      <div className="flex h-10 min-w-0 flex-1 items-center justify-end rounded-[0.65rem] border border-line bg-[#fafbfc] px-3 text-[0.88rem] font-extrabold tabular-nums text-ink">
        {balance == null ? '—' : formatCashbookBalance(balance)}
      </div>
    </div>
  )
}

function Td({
  children,
  className = '',
  align = 'left',
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  return (
    <td
      className={`border-b border-[#f1f2f4] px-2.5 py-2.5 text-[0.78rem] whitespace-nowrap text-[#374151] ${
        align === 'right' ? 'text-right tabular-nums' : ''
      } ${className}`}
    >
      {children}
    </td>
  )
}

function MenuSelect({
  value,
  options,
  placeholder,
  ariaLabel,
  onChange,
  fieldId,
  onEnterNext,
}: {
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  ariaLabel: string
  onChange: (value: string) => void
  fieldId?: string
  onEnterNext?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const label = options.find((o) => o.value === value)?.label || placeholder

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-cb-field={fieldId}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((c) => !c)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !open) {
            e.preventDefault()
            e.stopPropagation()
            onEnterNext?.()
          }
        }}
        className={`${inputBase} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={`min-w-0 truncate ${value ? 'text-ink' : 'text-muted'}`}>{label}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-[80] max-h-64 overflow-auto rounded-2xl border border-line bg-white py-1.5 shadow-[0_12px_32px_rgba(26,29,33,0.14)]"
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li key={opt.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full cursor-pointer border-0 px-3 py-2.5 text-left text-[0.84rem] font-semibold ${
                    active ? 'bg-[#fff6d6] text-ink' : 'bg-transparent text-ink hover:bg-[#f7f8fa]'
                  }`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function RefSelect({
  value,
  options,
  ariaLabel,
  onChange,
  disabled = false,
  fieldId,
  onEnterNext,
}: {
  value: string
  options: { value: string; label: string }[]
  ariaLabel: string
  onChange: (value: string) => void
  disabled?: boolean
  fieldId?: string
  onEnterNext?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const label = value || 'Ref'
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open || disabled) return
    const id = window.requestAnimationFrame(() => {
      setQuery('')
      inputRef.current?.focus()
    })
    function onPointer(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, disabled])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-cb-field={fieldId}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Customer reference (AccNo)"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((c) => !c)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !open && !disabled) {
            e.preventDefault()
            e.stopPropagation()
            onEnterNext?.()
          }
        }}
        className={`${refSelectBase} flex cursor-pointer items-center justify-between gap-0.5 text-left`}
      >
        <span className={`min-w-0 flex-1 truncate text-center ${value ? 'text-ink' : 'text-muted'}`}>
          {label}
        </span>
        <Chevron open={open} />
      </button>
      {open && !disabled ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[80] w-[9.5rem] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(26,29,33,0.14)]">
          <div className="border-b border-line p-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ref…"
              className="h-8 w-full rounded-lg border border-line bg-[#fafbfc] px-2 text-[0.75rem] font-semibold text-ink outline-none focus:border-fuel"
            />
          </div>
          <ul role="listbox" className="m-0 max-h-48 list-none overflow-auto p-0 py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[0.75rem] font-semibold text-muted">No refs</li>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value
                return (
                  <li key={opt.value} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`flex w-full cursor-pointer border-0 px-3 py-2 text-left text-[0.8rem] font-bold ${
                        active ? 'bg-[#fff6d6] text-ink' : 'bg-transparent text-ink hover:bg-[#f7f8fa]'
                      }`}
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function AccountSelect({
  value,
  accounts,
  placeholder,
  ariaLabel,
  onChange,
  disabled = false,
  fieldId,
  onEnterNext,
}: {
  value: string
  accounts: CashbookAccount[]
  placeholder: string
  ariaLabel: string
  onChange: (value: string) => void
  disabled?: boolean
  fieldId?: string
  onEnterNext?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = accounts.find((a) => String(a.accid) === value)
  const label = selected ? selected.name : placeholder
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.accNo.toLowerCase().includes(q) ||
        String(a.accid).includes(q),
    )
  }, [accounts, query])

  useEffect(() => {
    if (!open || disabled) return
    const id = window.requestAnimationFrame(() => {
      setQuery('')
      inputRef.current?.focus()
    })
    function onPointer(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, disabled])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-cb-field={fieldId}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((c) => !c)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !open && !disabled) {
            e.preventDefault()
            e.stopPropagation()
            onEnterNext?.()
          }
        }}
        className={`${inputBase} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={`min-w-0 truncate ${value ? 'text-ink' : 'text-muted'}`}>{label}</span>
        <Chevron open={open} />
      </button>
      {open && !disabled ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-[80] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(26,29,33,0.14)]">
          <div className="border-b border-line p-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer…"
              className="h-9 w-full rounded-lg border border-line bg-[#fafbfc] px-2.5 text-[0.8rem] font-semibold text-ink outline-none focus:border-fuel"
            />
          </div>
          <ul role="listbox" className="m-0 max-h-56 list-none overflow-auto p-0 py-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[0.8rem] font-semibold text-muted">No accounts found</li>
            ) : (
              filtered.map((acc) => {
                const active = String(acc.accid) === value
                return (
                  <li key={acc.accid} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`flex w-full cursor-pointer border-0 px-3 py-2 text-left text-[0.82rem] font-semibold ${
                        active ? 'bg-[#fff6d6] text-ink' : 'bg-transparent text-ink hover:bg-[#f7f8fa]'
                      }`}
                      onClick={() => {
                        onChange(String(acc.accid))
                        setOpen(false)
                      }}
                    >
                      {acc.name}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 9h17M8 13h3M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
