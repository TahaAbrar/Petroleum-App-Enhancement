import { apiGet, apiPost } from './api'
import { getUserRole } from './auth'

const STAFF_ROLES = new Set(['Administrator', 'Accountant'])

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export async function enablePush(): Promise<void> {
  const role = getUserRole()
  if (!role || !STAFF_ROLES.has(role)) return
  if (!window.isSecureContext) return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const { publicKey } = await apiGet<{ ok: true; publicKey: string }>('/api/push/vapid-key')
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

  await apiPost('/api/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  })
}

export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  try {
    await apiPost('/api/push/unsubscribe', { endpoint: subscription.endpoint })
  } catch {
    /* ignore network errors on logout */
  }
  try {
    await subscription.unsubscribe()
  } catch {
    /* ignore */
  }
}
