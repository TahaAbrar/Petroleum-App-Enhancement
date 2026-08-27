import { Router } from 'express'
import { z } from 'zod'
import { getPool, sql } from './db.js'

export const dashboardRouter = Router()

const STATUS_SQL = `(L.Status IS NULL OR L.Status = N'Posted')`
/** Customer ledger only — avoids double-entry equality across all accounts. */
const CUSTOMER_GROUP_SQL = `G.GroupName = N'CUSTOMERS'`

const rangeSchema = z.enum(['7d', '1m', '6m', '1y']).default('7d')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function money(value) {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function dbFail(res, err) {
  console.error('[dashboard] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Dashboard service temporarily unavailable',
  })
}

function dayCount(range) {
  switch (range) {
    case '1m':
      return 30
    case '6m':
      return 6
    case '1y':
      return 12
    default:
      return 7
  }
}

function utcDayKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayLabel(date) {
  const d = date instanceof Date ? date : new Date(date)
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${day} ${MONTHS[d.getUTCMonth()]}`
}

function formatMonthLabel(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function startUtcDate(daysBack) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d
}

function monthStartUtc(monthsBack) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - monthsBack)
  return d
}

function buildDailySeries(rows, days = 7) {
  const map = new Map()
  for (const row of rows) {
    const key = utcDayKey(row.Bucket)
    map.set(key, row)
  }
  const result = []
  const start = startUtcDate(days - 1)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    const key = utcDayKey(d)
    const row = map.get(key)
    result.push({
      label: formatDayLabel(d),
      credit: money(row?.Credit),
      debit: money(row?.Debit),
      net: money(row?.Credit) - money(row?.Debit),
    })
  }
  return result
}

function buildMonthlySeries(rows, months = 6) {
  const map = new Map()
  for (const row of rows) {
    const d = row.Bucket instanceof Date ? row.Bucket : new Date(row.Bucket)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    map.set(key, row)
  }
  const result = []
  const start = monthStartUtc(months - 1)
  for (let i = 0; i < months; i++) {
    const d = new Date(start)
    d.setUTCMonth(start.getUTCMonth() + i)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const row = map.get(key)
    result.push({
      label: formatMonthLabel(d),
      credit: money(row?.Credit),
      debit: money(row?.Debit),
      net: money(row?.Credit) - money(row?.Debit),
    })
  }
  return result
}

function toBalanceTrend(points) {
  // Per-day/month net only — no cumulative carry. Empty buckets stay 0.
  return points.map((p) => ({
    label: p.label,
    value: p.net,
  }))
}

dashboardRouter.get('/stats', async (_req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AccReg) AS TotalCustomers,
        (SELECT SUM(CASE WHEN ISNULL(L.Credit, 0) > 0 THEN L.Credit ELSE 0 END)
         FROM dbo.Leger L
         INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
         INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
         WHERE ${STATUS_SQL}
           AND ${CUSTOMER_GROUP_SQL}) AS TotalCredit,
        (SELECT SUM(CASE WHEN ISNULL(L.Debit, 0) > 0 THEN L.Debit ELSE 0 END)
         FROM dbo.Leger L
         INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
         INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
         WHERE ${STATUS_SQL}
           AND ${CUSTOMER_GROUP_SQL}) AS TotalDebit,
        (SELECT COUNT(*)
         FROM dbo.Leger L
         INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
         INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
         WHERE ${STATUS_SQL}
           AND CAST(L.Dated AS date) = CAST(GETDATE() AS date)) AS TodayTransactions
    `)
    const row = result.recordset[0] || {}
    return res.json({
      ok: true,
      stats: {
        totalCustomers: money(row.TotalCustomers),
        totalCredit: money(row.TotalCredit),
        totalDebit: money(row.TotalDebit),
        todayTransactions: money(row.TodayTransactions),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

dashboardRouter.get('/credit-debit', async (_req, res) => {
  const days = 7
  const startExpr = `DATEADD(day, -${days - 1}, CAST(GETDATE() AS date))`

  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        CAST(L.Dated AS date) AS Bucket,
        SUM(CASE WHEN ISNULL(L.Credit, 0) > 0 THEN L.Credit ELSE 0 END) AS Credit,
        SUM(CASE WHEN ISNULL(L.Debit, 0) > 0 THEN L.Debit ELSE 0 END) AS Debit
      FROM dbo.Leger L
      INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
      INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
      WHERE ${STATUS_SQL}
        AND ${CUSTOMER_GROUP_SQL}
        AND CAST(L.Dated AS date) >= ${startExpr}
      GROUP BY CAST(L.Dated AS date)
      ORDER BY Bucket
    `)

    const creditDebit = buildDailySeries(result.recordset, days).map(({ label, credit, debit }) => ({
      label,
      credit,
      debit,
    }))

    return res.json({ ok: true, creditDebit })
  } catch (err) {
    return dbFail(res, err)
  }
})

dashboardRouter.get('/balance-trend', async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query.range)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }
  const range = parsed.data

  try {
    const pool = await getPool()
    let points = []

    if (range === '6m' || range === '1y') {
      const months = range === '1y' ? 12 : 6
      const startExpr = `DATEADD(month, -${months - 1}, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))`
      const trendResult = await pool.request().query(`
        SELECT
          DATEFROMPARTS(YEAR(L.Dated), MONTH(L.Dated), 1) AS Bucket,
          SUM(CASE WHEN ISNULL(L.Credit, 0) > 0 THEN L.Credit ELSE 0 END) AS Credit,
          SUM(CASE WHEN ISNULL(L.Debit, 0) > 0 THEN L.Debit ELSE 0 END) AS Debit
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
        INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
        WHERE ${STATUS_SQL}
          AND ${CUSTOMER_GROUP_SQL}
          AND CAST(L.Dated AS date) >= ${startExpr}
        GROUP BY DATEFROMPARTS(YEAR(L.Dated), MONTH(L.Dated), 1)
        ORDER BY Bucket
      `)
      points = buildMonthlySeries(trendResult.recordset, months)
    } else {
      const days = range === '1m' ? 30 : 7
      const startExpr = `DATEADD(day, -${days - 1}, CAST(GETDATE() AS date))`
      const trendResult = await pool.request().query(`
        SELECT
          CAST(L.Dated AS date) AS Bucket,
          SUM(CASE WHEN ISNULL(L.Credit, 0) > 0 THEN L.Credit ELSE 0 END) AS Credit,
          SUM(CASE WHEN ISNULL(L.Debit, 0) > 0 THEN L.Debit ELSE 0 END) AS Debit
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
        INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
        WHERE ${STATUS_SQL}
          AND ${CUSTOMER_GROUP_SQL}
          AND CAST(L.Dated AS date) >= ${startExpr}
        GROUP BY CAST(L.Dated AS date)
        ORDER BY Bucket
      `)
      points = buildDailySeries(trendResult.recordset, days)
    }

    const balanceTrend = toBalanceTrend(points)

    return res.json({ ok: true, range, balanceTrend })
  } catch (err) {
    return dbFail(res, err)
  }
})
