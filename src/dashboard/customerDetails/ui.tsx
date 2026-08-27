import type { ReactNode } from 'react'
import type { Customer, CustomerTxType } from '../customers'
import { formatPkrAmount } from '../customers'
import { panel } from '../styles'

export function PkrValue({
  value,
  amountClass = '',
  className = '',
}: {
  value: number
  amountClass?: string
  className?: string
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      <span className={amountClass}>{formatPkrAmount(value)}</span>{' '}
      <span className="font-normal text-muted">PKR</span>
    </span>
  )
}

export function StatusPill({ status }: { status: Customer['status'] }) {
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

export function TypeBadge({ type }: { type: CustomerTxType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
        type === 'Credit' ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
      }`}
    >
      {type}
    </span>
  )
}

export function BalanceCard({
  label,
  value,
  valueClass,
  iconTone,
}: {
  label: string
  value: number
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
        <p className={`mt-0.5 mb-0 text-[1.05rem] tracking-[-0.02em] ${valueClass}`}>
          <PkrValue value={value} amountClass="font-extrabold" />
        </p>
      </div>
    </article>
  )
}

export function BalanceChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
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
        className={`m-0 text-[1.05rem] ${
          tone === 'credit' ? 'text-credit' : tone === 'debit' ? 'text-debit' : 'text-ink'
        }`}
      >
        <PkrValue value={value} amountClass="font-extrabold" />
      </p>
    </div>
  )
}

export function MiniStat({
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

export function IdChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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

export function InfoIconCard({
  icon,
  iconTone,
  label,
  value,
  valueNode,
  valueTone,
  className = '',
}: {
  icon: 'user' | 'phone' | 'email' | 'pin' | 'clipboard' | 'down' | 'note' | 'calendar'
  iconTone: IconTone
  label: string
  value?: string
  valueNode?: ReactNode
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
        <div
          className={`mt-1 mb-0 text-[0.9rem] leading-snug break-words ${
            valueTone === 'credit'
              ? 'text-credit'
              : valueTone === 'debit'
                ? 'text-debit'
                : 'text-ink'
          }`}
        >
          {valueNode ?? <p className="m-0 font-bold">{value}</p>}
        </div>
      </div>
    </article>
  )
}

export function SummaryCard({
  label,
  value,
  tone,
  icon,
  isPkr,
}: {
  label: string
  value: string | number
  tone: 'credit' | 'debit' | 'blue'
  icon: 'down' | 'up' | 'doc'
  isPkr?: boolean
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
        <p className={`mt-1 mb-0 text-[0.95rem] ${color}`}>
          {isPkr && typeof value === 'number' ? (
            <PkrValue value={value} amountClass="font-extrabold" />
          ) : (
            <span className="font-extrabold">{value}</span>
          )}
        </p>
      </div>
    </article>
  )
}

export function WhenCell({ value }: { value: string }) {
  const match = value.match(/^(.+?)\s+(\d{1,2}:\d{2}\s*[AP]M)$/i)
  if (!match) {
    return <span className="block leading-snug break-words">{value}</span>
  }
  return (
    <span className="block leading-snug">
      <span className="block">{match[1]}</span>
      <span className="block text-[0.7rem] font-medium text-muted">{match[2]}</span>
    </span>
  )
}

export function PkrCell({ value }: { value: number }) {
  return <PkrValue value={value} className="block leading-tight text-[0.78rem] text-[#374151]" />
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={`border-b border-[#f1f2f4] px-2 py-3 align-top text-[0.78rem] text-[#374151] ${className}`}
    >
      {children}
    </td>
  )
}

export function BackChevron() {
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
