import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from '../toast'
import {
  CUSTOMERS,
  formatFilterDate,
  formatPkr,
  type Customer,
  type CustomerStatus,
  type CustomerType,
} from './customers'
import { CustomerMark } from './icons'
import { panel } from './styles'

const PAGE_SIZE = 10

const filterBox =
  'flex h-10 w-full min-w-0 items-center gap-1.5 rounded-xl border border-line bg-white px-2 text-[0.72rem] font-semibold text-ink shadow-[0_2px_8px_rgba(26,29,33,0.04)] focus-within:border-fuel focus-within:shadow-[0_0_0_3px_rgba(245,197,24,0.18)] sm:h-11 sm:gap-2 sm:px-3 sm:text-[0.82rem] lg:w-[11.5rem]'

type Props = {
  searchQuery?: string
}

export function CustomersPage({ searchQuery = '' }: Props) {
  const [rows, setRows] = useState<Customer[]>(CUSTOMERS)
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<CustomerStatus | ''>('')
  const [type, setType] = useState<CustomerType | ''>('')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows.filter((c) => {
      if (date && c.createdAt < date) return false
      if (status && c.status !== status) return false
      if (type && c.type !== type) return false
      if (!q) return true
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    })
  }, [rows, date, status, type, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : start + 1
  const showingTo = Math.min(start + PAGE_SIZE, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, date, status, type])

  function handleDelete(customer: Customer) {
    setRows((prev) => prev.filter((c) => c.id !== customer.id))
    if (viewing?.id === customer.id) setViewing(null)
    toast.success(`${customer.name} removed`)
  }

  return (
    <>
      <section className={`${panel} rounded-3xl p-4 lg:p-5`} aria-label="Customers">
        <div className="mb-4 flex flex-col gap-3.5 lg:mb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.5rem]">
              Customers
            </h1>
            <p className="mt-1 mb-0 text-[0.82rem] font-medium text-muted">
              Manage your all customers.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
            <DateFilter value={date} onChange={setDate} />
            <SelectFilter
              icon="status"
              value={status}
              onChange={(v) => setStatus(v as CustomerStatus | '')}
              options={[
                { value: '', label: 'Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
            <SelectFilter
              icon="type"
              value={type}
              onChange={(v) => setType(v as CustomerType | '')}
              options={[
                { value: '', label: 'Type' },
                { value: 'Retail', label: 'Retail' },
                { value: 'Wholesale', label: 'Wholesale' },
                { value: 'Transport', label: 'Transport' },
                { value: 'Corporate', label: 'Corporate' },
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="my-10 text-center text-sm font-semibold text-muted">No customers found.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
              {pageRows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-line bg-[#fafbfc] p-3.5 shadow-[0_4px_14px_rgba(26,29,33,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(26,29,33,0.1)] ring-1 ring-black/5">
                      <CustomerMark />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-[0.92rem] font-extrabold text-ink">{row.name}</p>
                          <p className="mt-0.5 mb-0 text-[0.72rem] font-semibold text-muted">{row.id}</p>
                        </div>
                        <ActionButtons
                          onView={() => setViewing(row)}
                          onDelete={() => handleDelete(row)}
                        />
                      </div>
                      <p className="mt-2 mb-0 text-[0.78rem] font-medium text-[#4b5563]">{row.phone}</p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <p
                          className={`m-0 text-[0.82rem] font-extrabold ${
                            row.currentBalance < 0 ? 'text-debit' : 'text-credit'
                          }`}
                        >
                          {formatPkr(row.currentBalance)}
                        </p>
                        <StatusPill status={row.status} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="-mx-1 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr>
                    {[
                      'Customer ID',
                      'Customer Name',
                      'Phone',
                      'Email',
                      'Current Balance',
                      'Opening Balance',
                      'Status',
                      'Action',
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fcfcfd]">
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {row.id}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-semibold whitespace-nowrap text-ink">
                        {row.name}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {row.phone}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {row.email}
                      </td>
                      <td
                        className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-bold whitespace-nowrap ${
                          row.currentBalance < 0 ? 'text-debit' : 'text-credit'
                        }`}
                      >
                        {formatPkr(row.currentBalance)}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {formatPkr(row.openingBalance)}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 whitespace-nowrap">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 whitespace-nowrap">
                        <ActionButtons
                          onView={() => setViewing(row)}
                          onDelete={() => handleDelete(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3 border-t border-line pt-4 sm:flex-row sm:justify-between">
              <p className="m-0 text-[0.78rem] font-medium text-muted">
                Showing {showingFrom} to {showingTo} of {filtered.length} customers
              </p>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </section>

      {viewing && (
        <CustomerView customer={viewing} onClose={() => setViewing(null)} onDelete={handleDelete} />
      )}
    </>
  )
}

function DateFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className={`${filterBox} relative cursor-pointer`}>
      <CalendarIcon />
      <span className={`min-w-0 flex-1 truncate ${value ? 'text-ink' : 'text-muted'}`}>
        {value ? formatFilterDate(value) : 'Date'}
      </span>
      {value ? (
        <button
          type="button"
          className="relative z-10 grid size-5 place-items-center rounded-full border-0 bg-[#f3f4f6] text-muted hover:text-ink"
          aria-label="Clear date"
          onClick={(e) => {
            e.preventDefault()
            onChange('')
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <ChevronIcon />
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Filter by date"
      />
    </label>
  )
}

function SelectFilter({
  icon,
  value,
  onChange,
  options,
}: {
  icon: 'status' | 'type'
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className={`${filterBox} relative`}>
      {icon === 'status' ? <StatusIcon /> : <TypeIcon />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pr-1 outline-none ${
          value ? 'text-ink' : 'text-muted'
        }`}
        aria-label={icon === 'status' ? 'Filter by status' : 'Filter by type'}
      >
        {options.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronIcon />
    </label>
  )
}

function StatusPill({ status }: { status: CustomerStatus }) {
  const active = status === 'Active'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
        active ? 'bg-credit-bg text-credit' : 'bg-[#f3f4f6] text-muted'
      }`}
    >
      {status}
    </span>
  )
}

function ActionButtons({ onView, onDelete }: { onView: () => void; onDelete: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={onView}
        className="grid size-8 place-items-center rounded-lg border-0 bg-[#f4f5f7] text-[#6b7280] hover:bg-[#eceef2] hover:text-ink"
        aria-label="View customer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2.8 12S6.5 6.5 12 6.5 21.2 12 21.2 12 17.5 17.5 12 17.5 2.8 12 2.8 12Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="grid size-8 place-items-center rounded-lg border-0 bg-debit-bg text-debit hover:brightness-95"
        aria-label="Delete customer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 7h14M10 7V5h4v2M8 7v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center gap-1">
      <PageNav
        label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <path d="M14 6 8 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </PageNav>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`grid size-8 place-items-center rounded-lg border-0 text-[0.8rem] font-bold ${
            n === page
              ? 'bg-fuel text-ink shadow-[0_4px_10px_rgba(245,197,24,0.35)]'
              : 'bg-transparent text-[#4b5563] hover:bg-[#f4f5f7]'
          }`}
        >
          {n}
        </button>
      ))}
      <PageNav
        label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </PageNav>
    </div>
  )
}

function PageNav({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border-0 bg-transparent text-[#4b5563] hover:bg-[#f4f5f7] disabled:cursor-not-allowed disabled:opacity-35"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {children}
      </svg>
    </button>
  )
}

function CustomerView({
  customer,
  onClose,
  onDelete,
}: {
  customer: Customer
  onClose: () => void
  onDelete: (c: Customer) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-ink/35"
        aria-label="Close customer details"
        onClick={onClose}
      />
      <article className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 bg-white p-5 shadow-auth">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-fuel text-ink">
              <CustomerMark />
            </div>
            <div>
              <h2 className="m-0 text-lg font-extrabold tracking-[-0.02em]">{customer.name}</h2>
              <p className="mt-0.5 mb-0 text-[0.78rem] font-semibold text-muted">{customer.id}</p>
            </div>
          </div>
          <StatusPill status={customer.status} />
        </div>
        <dl className="m-0 grid grid-cols-1 gap-3 text-sm">
          <ViewRow label="Phone" value={customer.phone} />
          <ViewRow label="Email" value={customer.email} />
          <ViewRow label="Type" value={customer.type} />
          <ViewRow label="Joined" value={formatFilterDate(customer.createdAt)} />
          <ViewRow
            label="Current Balance"
            value={formatPkr(customer.currentBalance)}
            tone={customer.currentBalance < 0 ? 'debit' : 'credit'}
          />
          <ViewRow label="Opening Balance" value={formatPkr(customer.openingBalance)} />
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onDelete(customer)}
            className="rounded-xl border-0 bg-debit-bg px-3.5 py-2 text-[0.82rem] font-bold text-debit hover:brightness-95"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-0 bg-fuel px-3.5 py-2 text-[0.82rem] font-bold text-ink shadow-[0_6px_14px_rgba(245,197,24,0.3)]"
          >
            Close
          </button>
        </div>
      </article>
    </div>
  )
}

function ViewRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'credit' | 'debit'
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f2f4] pb-2.5 last:border-b-0 last:pb-0">
      <dt className="m-0 font-semibold text-muted">{label}</dt>
      <dd
        className={`m-0 font-bold ${
          tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function StatusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 12.2 11 15l4.8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TypeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true">
      <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
