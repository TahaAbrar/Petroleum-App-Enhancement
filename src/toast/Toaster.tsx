import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type ToastItem,
  type ToastKind,
} from './toast'

const kindStyles: Record<
  ToastKind,
  { wrap: string; icon: string; bar: string; label: string }
> = {
  success: {
    wrap: 'border-fuel/35 bg-[#FFFCEB] text-ink',
    icon: 'bg-fuel text-ink',
    bar: 'bg-fuel',
    label: 'Success',
  },
  error: {
    wrap: 'border-debit/25 bg-debit-bg text-debit',
    icon: 'bg-debit text-white',
    bar: 'bg-debit',
    label: 'Error',
  },
  info: {
    wrap: 'border-line bg-white text-ink',
    icon: 'bg-[#eef1f5] text-navy',
    bar: 'bg-navy',
    label: 'Notice',
  },
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12.5 9.5 17 19 7.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'error') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v5.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1" fill="currentColor" />
    </svg>
  )
}

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = useState(false)
  const style = kindStyles[item.kind]

  useEffect(() => {
    if (leaving) return
    const hideAt = window.setTimeout(() => setLeaving(true), item.duration)
    return () => window.clearTimeout(hideAt)
  }, [item.duration, item.id, leaving])

  useEffect(() => {
    if (!leaving) return
    const removeAt = window.setTimeout(() => dismissToast(item.id), 220)
    return () => window.clearTimeout(removeAt)
  }, [leaving, item.id])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative flex w-[min(22rem,calc(100vw-1.5rem))] items-start gap-3 overflow-hidden rounded-xl border px-3.5 py-3 shadow-[0_12px_32px_rgba(26,29,33,0.12)] ${style.wrap} ${
        leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${style.icon}`}
        aria-hidden
      >
        <ToastIcon kind={item.kind} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="m-0 text-[0.68rem] font-bold tracking-[0.04em] uppercase opacity-70">
          {style.label}
        </p>
        <p className="m-0 mt-0.5 text-[0.875rem] font-semibold leading-snug text-inherit">
          {item.message}
        </p>
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-0 bg-transparent text-current opacity-55 transition hover:bg-black/5 hover:opacity-100"
        onClick={() => setLeaving(true)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left ${style.bar} animate-toast-progress`}
        style={{ animationDuration: `${item.duration}ms` }}
        aria-hidden
      />
    </div>
  )
}

/** Mount once near app root so `toast.*` works on every page. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col items-end gap-2.5"
      aria-label="Notifications"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
