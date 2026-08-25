import { verifyToken } from './security.js'

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null
    const cookieToken = req.cookies?.fl_token
    const token = bearer || cookieToken

    if (!token) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' })
    }

    const payload = verifyToken(token)
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    }
    return next()
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid or expired session' })
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'Forbidden for this role' })
    }
    return next()
  }
}
