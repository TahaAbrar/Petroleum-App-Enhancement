import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  formatFilterDate,
  formatPkr,
  getCustomerDetail,
  type Customer,
  type CustomerTxType,
} from './customers'
import { CustomerMark } from './icons'
import { panel } from './styles'

type Props = {
  customer: Customer
  onBack: () => void
  txPath: string
}

type HistoryTab = 'all' | 'credit' | 'debit'

export function CustomerDetailsPage({ customer, onBack, txPath }: Props) {
  const navigate = useNavigate()
  const detail = useMemo(() => getCustomerDetail(customer), [customer])
  const [tab, setTab] = useState<HistoryTab>('all')

  const rows = useMemo(() => {
    if (tab === 'credit') return detail.transactions.filter((t) => t.type === 'Credit')
    if (tab === 'debit') return detail.transactions.filter((t) => t.type === 'Debit')
    return detail.transactions
  }, [detail.transactions, tab])

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      {/* Mobile header */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent px-0 py-1 text-[0.9rem] font-bold text-[#c99700]"
        >
          <BackChevron />
          Back
        </button>
        <h1 className="m-0 flex-1 text-center text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink pr-12">
          Customer Details
        </h1>
      </div>

      {/* Desktop header */}
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <p className="m-0 text-[0.82rem] font-medium text-muted">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 font-medium text-muted hover:text-ink"
          >
            Customers
          </button>
          <span className="mx-1.5 text-[#c4c9d2]">›</span>
          <span className="font-semibold text-ink">Customer Details</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
        >
          <BackChevron />
          Back to Customers
        </button>
      </div>

      {/* Profile + balances */}
      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Customer profile">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5 lg:items-center">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-fuel-soft text-[#c99700] lg:size-[4.25rem]">
              <CustomerMark />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-[1.15rem] font-extrabold tracking-[-0.02em] text-ink lg:text-[1.35rem]">
                  {detail.name}
                </h2>
                <StatusPill status={detail.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <IdChip label="Customer ID" value={detail.id} accent />
                <IdChip label="CNIC" value={detail.cnic} />
              </div>
            </div>
          </div>

          <div className="hidden gap-3 lg:flex">
            <BalanceChip
              label="Opening Balance"
              value={formatPkr(detail.openingBalance)}
              icon="wallet"
              tone="muted"
            />
            <BalanceChip
              label="Current Balance"
              value={formatPkr(detail.currentBalance)}
              icon="wallet"
              tone={detail.currentBalance < 0 ? 'debit' : 'credit'}
            />
          </div>
        </div>
      </section>

      {/* Mobile balance cards */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        <BalanceCard
          label="Opening Balance"
          value={formatPkr(detail.openingBalance)}
          valueClass="text-ink"
          iconTone="fuel"
        />
        <BalanceCard
          label="Current Balance"
          value={formatPkr(detail.currentBalance)}
          valueClass={detail.currentBalance < 0 ? 'text-debit' : 'text-credit'}
          iconTone="amber"
        />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Total Credit" value={compactPkr(detail.totalCredit)} tone="credit" />
          <MiniStat label="Total Debit" value={compactPkr(detail.totalDebit)} tone="debit" />
          <MiniStat label="Transactions" value={String(detail.transactionCount)} tone="blue" />
        </div>
      </div>

      {/* Customer information + summary — icon cards */}
      <div className="grid gap-3.5 lg:grid-cols-[1fr_250px] lg:gap-4">
        <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Customer information">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">
            Customer Information
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <InfoIconCard icon="user" iconTone="fuel" label="Customer Name" value={detail.name} />
            <InfoIconCard icon="phone" iconTone="sky" label="Phone" value={detail.phone} />
            <InfoIconCard icon="email" iconTone="credit" label="Email" value={detail.email} />
            <InfoIconCard
              icon="pin"
              iconTone="amber"
              label="Address"
              value={detail.address}
              className="sm:col-span-2 xl:col-span-2"
            />
            <InfoIconCard
              icon="clipboard"
              iconTone="orange"
              label="Opening Balance"
              value={formatPkr(detail.openingBalance)}
            />
            <InfoIconCard
              icon="down"
              iconTone="credit"
              label="Current Balance"
              value={formatPkr(detail.currentBalance)}
              valueTone={detail.currentBalance < 0 ? 'debit' : 'credit'}
            />
            <InfoIconCard
              icon="note"
              iconTone="fuel"
              label="Notes"
              value={detail.notes}
              className="sm:col-span-2 xl:col-span-2"
            />
            <InfoIconCard
              icon="calendar"
              iconTone="sky"
              label="Account Since"
              value={formatFilterDate(detail.createdAt)}
            />
          </div>
        </section>

        <aside className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Summary">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">Summary</h3>
          <div className="flex flex-col gap-2.5">
            <SummaryCard
              label="Total Credit"
              value={formatPkr(detail.totalCredit)}
              tone="credit"
              icon="down"
            />
            <SummaryCard
              label="Total Debit"
              value={formatPkr(detail.totalDebit)}
              tone="debit"
              icon="up"
            />
            <SummaryCard
              label="Transactions"
              value={String(detail.transactionCount)}
              tone="blue"
              icon="doc"
            />
          </div>
        </aside>
      </div>

      {/* Transaction history */}
      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Transaction history">
        <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-line pb-0">
          {(
            [
              ['all', 'Transaction History'],
              ['credit', 'Credit History'],
              ['debit', 'Debit History'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`cursor-pointer border-0 border-b-2 bg-transparent px-3 py-2.5 text-[0.8rem] font-bold transition ${
                tab === id
                  ? 'border-fuel text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile tx list */}
        <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 border-b border-[#ECEEF2] py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="m-0 text-[0.84rem] font-extrabold text-ink">{row.id}</p>
                <p className="mt-0.5 mb-0 truncate text-[0.72rem] font-medium text-muted">
                  {row.when} · {row.product}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <TypeBadge type={row.type} />
                <p
                  className={`mt-1 mb-0 text-[0.8rem] font-extrabold ${
                    row.type === 'Credit' ? 'text-credit' : 'text-debit'
                  }`}
                >
                  {row.type === 'Credit' ? '+' : '-'}
                  {formatPkr(row.amount)}
                </p>
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-8 text-center text-sm font-medium text-muted">No records found.</li>
          )}
        </ul>

        {/* Desktop table */}
        <div className="-mx-1 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr>
                {[
                  'ID',
                  'Date & Time',
                  'Type',
                  'Product / Service',
                  'Quantity',
                  'Rate',
                  'Amount',
                  'Balance',
                  'Created By',
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
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#fcfcfd]">
                  <Td className="font-semibold text-ink">{row.id}</Td>
                  <Td>{row.when}</Td>
                  <Td>
                    <TypeBadge type={row.type} />
                  </Td>
                  <Td>{row.product}</Td>
                  <Td>{row.quantity}</Td>
                  <Td>{row.rate}</Td>
                  <Td className={row.type === 'Credit' ? 'font-bold text-credit' : 'font-bold text-debit'}>
                    {formatPkr(row.amount)}
                  </Td>
                  <Td>{formatPkr(row.balance)}</Td>
                  <Td>{row.by}</Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm font-medium text-muted">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => navigate(txPath)}
            className="cursor-pointer border-0 bg-transparent text-[0.85rem] font-bold text-[#c99700] hover:text-ink"
          >
            View All Transactions
          </button>
        </div>
      </section>
    </div>
  )
}

function compactPkr(value: number) {
  return Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function StatusPill({ status }: { status: Customer['status'] }) {
  const active = status === 'Active'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
        active ? 'bg-credit-bg text-credit' : 'bg-[#f3f4f6] text-muted'
      }`}
    >
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: CustomerTxType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
        type === 'Credit' ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
      }`}
    >
      {type}
    </span>
  )
}

function BalanceCard({
  label,
  value,
  valueClass,
  iconTone,
}: {
  label: string
  value: string
  valueClass: string
  iconTone: 'fuel' | 'amber'
}) {
  return (
    <article className={`${panel} flex items-center gap-3 rounded-2xl p-3.5`}>
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          iconTone === 'fuel' ? 'bg-fuel-soft text-[#c99700]' : 'bg-[#fff1e0] text-orange'
        }`}
      >
        <WalletIcon />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.72rem] font-semibold text-muted">{label}</p>
        <p className={`mt-0.5 mb-0 text-[1.05rem] font-extrabold tracking-[-0.02em] ${valueClass}`}>
          {value}
        </p>
      </div>
    </article>
  )
}

function BalanceChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  icon: string
  tone: 'muted' | 'credit' | 'debit'
}) {
  return (
    <div className="min-w-[11rem] rounded-2xl border border-line bg-[#fafbfc] px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-[#c99700]">
        <WalletIcon />
        <span className="text-[0.72rem] font-semibold text-muted">{label}</span>
      </div>
      <p
        className={`m-0 text-[1.05rem] font-extrabold ${
          tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'credit' | 'debit' | 'blue'
}) {
  const color =
    tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-[#2563eb]'
  return (
    <article className="rounded-2xl border border-line bg-white px-2.5 py-3 text-center shadow-card">
      <p className="m-0 text-[0.65rem] font-semibold text-muted">{label}</p>
      <p className={`mt-1 mb-0 text-[0.95rem] font-extrabold ${color}`}>{value}</p>
    </article>
  )
}

function IdChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-[#f4f5f7] px-2.5 py-1.5 text-[0.72rem]">
      <span className="font-semibold text-muted">{label}</span>
      <span className={`font-extrabold ${accent ? 'text-[#c99700]' : 'text-ink'}`}>{value}</span>
    </span>
  )
}

type IconTone = 'fuel' | 'sky' | 'credit' | 'amber' | 'orange' | 'debit'

function iconToneClass(tone: IconTone) {
  switch (tone) {
    case 'sky':
      return 'bg-[#e8f0fe] text-[#2563eb]'
    case 'credit':
      return 'bg-credit-bg text-credit'
    case 'amber':
      return 'bg-fuel-soft text-[#c99700]'
    case 'orange':
      return 'bg-[#fff1e0] text-orange'
    case 'debit':
      return 'bg-debit-bg text-debit'
    default:
      return 'bg-fuel-soft text-[#c99700]'
  }
}

function InfoIconCard({
  icon,
  iconTone,
  label,
  value,
  valueTone,
  className = '',
}: {
  icon: 'user' | 'phone' | 'email' | 'pin' | 'clipboard' | 'down' | 'note' | 'calendar'
  iconTone: IconTone
  label: string
  value: string
  valueTone?: 'credit' | 'debit'
  className?: string
}) {
  return (
    <article
      className={`flex items-start gap-3 rounded-2xl border border-line bg-[#fafbfc] p-3.5 ${className}`}
    >
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconToneClass(iconTone)}`}
      >
        <FieldIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.7rem] font-semibold text-muted">{label}</p>
        <p
          className={`mt-1 mb-0 text-[0.9rem] font-bold leading-snug break-words ${
            valueTone === 'credit'
              ? 'text-credit'
              : valueTone === 'debit'
                ? 'text-debit'
                : 'text-ink'
          }`}
        >
          {value}
        </p>
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone: 'credit' | 'debit' | 'blue'
  icon: 'down' | 'up' | 'doc'
}) {
  const color =
    tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-[#2563eb]'
  const bg =
    tone === 'credit' ? 'bg-credit-bg' : tone === 'debit' ? 'bg-debit-bg' : 'bg-[#e8f0fe]'
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-line bg-[#fafbfc] p-3.5">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${bg} ${color}`}>
        <SideIcon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[0.7rem] font-semibold text-muted">{label}</p>
        <p className={`mt-1 mb-0 text-[0.95rem] font-extrabold ${color}`}>{value}</p>
      </div>
    </article>
  )
}

function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151] ${className}`}
    >
      {children}
    </td>
  )
}

function BackChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9.5 6.5 5h11L20 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function FieldIcon({
  name,
}: {
  name: 'user' | 'phone' | 'email' | 'pin' | 'clipboard' | 'down' | 'note' | 'calendar'
}) {
  const p = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'user') {
    return (
      <svg {...p}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 19.5c1.5-3.2 3.8-4.8 7-4.8s5.5 1.6 7 4.8" />
      </svg>
    )
  }
  if (name === 'phone') {
    return (
      <svg {...p}>
        <path d="M7 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3A2 2 0 0 1 18.5 19 14.5 14.5 0 0 1 5 5.5 2 2 0 0 1 7 3.5Z" />
      </svg>
    )
  }
  if (name === 'email') {
    return (
      <svg {...p}>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="m4.5 7.5 7.5 6 7.5-6" />
      </svg>
    )
  }
  if (name === 'pin') {
    return (
      <svg {...p}>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2" />
      </svg>
    )
  }
  if (name === 'clipboard') {
    return (
      <svg {...p}>
        <rect x="6" y="5" width="12" height="15" rx="2" />
        <path d="M9 5.5V4h6v1.5M9 11h6M9 15h4" />
      </svg>
    )
  }
  if (name === 'down') {
    return (
      <svg {...p}>
        <path d="M12 5v14M7 14l5 5 5-5" />
      </svg>
    )
  }
  if (name === 'note') {
    return (
      <svg {...p}>
        <path d="M8 4h7l3 3v13H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M15 4v3h3M9 12h6M9 16h4" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
    </svg>
  )
}

function SideIcon({ name }: { name: 'down' | 'up' | 'doc' }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'down') {
    return (
      <svg {...p}>
        <path d="M12 5v14M7 14l5 5 5-5" />
      </svg>
    )
  }
  if (name === 'up') {
    return (
      <svg {...p}>
        <path d="M12 19V5M7 10l5-5 5 5" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </svg>
  )
}

