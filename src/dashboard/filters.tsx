import { useEffect, useRef, useState } from 'react'
import { formatFilterDate } from './customers'

const boxBase =
  'relative flex items-center gap-1.5 border bg-white font-semibold text-ink'

const variants = {
  box: `${boxBase} h-10 w-full min-w-0 rounded-xl border-line px-2 text-[0.72rem] shadow-[0_2px_8px_rgba(26,29,33,0.04)] focus-within:border-fuel sm:h-11 sm:gap-2 sm:px-3 sm:text-[0.82rem] lg:w-[11.5rem]`,
  pill: `${boxBase} h-9 w-[9.75rem] rounded-full border-line px-3 text-[0.72rem]`,
} as const

export type FilterVariant = keyof typeof variants

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  variant = 'box',
  grouped = false,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  variant?: FilterVariant
  grouped?: boolean
}) {
  const pills = (
    <>
      <DatePill label="From" value={from} onChange={onFromChange} variant={variant} />
      {grouped ? (
        <span className="hidden text-[0.75rem] font-semibold text-muted sm:inline" aria-hidden="true">
          –
        </span>
      ) : null}
      <DatePill label="To" value={to} onChange={onToChange} variant={variant} />
    </>
  )
  if (!grouped) return pills
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Filter by date range">
      {pills}
    </div>
  )
}

export function applyDateRange(
  which: 'from' | 'to',
  next: string,
  from: string,
  to: string,
) {
  if (which === 'from') {
    if (next && to && next > to) return { from: to, to: next }
    return { from: next, to }
  }
  if (next && from && next < from) return { from: next, to: from }
  return { from, to: next }
}

function DatePill({
  label,
  value,
  onChange,
  variant,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  variant: FilterVariant
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    const el = inputRef.current
    if (!el) return
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker()
        return
      }
    } catch {
      /* fall through */
    }
    el.focus()
    el.click()
  }

  return (
    <div className={variants[variant]}>
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit] border-0 bg-transparent"
        aria-label={`${label} date`}
        onClick={openPicker}
      />
      <CalendarIcon />
      <span className={`relative z-0 min-w-0 flex-1 truncate ${value ? 'text-ink' : 'text-muted'}`}>
        {value ? formatFilterDate(value) : label}
      </span>
      {value ? (
        <button
          type="button"
          className="relative z-[2] grid size-5 shrink-0 place-items-center rounded-full border-0 bg-[#f3f4f6] text-muted hover:text-ink"
          aria-label={`Clear ${label.toLowerCase()} date`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
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
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

export function MenuFilter({
  icon,
  value,
  onChange,
  options,
  placeholder,
  variant = 'box',
  ariaLabel,
}: {
  icon: 'status' | 'type'
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  variant?: FilterVariant
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((opt) => opt.value === value)
  const label = value && selected ? selected.label : placeholder

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={variants[variant]}>
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit] border-0 bg-transparent"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      />
      {icon === 'status' ? <StatusIcon /> : <TypeIcon />}
      <span className={`relative z-0 min-w-0 flex-1 truncate ${value ? 'text-ink' : 'text-muted'}`}>
        {label}
      </span>
      <span className={`relative z-0 ${open ? 'rotate-180' : ''} transition-transform`}>
        <ChevronIcon />
      </span>
      {open ? (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-64 min-w-full w-max max-w-[18rem] overflow-auto rounded-2xl border border-line bg-white py-1.5 shadow-[0_12px_32px_rgba(26,29,33,0.14)]"
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li key={`${opt.value}-${opt.label}`} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full cursor-pointer border-0 px-3 py-2 text-left text-[0.8rem] font-semibold ${
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

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-0 shrink-0 text-muted" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function StatusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-0 shrink-0 text-muted" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 12.2 11 15l4.8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TypeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-0 shrink-0 text-muted" aria-hidden="true">
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
