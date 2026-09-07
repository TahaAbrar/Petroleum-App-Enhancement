import { useState, type ReactNode, type Ref } from 'react'
import {
  formatTxDate,
  ledgerAmount,
  type TransactionCustomer,
  type TransactionRow,
} from './transactions'
import { panel } from './styles'

export function MobileVoucherCard({
  group,
  cardRef,
  canView,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: {
  group: { key: string; rows: TransactionRow[] }
  cardRef?: Ref<HTMLLIElement>
  canView: boolean
  canDelete: boolean
  onView: (row: TransactionRow) => void
  onEdit: (row: TransactionRow) => void
  onDelete: (row: TransactionRow) => void
}) {
  return (
    <li ref={cardRef} className={`${panel} rounded-2xl p-3.5`}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {group.rows.map((row) => (
          <li key={row.trid} className="rounded-xl bg-[#fafbfc] px-3 py-2.5">
            <p className="m-0 text-[0.72rem] font-semibold text-muted">
              {formatTxDate(row.when)} · V.No {row.vno} · {row.paymentType}
            </p>
            {canView ? (
              <button
                type="button"
                onClick={() => onView(row)}
                className="m-0 block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[0.84rem] font-extrabold text-ink"
              >
                {row.customer}
              </button>
            ) : (
              <p className="m-0 truncate text-[0.84rem] font-extrabold text-ink">{row.customer}</p>
            )}
            {row.description && row.description !== '—' ? (
              <p className="mt-1 mb-0 line-clamp-2 text-[0.75rem] font-medium text-muted" title={row.description}>
                {row.description}
              </p>
            ) : null}
            <div className="mt-2 grid grid-cols-3 gap-2 text-[0.78rem]">
              <div>
                <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">Debit</p>
                <p className={`mt-1 mb-0 font-extrabold ${row.debit > 0 ? 'text-debit' : 'text-muted'}`}>
                  {ledgerAmount(row.debit)}
                </p>
              </div>
              <div>
                <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">Credit</p>
                <p className={`mt-1 mb-0 font-extrabold ${row.credit > 0 ? 'text-credit' : 'text-muted'}`}>
                  {ledgerAmount(row.credit)}
                </p>
              </div>
              <div>
                <p className="m-0 text-[0.65rem] font-bold tracking-[0.04em] text-muted uppercase">Balance</p>
                <p className="mt-1 mb-0 font-extrabold text-ink">{ledgerAmount(row.balance)}</p>
              </div>
            </div>
            {canDelete ? (
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-[#FFF8E1] text-[#B8860B] hover:brightness-95"
                  aria-label="Edit account"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-debit-bg text-debit hover:brightness-95"
                  aria-label="Delete transaction"
                >
                  <DeleteIcon />
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </li>
  )
}

export function TxTableHead({ canDelete }: { canDelete: boolean }) {
  return (
    <thead>
      <tr>
        <Th>Date</Th>
        <Th>V.No</Th>
        <Th>Account Name</Th>
        <Th>Description</Th>
        <Th>Type</Th>
        <Th className="text-right">Debit</Th>
        <Th className="text-right">Credit</Th>
        <Th className="text-right">Acc Bal.</Th>
        {canDelete ? <Th className="text-center">Action</Th> : null}
      </tr>
    </thead>
  )
}

export function TxTableColgroup({ canDelete }: { canDelete: boolean }) {
  return (
    <colgroup>
      <col className="w-[9%]" />
      <col className="w-[7%]" />
      <col className={canDelete ? 'w-[16%]' : 'w-[18%]'} />
      <col className={canDelete ? 'w-[18%]' : 'w-[20%]'} />
      <col className="w-[9%]" />
      <col className="w-[11%]" />
      <col className="w-[11%]" />
      <col className="w-[11%]" />
      {canDelete ? <col className="w-[8%]" /> : null}
    </colgroup>
  )
}

export function TxLedgerRow({
  row,
  legIndex,
  groupSize,
  canView,
  canDelete,
  onView,
  onEdit,
  onDelete,
  rowRef,
}: {
  row: TransactionRow
  legIndex: number
  groupSize: number
  canView: boolean
  canDelete: boolean
  onView: (row: TransactionRow) => void
  onEdit: (row: TransactionRow) => void
  onDelete: (row: TransactionRow) => void
  rowRef?: Ref<HTMLTableRowElement>
}) {
  return (
    <tr
      ref={rowRef}
      className={`hover:bg-[#fcfcfd] ${
        legIndex === groupSize - 1 ? 'border-b-2 border-[#e8eaee]' : ''
      }`}
    >
      <Td>
        <span className="block leading-snug break-words">{formatTxDate(row.when)}</span>
      </Td>
      <Td className="font-semibold text-ink">{row.vno || '—'}</Td>
      <Td className="min-w-0 font-semibold text-ink">
        {canView ? (
          <button
            type="button"
            onClick={() => onView(row)}
            className="line-clamp-2 cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-ink hover:text-[#c99700]"
            title={row.customer}
          >
            {row.customer}
          </button>
        ) : (
          <span className="line-clamp-2 break-words" title={row.customer}>
            {row.customer}
          </span>
        )}
      </Td>
      <Td className="min-w-0">
        <span className="line-clamp-2 break-words" title={row.description || ''}>
          {row.description && row.description !== '—' ? row.description : '—'}
        </span>
      </Td>
      <Td>{row.paymentType || '—'}</Td>
      <Td className={`text-right font-bold ${row.debit > 0 ? 'text-debit' : ''}`}>
        {ledgerAmount(row.debit)}
      </Td>
      <Td className={`text-right font-bold ${row.credit > 0 ? 'text-credit' : ''}`}>
        {ledgerAmount(row.credit)}
      </Td>
      <Td className="text-right font-bold text-ink">{ledgerAmount(row.balance)}</Td>
      {canDelete ? (
        <Td className="text-center">
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-[#FFF8E1] text-[#B8860B] hover:brightness-95"
              aria-label="Edit account"
            >
              <EditIcon />
            </button>
            <button
              type="button"
              onClick={() => onDelete(row)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-debit-bg text-debit hover:brightness-95"
              aria-label="Delete transaction"
            >
              <DeleteIcon />
            </button>
          </div>
        </Td>
      ) : null}
    </tr>
  )
}

export function DeleteTxModal({
  step,
  password,
  deleting,
  onPasswordChange,
  onClose,
  onBack,
  onContinue,
  onConfirm,
}: {
  step: 'confirm' | 'password'
  password: string
  deleting: boolean
  onPasswordChange: (value: string) => void
  onClose: () => void
  onBack: () => void
  onContinue: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close delete confirmation"
        disabled={deleting}
        onClick={onClose}
      />
      {step === 'confirm' ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-delete-title"
          className="relative z-10 w-full max-w-[22rem] rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(26,29,33,0.2)] animate-rise"
        >
          <h2
            id="tx-delete-title"
            className="m-0 text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink"
          >
            Delete Confirmation
          </h2>
          <p className="mt-2 mb-0 text-[0.88rem] font-medium leading-relaxed text-muted">
            This will permanently delete both the Debit and Credit entries for this voucher.
            Continue?
          </p>
          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={onContinue}
              className="cursor-pointer rounded-xl border-0 bg-[#e11d48] px-4 py-2.5 text-[0.85rem] font-bold text-white shadow-[0_6px_14px_rgba(225,29,72,0.28)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-admin-pass-title"
          className="relative z-10 w-full max-w-[22rem] rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(26,29,33,0.2)] animate-rise"
        >
          <h2
            id="tx-admin-pass-title"
            className="m-0 text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink"
          >
            Admin Password
          </h2>
          <p className="mt-2 mb-0 text-[0.88rem] font-medium leading-relaxed text-muted">
            Enter the administrator password to permanently delete this voucher. Wrong password will
            not delete any data.
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[0.75rem] font-bold uppercase tracking-[0.04em] text-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              disabled={deleting}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onConfirm()
                }
              }}
              className="box-border w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.9rem] font-medium text-ink outline-none focus:border-fuel disabled:opacity-60"
              placeholder="Admin password"
            />
          </label>
          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={deleting}
              onClick={onBack}
              className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              disabled={deleting || !password.trim()}
              onClick={onConfirm}
              className="cursor-pointer rounded-xl border-0 bg-[#e11d48] px-4 py-2.5 text-[0.85rem] font-bold text-white shadow-[0_6px_14px_rgba(225,29,72,0.28)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function EditAccidModal({
  currentAccid,
  vno,
  type,
  accounts,
  newAccid,
  password,
  saving,
  onAccidChange,
  onPasswordChange,
  onClose,
  onConfirm,
}: {
  currentAccid: number
  vno: string
  type: string
  accounts: TransactionCustomer[]
  newAccid: string
  password: string
  saving: boolean
  onAccidChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = accounts.find((row) => String(row.accid) === newAccid)
  const current = accounts.find((row) => row.accid === currentAccid)
  const q = query.trim().toLowerCase()
  const filtered = !q
    ? accounts
    : accounts.filter(
        (row) => row.name.toLowerCase().includes(q) || String(row.accid).includes(q),
      )
  const field =
    'rounded-xl border border-line bg-[#f7f8fa] px-3.5 py-2.5 text-[0.9rem] font-semibold text-ink'
  const labelCls = 'mb-1.5 block text-[0.75rem] font-bold uppercase tracking-[0.04em] text-muted'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close edit modal"
        disabled={saving}
        onClick={onClose}
      />
      <form
        autoComplete="off"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-edit-accid-title"
        className="relative z-10 w-full max-w-[22rem] rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(26,29,33,0.2)] animate-rise"
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm()
        }}
      >
        <h2 id="tx-edit-accid-title" className="m-0 text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink">
          Edit Account
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div>
            <span className={labelCls}>V.No</span>
            <p className={`m-0 ${field}`}>{vno || '—'}</p>
          </div>
          <div>
            <span className={labelCls}>Type</span>
            <p className={`m-0 ${field}`}>{type || '—'}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={labelCls}>Current Accid</span>
          <p className={`m-0 ${field}`}>
            {current ? `${current.name} (${current.accid})` : currentAccid || '—'}
          </p>
        </div>
        <div className={`mt-3 ${open ? 'relative z-20' : ''}`}>
          <span className={labelCls}>New Account</span>
          <button
            type="button"
            disabled={saving}
            aria-expanded={open}
            onClick={() => {
              setQuery('')
              setOpen((v) => !v)
            }}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-[0.9rem] font-medium text-ink disabled:opacity-60"
          >
            <span className={`min-w-0 truncate ${selected ? 'text-ink' : 'text-muted'}`}>
              {selected ? `${selected.name} (${selected.accid})` : 'Select account…'}
            </span>
            <span className="shrink-0 text-muted">{open ? '▴' : '▾'}</span>
          </button>
          {open && !saving ? (
            <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-30 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(26,29,33,0.14)]">
              <div className="border-b border-line p-2">
                <input
                  type="search"
                  autoComplete="off"
                  value={query}
                  placeholder="Search name or Accid…"
                  className="w-full rounded-xl border border-line bg-[#fafbfc] px-3 py-2 text-[0.8rem] font-semibold text-ink outline-none focus:border-fuel"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <ul className="max-h-52 overflow-auto py-1.5">
                {filtered.map((row) => (
                  <li key={row.accid}>
                    <button
                      type="button"
                      className={`flex w-full cursor-pointer border-0 px-3 py-2 text-left text-[0.8rem] font-semibold ${
                        String(row.accid) === newAccid
                          ? 'bg-[#fff6d6] text-ink'
                          : 'bg-transparent text-ink hover:bg-[#f7f8fa]'
                      }`}
                      onClick={() => {
                        onAccidChange(String(row.accid))
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      {row.name} ({row.accid})
                    </button>
                  </li>
                ))}
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-[0.78rem] font-medium text-muted">No accounts found.</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        <label className="mt-3 block">
          <span className={labelCls}>Administrator Password</span>
          <input
            type="text"
            autoComplete="off"
            value={password}
            disabled={saving}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="box-border w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.9rem] font-medium text-ink outline-none focus:border-fuel disabled:opacity-60 [-webkit-text-security:disc]"
            placeholder="Administrator password"
          />
        </label>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !newAccid.trim() || !password.trim()}
            className="cursor-pointer rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.85rem] font-bold text-ink disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-2.12-2.12L5.88 17.88 4 20ZM14.5 6.5l3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DeleteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M10 7V5h4v2M8 7v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Th({ children, className = 'text-left' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-line px-2 py-3 text-[0.68rem] font-bold tracking-[0.04em] text-muted uppercase ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
  rowSpan,
}: {
  children: ReactNode
  className?: string
  rowSpan?: number
}) {
  return (
    <td
      rowSpan={rowSpan}
      className={`border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151] ${className}`}
    >
      {children}
    </td>
  )
}
