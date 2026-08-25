import sql from 'mssql'
import { env } from './config.js'

/** Shared pool — auth uses SELECT only against UserReg. */
let poolPromise = null

export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({
      server: env.db.server,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      options: env.db.options,
      pool: env.db.pool,
      requestTimeout: env.db.requestTimeout,
      connectionTimeout: env.db.connectionTimeout,
    })
      .connect()
      .then((pool) => {
        pool.on('error', (err) => {
          console.error('[db] pool error', err.message)
          poolPromise = null
        })
        return pool
      })
  }
  return poolPromise
}

export { sql }

/**
 * Safe login lookup — parameterized SELECT only.
 * Never UPDATE / DELETE / INSERT from this API.
 */
export async function findUserByUsername(username) {
  const pool = await getPool()
  const request = pool.request()
  request.input('username', sql.NVarChar(100), username)

  const result = await request.query(`
    SELECT TOP (1)
      UserId,
      UserName,
      UserPass,
      Type,
      Status
    FROM dbo.UserReg
    WHERE UserName = @username
  `)

  return result.recordset[0] || null
}
