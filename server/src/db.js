import sql from 'mssql'
import { env } from './config.js'

/** Shared pool — auth uses SELECT only against UserReg. */
let poolPromise = null

export function getPool() {
  if (!poolPromise) {
    const options = { ...env.db.options }
    if (env.db.instanceName) {
      options.instanceName = env.db.instanceName
    }

    const config = {
      server: env.db.server,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      options,
      pool: env.db.pool,
      requestTimeout: env.db.requestTimeout,
      connectionTimeout: env.db.connectionTimeout,
    }
    // When using a named instance, omit port so SQL Browser resolves the dynamic TCP port
    if (!env.db.instanceName) {
      config.port = env.db.port
    }

    const target = env.db.instanceName
      ? `${env.db.server}\\${env.db.instanceName}/${env.db.database}`
      : `${env.db.server}:${env.db.port}/${env.db.database}`

    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        pool.on('error', (err) => {
          console.error('[db] pool error', err.message)
          poolPromise = null
        })
        console.log(`[db] connected ${target}`)
        return pool
      })
      .catch((err) => {
        poolPromise = null
        console.error(`[db] connect failed ${target} — ${err.message}`)
        throw err
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

/**
 * Customer portal login — AccReg.WebUser / WebPass (SELECT only).
 * Never returns Pic.
 */
export async function findCustomerByWebUser(username) {
  const pool = await getPool()
  const request = pool.request()
  request.input('username', sql.NVarChar(30), username)

  const result = await request.query(`
    SELECT TOP (1)
      Accid,
      AccNo,
      AccName,
      WebUser,
      WebPass,
      WebStatus,
      Status
    FROM dbo.AccReg
    WHERE LTRIM(RTRIM(WebUser)) = @username
  `)

  return result.recordset[0] || null
}
