/** Simple global toast API — use anywhere: `import { toast } from '../toast'` */

export type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  kind: ToastKind
  message: string
  duration: number
}

type Listener = () => void

const DEFAULT_MS = 5000
let items: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((fn) => fn())
}

function nextId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getToasts(): ToastItem[] {
  return items
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function dismissToast(id: string) {
  const next = items.filter((t) => t.id !== id)
  if (next.length === items.length) return
  items = next
  emit()
}

function push(kind: ToastKind, message: string, duration = DEFAULT_MS): string {
  const id = nextId()
  items = [...items, { id, kind, message, duration }]
  emit()
  return id
}

/** Call from any page/component — toaster must be mounted once in App. */
export const toast = {
  show(message: string, kind: ToastKind = 'info', duration = DEFAULT_MS) {
    return push(kind, message, duration)
  },
  success(message: string, duration = DEFAULT_MS) {
    return push('success', message, duration)
  },
  error(message: string, duration = DEFAULT_MS) {
    return push('error', message, duration)
  },
  info(message: string, duration = DEFAULT_MS) {
    return push('info', message, duration)
  },
  dismiss: dismissToast,
}
