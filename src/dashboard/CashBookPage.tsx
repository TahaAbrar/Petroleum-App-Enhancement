import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../toast'
import {
  fetchCashbookAccounts,
  formatCashbookBalance,
  sanitizeAmountInput,
  todayIsoDate,
  VOUCHER_TYPES,
  type CashbookAccount,
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
  'h-10 w-full rounded-[0.65rem] border border-line bg-white px-3 text-[0.88rem] font-semibold text-ink outline-none transition focus:border-fuel'
const refSelectBase =
  'h-10 w-[5.75rem] shrink-0 rounded-[0.65rem] border border-line bg-fuel-soft px-1.5 text-[0.82rem] font-bold text-ink outline-none transition focus:border-fuel sm:w-[6.25rem]'

export function CashBookPage({ homePath }: Props) {
  const [accounts, setAccounts] = useState<CashbookAccount[]>([])
  const [loading, setLoading] = useState(true)

  const [dated, setDated] = useState(todayIsoDate)
  const [voucherNo, setVoucherNo] = useState('')
  const [voucherType, setVoucherType] = useState<VoucherType | ''>('')
  const [debitAccid, setDebitAccid] = useState('')
  const [creditAccid, setCreditAccid] = useState('')
  const [debitRef, setDebitRef] = useState('')
  const [creditRef, setCreditRef] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    fetchCashbookAccounts(ac.signal)
      .then((rows) => {
        if (!ac.signal.aborted) setAccounts(rows)
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load accounts')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [])

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
    const opts: { value: string; label: string; accid: string }[] = []
    for (const acc of accounts) {
      const ref = (acc.accNo || '').trim()
      if (!ref) continue
      const key = ref.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      opts.push({ value: ref, label: ref, accid: String(acc.accid) })
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  }, [accounts])

  function selectDebit(accid: string) {
    setDebitAccid(accid)
    const acc = accounts.find((a) => String(a.accid) === accid)
    setDebitRef(acc?.accNo || '')
  }

  function selectCredit(accid: string) {
    setCreditAccid(accid)
    const acc = accounts.find((a) => String(a.accid) === accid)
    setCreditRef(acc?.accNo || '')
  }

  function selectDebitRef(ref: string) {
    setDebitRef(ref)
    if (!ref) {
      setDebitAccid('')
      return
    }
    const match = accounts.find((a) => a.accNo.toLowerCase() === ref.toLowerCase())
    if (match) setDebitAccid(String(match.accid))
  }

  function selectCreditRef(ref: string) {
    setCreditRef(ref)
    if (!ref) {
      setCreditAccid('')
      return
    }
    const match = accounts.find((a) => a.accNo.toLowerCase() === ref.toLowerCase())
    if (match) setCreditAccid(String(match.accid))
  }

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        <label className="flex min-w-0 flex-col gap-1.5 sm:max-w-[12.5rem]">
          <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted">Date</span>
          <input
            type="date"
            value={dated}
            onChange={(e) => setDated(e.target.value)}
            className={inputBase}
          />
        </label>
      </div>

      {loading && accounts.length === 0 ? (
        <LoadingHint label="Loading cash book…" />
      ) : (
        <section className={`${panel} overflow-visible rounded-2xl p-4 lg:p-5`} aria-label="Cash book form">
          <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
            <span className="grid size-9 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
              <CashIcon />
            </span>
            <div>
              <h2 className="m-0 text-[0.95rem] font-extrabold text-ink">Cash Book Entry</h2>
              <p className="mt-0.5 mb-0 text-[0.72rem] font-medium text-muted">
                Add debit / credit voucher
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 sm:gap-4">
            <FormRow label="Voucher Type">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 sm:max-w-[18rem]">
                  <MenuSelect
                    value={voucherType}
                    placeholder="Select voucher type"
                    ariaLabel="Voucher type"
                    options={VOUCHER_TYPES.map((t) => ({ value: t, label: t }))}
                    onChange={(next) => setVoucherType(next as VoucherType | '')}
                  />
                </div>
                <label className="flex items-center gap-2 sm:ml-auto">
                  <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted whitespace-nowrap">
                    Voucher #
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="—"
                    className={`${inputBase} w-[7.5rem] text-right`}
                  />
                </label>
              </div>
            </FormRow>

            <FormRow label="Debit Account">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="shrink-0">
                    <RefSelect
                      value={debitRef}
                      options={refOptions}
                      ariaLabel="Debit account reference"
                      onChange={selectDebitRef}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <AccountSelect
                      value={debitAccid}
                      accounts={accounts}
                      placeholder="Select debit account"
                      ariaLabel="Debit account"
                      onChange={selectDebit}
                    />
                  </div>
                </div>
                <AccBalBox balance={debitAccount?.balance ?? null} />
              </div>
            </FormRow>

            <FormRow label="Credit Account">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="shrink-0">
                    <RefSelect
                      value={creditRef}
                      options={refOptions}
                      ariaLabel="Credit account reference"
                      onChange={selectCreditRef}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <AccountSelect
                      value={creditAccid}
                      accounts={accounts}
                      placeholder="Select credit account"
                      ariaLabel="Credit account"
                      onChange={selectCredit}
                    />
                  </div>
                </div>
                <AccBalBox balance={creditAccount?.balance ?? null} />
              </div>
            </FormRow>

            <FormRow label="Description">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  className={`${inputBase} min-w-0 flex-1`}
                  maxLength={500}
                />
                <label className="flex items-center gap-2 sm:shrink-0">
                  <span className="text-[0.72rem] font-bold tracking-[0.02em] text-muted whitespace-nowrap">
                    Amount
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                    placeholder="0.00"
                    className={`${inputBase} w-full tabular-nums sm:w-[9.5rem]`}
                    autoComplete="off"
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
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-[0.82rem] font-semibold text-muted"
                  >
                    Entries will appear here after save.
                  </td>
                </tr>
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

function RefSelect({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  ariaLabel: string
  onChange: (value: string) => void
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
    if (!open) return
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
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Customer reference (AccNo)"
        onClick={() => setOpen((c) => !c)}
        className={`${refSelectBase} flex cursor-pointer items-center justify-between gap-0.5 text-left`}
      >
        <span className={`min-w-0 flex-1 truncate text-center ${value ? 'text-ink' : 'text-muted'}`}>
          {label}
        </span>
        <Chevron open={open} />
      </button>
      {open ? (
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

function MenuSelect({
  value,
  options,
  placeholder,
  ariaLabel,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  ariaLabel: string
  onChange: (value: string) => void
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
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((c) => !c)}
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

function AccountSelect({
  value,
  accounts,
  placeholder,
  ariaLabel,
  onChange,
}: {
  value: string
  accounts: CashbookAccount[]
  placeholder: string
  ariaLabel: string
  onChange: (value: string) => void
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
    if (!open) return
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
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((c) => !c)}
        className={`${inputBase} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={`min-w-0 truncate ${value ? 'text-ink' : 'text-muted'}`}>{label}</span>
        <Chevron open={open} />
      </button>
      {open ? (
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
