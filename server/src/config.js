import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  db: {
    server: required('DB_SERVER'),
    port: Number(process.env.DB_PORT || 1433),
    database: required('DB_DATABASE'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    options: {
      encrypt: String(process.env.DB_ENCRYPT || 'false') === 'true',
      trustServerCertificate:
        String(process.env.DB_TRUST_SERVER_CERTIFICATE || 'true') === 'true',
      enableArithAbort: true,
    },
    // Hard safety: never allow long-running or write-heavy sessions from this pool
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 10000,
    connectionTimeout: 10000,
  },
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cookieSecure: String(process.env.COOKIE_SECURE || 'false') === 'true',
  apiReadKey: required('API_READ_KEY'),
}
