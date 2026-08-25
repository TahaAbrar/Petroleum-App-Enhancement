import { z } from 'zod'
import { findUserByUsername } from './db.js'
import {
  clearLoginAttempts,
  dashboardPathForRole,
  getLockStatus,
  normalizeRole,
  registerFailedLogin,
  safeEqualPassword,
  signToken,
} from './security.js'
import { env } from './config.js'

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .max(100)
    .regex(/^[a-zA-Z0-9._@\- ]+$/, 'Invalid username characters'),
  password: z.string().min(1, 'Password is required').max(128),
})

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

export async function loginHandler(req, res) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: parsed.error.issues[0]?.message || 'Invalid input',
    })
  }

  const { username, password } = parsed.data
  const ip = clientIp(req)

  const lock = getLockStatus(ip, username)
  if (lock.locked) {
    const mins = Math.ceil(lock.remainingMs / 60000)
    return res.status(429).json({
      ok: false,
      message: `Too many failed attempts. Try again in ~${mins} minute(s).`,
      locked: true,
    })
  }

  let user
  try {
    user = await findUserByUsername(username)
  } catch (err) {
    console.error('[auth] db error', err.message)
    return res.status(503).json({
      ok: false,
      message: 'Authentication service temporarily unavailable',
    })
  }

  // Always run password compare path to reduce user-enumeration timing gaps
  const storedPass = user?.UserPass ?? cryptoRandomDummy()
  const passwordOk = safeEqualPassword(password, storedPass)
  const userOk = Boolean(user)

  if (!userOk || !passwordOk) {
    const fail = registerFailedLogin(ip, username)
    return res.status(401).json({
      ok: false,
      message: 'Invalid username or password',
      attemptsRemaining: Math.max(0, env.loginMaxAttempts - fail.fails),
      locked: fail.locked,
    })
  }

  const status = String(user.Status || '').trim().toLowerCase()
  if (status && status !== 'active' && status !== 'null' && status !== '') {
    // Only block if Status is explicitly inactive-like
    if (['inactive', 'disabled', 'blocked', 'lock', 'locked'].includes(status)) {
      return res.status(403).json({
        ok: false,
        message: 'Account is disabled. Contact administrator.',
      })
    }
  }

  clearLoginAttempts(ip, username)

  const role = normalizeRole(user.Type)
  const redirectTo = dashboardPathForRole(role)
  const token = signToken({
    sub: String(user.UserId),
    username: user.UserName,
    role,
  })

  res.cookie('fl_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  })

  return res.json({
    ok: true,
    user: {
      id: user.UserId,
      username: user.UserName,
      role,
    },
    redirectTo,
    token,
  })
}

function cryptoRandomDummy() {
  // Non-matching dummy so compare always runs when user missing
  return `__none__${Math.random()}`
}

export function meHandler(req, res) {
  return res.json({ ok: true, user: req.user })
}

export function logoutHandler(_req, res) {
  res.clearCookie('fl_token', { path: '/' })
  return res.json({ ok: true })
}
