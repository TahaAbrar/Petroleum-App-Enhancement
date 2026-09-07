import { Router } from 'express'
import { z } from 'zod'
import {
  addSubscription,
  getVapidPublicKey,
  isPushConfigured,
  removeSubscription,
} from './push.js'

const STAFF_ROLES = new Set(['Administrator', 'Accountant'])

const subSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
})

const unsubSchema = z.object({
  endpoint: z.string().url().max(2048),
})

export const pushRouter = Router()

pushRouter.get('/vapid-key', (_req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ ok: false, message: 'Push not configured' })
  }
  return res.json({ ok: true, publicKey: getVapidPublicKey() })
})

pushRouter.post('/subscribe', (req, res) => {
  if (!STAFF_ROLES.has(req.user?.role)) {
    return res.status(403).json({ ok: false, message: 'Forbidden for this role' })
  }
  if (!isPushConfigured()) {
    return res.status(503).json({ ok: false, message: 'Push not configured' })
  }
  const parsed = subSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: parsed.error.issues[0]?.message || 'Invalid subscription',
    })
  }
  addSubscription({
    endpoint: parsed.data.endpoint,
    keys: parsed.data.keys,
    userId: String(req.user.id),
    role: req.user.role,
  })
  return res.json({ ok: true })
})

pushRouter.post('/unsubscribe', (req, res) => {
  const parsed = unsubSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid endpoint' })
  }
  removeSubscription(parsed.data.endpoint)
  return res.json({ ok: true })
})
