import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { env } from './config.js'
import { getPool } from './db.js'
import { loginHandler, logoutHandler, meHandler } from './authRoutes.js'
import { requireAuth, requireReadKey, requireRoles } from './middleware.js'
import { customerRouter } from './customerRoutes.js'

const app = express()

app.set('trust proxy', 1)
app.use(helmet())
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigin.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many login requests from this IP. Please wait and try again.',
  },
})

app.get('/api/health', async (_req, res) => {
  try {
    await getPool()
    res.json({ ok: true, db: 'up', service: 'fuelledger-api' })
  } catch {
    res.status(503).json({ ok: false, db: 'down' })
  }
})

app.post('/api/auth/login', loginLimiter, loginHandler)
app.post('/api/auth/logout', logoutHandler)
app.get('/api/auth/me', requireAuth, meHandler)

const customerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many customer requests. Please wait and try again.',
  },
})

app.use(
  '/api/customers',
  customerLimiter,
  requireReadKey,
  requireAuth,
  requireRoles('Administrator', 'Accountant'),
  customerRouter,
)

app.all(/^\/api\/.*/, (_req, res) => {
  res.status(404).json({ ok: false, message: 'Not found' })
})

app.use((err, _req, res, _next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ ok: false, message: 'CORS blocked' })
  }
  console.error('[api]', err)
  return res.status(500).json({ ok: false, message: 'Server error' })
})

async function start() {
  await getPool()
  app.listen(env.port, () => {
    console.log(`[fuelledger-api] listening on :${env.port} (SELECT-only auth + customers)`)
  })
}

start().catch((err) => {
  console.error('[fuelledger-api] failed to start', err.message)
  process.exit(1)
})
