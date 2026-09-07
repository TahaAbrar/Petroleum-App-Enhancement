import { useEffect, useRef } from 'react'
import { clearPageCache } from './pageCache'

export const DATA_CHANGED_EVENT = 'fuelledger:data-changed'
export const LIVE_TX_POLL_MS = 4000

/** Call after any write (Cash Book save, delete, …) so open lists refresh immediately. */
export function notifyDataChanged() {
  clearPageCache()
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
}

/** Silent refresh while a list page is open: poll, tab focus, and in-app writes. */
export function useLiveRefresh(onRefresh: () => void, intervalMs = LIVE_TX_POLL_MS) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const run = () => {
      if (!document.hidden) onRefreshRef.current()
    }
    const id = window.setInterval(run, intervalMs)
    const onVis = () => {
      if (!document.hidden) onRefreshRef.current()
    }
    const onData = () => onRefreshRef.current()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener(DATA_CHANGED_EVENT, onData)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener(DATA_CHANGED_EVENT, onData)
    }
  }, [intervalMs])
}
