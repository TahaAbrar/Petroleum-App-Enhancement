import type { ReactNode, Ref } from 'react'
import { formatTxDate, ledgerAmount, type TransactionRow } from './transactions'
import { panel } from './styles'

export function MobileVoucherCard({
  group,
  cardRef,
  canView,
  canDelete,
  onView,
  onDelete,
}: {
  group: { key: string; rows: TransactionRow[] }
  cardRef?: Ref<HTMLLIElement>
  canView: boolean
  canDelete: boolean
  onView: (row: TransactionRow) => void
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
            <div className="mt-2 grid grid-cols-2 gap-2 text-[0.78rem]">
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
            </div>
            {canDelete ? (
              <div className="mt-2 flex justify-end">
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
        <Th>Type</Th>
        <Th className="text-right">Debit</Th>
        <Th className="text-right">Credit</Th>
        {canDelete ? <Th className="text-center">Action</Th> : null}
      </tr>
    </thead>
  )
}

export function TxTableColgroup({ canDelete }: { canDelete: boolean }) {
  return (
    <colgroup>
      <col className="w-[11%]" />
      <col className="w-[8%]" />
      <col className={canDelete ? 'w-[26%]' : 'w-[30%]'} />
      <col className="w-[12%]" />
      <col className="w-[16%]" />
      <col className="w-[16%]" />
      {canDelete ? <col className="w-[11%]" /> : null}
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
  onDelete,
  rowRef,
}: {
  row: TransactionRow
  legIndex: number
  groupSize: number
  canView: boolean
  canDelete: boolean
  onView: (row: TransactionRow) => void
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
      <Td>{row.paymentType || '—'}</Td>
      <Td className={`text-right font-bold ${row.debit > 0 ? 'text-debit' : ''}`}>
        {ledgerAmount(row.debit)}
      </Td>
      <Td className={`text-right font-bold ${row.credit > 0 ? 'text-credit' : ''}`}>
        {ledgerAmount(row.credit)}
      </Td>
      {canDelete ? (
        <Td className="text-center">
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-debit-bg text-debit hover:brightness-95"
            aria-label="Delete transaction"
          >
            <DeleteIcon />
          </button>
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
