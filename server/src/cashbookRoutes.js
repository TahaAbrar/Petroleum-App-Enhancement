import { Router } from 'express'
import { getPool, sql } from './db.js'

/**
 * Cash Book read APIs — AccReg + Leger balances.
 * SELECT only (write endpoints come later).
 */

export const cashbookRouter = Router()

function money(value) {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function dbFail(res, err) {
  console.error('[cashbook] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Cash book service temporarily unavailable',
  })
}

let cachedBizId = null

async function resolveBizId(pool) {
  if (cachedBizId != null) return cachedBizId
  const result = await pool.request().query(`
    SELECT TOP (1) CompanyId FROM dbo.CompanyPro ORDER BY CompanyId
  `)
  cachedBizId = result.recordset[0]?.CompanyId ?? 1
  return cachedBizId
}

cashbookRouter.get('/accounts', async (_req, res) => {
  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const result = await pool.request().input('bizId', sql.Int, bizId).query(`
      SELECT
        A.Accid,
        A.AccName,
        A.AccNo,
        ISNULL(A.OpBal, 0) + ISNULL(B.Net, 0) AS Balance
      FROM dbo.AccReg A
      LEFT JOIN (
        SELECT
          L.Accid,
          SUM(ISNULL(L.Debit, 0)) - SUM(ISNULL(L.Credit, 0)) AS Net
        FROM dbo.Leger L
        WHERE L.BizId = @bizId OR L.BizId IS NULL
        GROUP BY L.Accid
      ) B ON B.Accid = A.Accid
      ORDER BY A.AccName
    `)

    const accounts = result.recordset.map((row) => ({
      accid: money(row.Accid),
      name: cleanText(row.AccName) || '—',
      accNo: cleanText(row.AccNo),
      balance: money(row.Balance),
    }))

    return res.json({ ok: true, accounts })
  } catch (err) {
    return dbFail(res, err)
  }
})
