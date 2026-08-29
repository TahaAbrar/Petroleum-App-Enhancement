import { Router } from 'express'
import { z } from 'zod'
import { getPool, sql } from './db.js'

/**
 * Chart of Accounts read APIs — ChartAcc → GroupReg → AccReg → Leger.
 * SELECT only. Uses BizId from CompanyPro.CompanyId (defaults to 1).
 */

export const coaRouter = Router()

const chartIdSchema = z.coerce.number().int().positive().max(2_147_483_647)
const groupIdSchema = z.coerce.number().int().positive().max(2_147_483_647)
const accidSchema = z.coerce.number().int().positive().max(2_147_483_647)

const optionalIsoDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .transform((value) => value || undefined)

const txQuerySchema = z.object({
  kind: z.enum(['all', 'credit', 'debit']).default('all'),
  date: optionalIsoDate,
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
  sort: z.enum(['recent', 'oldest']).default('recent'),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(15),
})

const summaryQuerySchema = z.object({
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
})

let cachedBizId = null

async function resolveBizId(pool) {
  if (cachedBizId != null) return cachedBizId
  const result = await pool.request().query(`
    SELECT TOP (1) CompanyId FROM dbo.CompanyPro ORDER BY CompanyId
  `)
  cachedBizId = result.recordset[0]?.CompanyId ?? 1
  return cachedBizId
}

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

function mapStatus(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase()
  if (['inactive', 'disabled', 'blocked', 'lock', 'locked'].includes(v)) {
    return 'Inactive'
  }
  return 'Active'
}

function normalBalanceForChartType(type) {
  const t = String(type || '').trim().toUpperCase()
  if (t === 'CA' || t === 'GA') return 'Debit'
  if (['CL', 'GL', 'LA', 'LI'].includes(t)) return 'Credit'
  return 'Debit'
}

function resolveTxDateRange({ date, dateFrom, dateTo }) {
  let from = dateFrom || date || ''
  let to = dateTo || date || ''
  if (from && to && from > to) {
    const swap = from
    from = to
    to = swap
  }
  return { from, to }
}

function formatQty(n) {
  if (Number.isInteger(n)) return String(n)
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatRate(value) {
  return money(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatWhen(dated, timed) {
  if (!dated) return '—'
  const d = dated instanceof Date ? dated : new Date(dated)
  if (Number.isNaN(d.getTime())) return '—'
  const day = String(d.getUTCDate()).padStart(2, '0')
  const mon = MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()

  let hours = 0
  let minutes = 0
  if (timed instanceof Date && !Number.isNaN(timed.getTime())) {
    hours = timed.getUTCHours()
    minutes = timed.getUTCMinutes()
  } else if (typeof timed === 'string') {
    const match = timed.match(/T?(\d{1,2}):(\d{2})/)
    if (match) {
      hours = Number(match[1])
      minutes = Number(match[2])
    }
  }

  const ampm = hours >= 12 ? 'PM' : 'AM'
  let h12 = hours % 12
  if (h12 === 0) h12 = 12
  return `${day} ${mon} ${year} ${h12}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function txDisplayId(type, vno, trid) {
  const prefix = String(type || 'TXN')
    .replace(/\s+/g, '')
    .toUpperCase() || 'TXN'
  const num = vno != null && vno !== '' ? vno : trid
  return `${prefix}-${num}`
}

function productFields(row) {
  const pmg = money(row.PMG)
  const hsd = money(row.HSD)
  const ho = money(row.HO)
  if (pmg > 0) {
    return { product: 'PMG', quantity: `${formatQty(pmg)} Ltr`, rate: formatRate(row.RPMG) }
  }
  if (hsd > 0) {
    return { product: 'HSD', quantity: `${formatQty(hsd)} Ltr`, rate: formatRate(row.RHSD) }
  }
  if (ho > 0) {
    return { product: 'High Octane', quantity: `${formatQty(ho)} Ltr`, rate: formatRate(row.RHO) }
  }
  const desc = cleanText(row.Description)
  return { product: desc || '—', quantity: '—', rate: '—' }
}

function mapAmount(row, kind) {
  const debit = money(row.Debit)
  const credit = money(row.Credit)
  if (kind === 'credit') return { type: 'Credit', amount: credit }
  if (kind === 'debit') return { type: 'Debit', amount: debit }
  if (debit > 0 && credit === 0) return { type: 'Debit', amount: debit }
  if (credit > 0 && debit === 0) return { type: 'Credit', amount: credit }
  if (debit >= credit) return { type: 'Debit', amount: debit }
  return { type: 'Credit', amount: credit }
}

function dbFail(res, err) {
  console.error('[coa] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Chart of accounts service temporarily unavailable',
  })
}

coaRouter.get('/charts', async (_req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        C.ChartId,
        C.ChartName,
        C.Type,
        (
          SELECT COUNT(DISTINCT G.GroupId)
          FROM dbo.GroupReg G
          WHERE G.ChartId = C.ChartId
        ) AS SubChartCount,
        (
          SELECT COUNT(DISTINCT A.Accid)
          FROM dbo.GroupReg G
          INNER JOIN dbo.AccReg A ON A.GroupId = G.GroupId
          WHERE G.ChartId = C.ChartId
        ) AS AccountCount
      FROM dbo.ChartAcc C
      ORDER BY C.Trid
    `)
    return res.json({
      ok: true,
      charts: result.recordset.map((row) => ({
        chartId: row.ChartId,
        name: cleanText(row.ChartName),
        type: cleanText(row.Type),
        subChartCount: money(row.SubChartCount),
        accountCount: money(row.AccountCount),
      })),
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

coaRouter.get('/charts/:chartId/sub-charts', async (req, res) => {
  const parsed = chartIdSchema.safeParse(req.params.chartId)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid chart id' })
  }

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const result = await pool
      .request()
      .input('chartId', sql.Int, parsed.data)
      .input('bizId', sql.Int, bizId)
      .query(`
        SELECT
          SUM(ISNULL(L.Debit, 0)) - SUM(ISNULL(L.Credit, 0)) AS Balance,
          A.GroupId,
          G.GroupName,
          COUNT(DISTINCT A.Accid) AS AccountCount
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON L.Accid = A.Accid
        INNER JOIN dbo.GroupReg G ON A.GroupId = G.GroupId
        WHERE G.ChartId = @chartId AND L.BizId = @bizId
        GROUP BY G.ChartId, A.GroupId, G.GroupName
        ORDER BY G.GroupName
      `)
    return res.json({
      ok: true,
      subCharts: result.recordset.map((row) => ({
        groupId: row.GroupId,
        name: cleanText(row.GroupName),
        balance: money(row.Balance),
        accountCount: money(row.AccountCount),
      })),
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

coaRouter.get('/groups/:groupId/accounts', async (req, res) => {
  const parsed = groupIdSchema.safeParse(req.params.groupId)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid group id' })
  }

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const result = await pool
      .request()
      .input('groupId', sql.Int, parsed.data)
      .input('bizId', sql.Int, bizId)
      .query(`
        SELECT
          SUM(ISNULL(L.Debit, 0)) - SUM(ISNULL(L.Credit, 0)) AS Balance,
          L.Accid,
          A.AccNo,
          A.AccName,
          A.Ph,
          A.Urdo,
          A.Status,
          G.GroupName,
          G.ChartId,
          C.Type AS ChartType
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON L.Accid = A.Accid
        INNER JOIN dbo.GroupReg G ON A.GroupId = G.GroupId
        INNER JOIN dbo.ChartAcc C ON G.ChartId = C.ChartId
        WHERE A.GroupId = @groupId AND L.BizId = @bizId
        GROUP BY
          L.Accid, A.AccNo, A.AccName, A.Ph, A.Urdo, A.Status,
          G.GroupName, G.ChartId, C.Type
        ORDER BY A.AccName
      `)
    return res.json({
      ok: true,
      accounts: result.recordset.map((row) => ({
        accid: row.Accid,
        accNo: cleanText(row.AccNo),
        name: cleanText(row.AccName),
        phone: cleanText(row.Ph),
        urdu: cleanText(row.Urdo),
        balance: money(row.Balance),
        status: mapStatus(row.Status),
        normalBalance: normalBalanceForChartType(row.ChartType),
        groupName: cleanText(row.GroupName),
        chartId: row.ChartId,
      })),
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

coaRouter.get('/accounts/:accid', async (req, res) => {
  const parsed = accidSchema.safeParse(req.params.accid)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid account id' })
  }

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const result = await pool
      .request()
      .input('accid', sql.Int, parsed.data)
      .input('bizId', sql.Int, bizId)
      .query(`
        SELECT TOP (1)
          A.Accid,
          A.AccNo,
          A.AccName,
          A.Ph,
          A.Status,
          G.GroupName,
          C.ChartName,
          C.Type AS ChartType,
          SUM(ISNULL(L.Debit, 0)) - SUM(ISNULL(L.Credit, 0)) AS Balance
        FROM dbo.AccReg A
        INNER JOIN dbo.GroupReg G ON A.GroupId = G.GroupId
        INNER JOIN dbo.ChartAcc C ON G.ChartId = C.ChartId
        LEFT JOIN dbo.Leger L ON L.Accid = A.Accid AND L.BizId = @bizId
        WHERE A.Accid = @accid
        GROUP BY
          A.Accid, A.AccNo, A.AccName, A.Ph, A.Status,
          G.GroupName, C.ChartName, C.Type
      `)
    const row = result.recordset[0]
    if (!row) {
      return res.status(404).json({ ok: false, message: 'Account not found' })
    }
    return res.json({
      ok: true,
      account: {
        accid: row.Accid,
        accNo: cleanText(row.AccNo),
        name: cleanText(row.AccName),
        phone: cleanText(row.Ph),
        balance: money(row.Balance),
        status: mapStatus(row.Status),
        normalBalance: normalBalanceForChartType(row.ChartType),
        groupName: cleanText(row.GroupName),
        chartName: cleanText(row.ChartName),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

coaRouter.get('/accounts/:accid/summary', async (req, res) => {
  const accidParsed = accidSchema.safeParse(req.params.accid)
  const queryParsed = summaryQuerySchema.safeParse(req.query)
  if (!accidParsed.success || !queryParsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const { from: dateFrom, to: dateTo } = resolveTxDateRange(queryParsed.data)

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const result = await pool
      .request()
      .input('accid', sql.Int, accidParsed.data)
      .input('bizId', sql.Int, bizId)
      .input('hasFrom', sql.Bit, dateFrom ? 1 : 0)
      .input('hasTo', sql.Bit, dateTo ? 1 : 0)
      .input('dateFrom', sql.Date, dateFrom || '1900-01-01')
      .input('dateTo', sql.Date, dateTo || '1900-01-01')
      .query(`
        SELECT
          SUM(ISNULL(HSD, 0)) AS HSD,
          SUM(ISNULL(PMG, 0)) AS PMG,
          SUM(ISNULL(HO, 0)) AS HO,
          SUM(ISNULL(Cash, 0)) AS Advance,
          SUM(ISNULL(Other, 0)) AS Others
        FROM dbo.Leger
        WHERE Accid = @accid
          AND BizId = @bizId
          AND (@hasFrom = 0 OR CAST(Dated AS date) >= @dateFrom)
          AND (@hasTo = 0 OR CAST(Dated AS date) <= @dateTo)
      `)
    const row = result.recordset[0] || {}
    return res.json({
      ok: true,
      summary: {
        hsd: money(row.HSD),
        pmg: money(row.PMG),
        ho: money(row.HO),
        advance: money(row.Advance),
        others: money(row.Others),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

coaRouter.get('/accounts/:accid/transactions', async (req, res) => {
  const accidParsed = accidSchema.safeParse(req.params.accid)
  const queryParsed = txQuerySchema.safeParse(req.query)
  if (!accidParsed.success || !queryParsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const accid = accidParsed.data
  const { kind, sort, offset, limit } = queryParsed.data
  const { from: dateFrom, to: dateTo } = resolveTxDateRange(queryParsed.data)

  try {
    const pool = await getPool()
    const exists = await pool
      .request()
      .input('accid', sql.Int, accid)
      .query('SELECT Accid FROM dbo.AccReg WHERE Accid = @accid')
    if (!exists.recordset[0]) {
      return res.status(404).json({ ok: false, message: 'Account not found' })
    }

    const filterSql = `
      WHERE 1 = 1
        AND (@hasFrom = 0 OR CAST(Tx.Dated AS date) >= @dateFrom)
        AND (@hasTo = 0 OR CAST(Tx.Dated AS date) <= @dateTo)
        AND (
          @kind = N'all'
          OR (@kind = N'credit' AND ISNULL(Tx.Credit, 0) > 0)
          OR (@kind = N'debit' AND ISNULL(Tx.Debit, 0) > 0)
        )
    `
    const cte = `
      WITH Tx AS (
        SELECT
          L.Trid,
          L.Dated,
          L.Timed,
          L.Type,
          L.VNo,
          L.Debit,
          L.Credit,
          L.Description,
          L.UserId,
          L.HSD,
          L.RHSD,
          L.PMG,
          L.RPMG,
          L.HO,
          L.RHO,
          ISNULL(A.OpBal, 0) + SUM(ISNULL(L.Debit, 0) - ISNULL(L.Credit, 0))
            OVER (ORDER BY L.Trid ROWS UNBOUNDED PRECEDING) AS RunningBalance
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
        WHERE L.Accid = @accid
      )
    `

    const countReq = pool.request()
    countReq.input('accid', sql.Int, accid)
    countReq.input('kind', sql.NVarChar(10), kind)
    countReq.input('hasFrom', sql.Bit, dateFrom ? 1 : 0)
    countReq.input('hasTo', sql.Bit, dateTo ? 1 : 0)
    countReq.input('dateFrom', sql.Date, dateFrom || '1900-01-01')
    countReq.input('dateTo', sql.Date, dateTo || '1900-01-01')
    const countResult = await countReq.query(`
      ${cte}
      SELECT COUNT(*) AS Total
      FROM Tx
      ${filterSql}
    `)
    const total = money(countResult.recordset[0]?.Total)

    const listReq = pool.request()
    listReq.input('accid', sql.Int, accid)
    listReq.input('kind', sql.NVarChar(10), kind)
    listReq.input('hasFrom', sql.Bit, dateFrom ? 1 : 0)
    listReq.input('hasTo', sql.Bit, dateTo ? 1 : 0)
    listReq.input('dateFrom', sql.Date, dateFrom || '1900-01-01')
    listReq.input('dateTo', sql.Date, dateTo || '1900-01-01')
    listReq.input('sort', sql.NVarChar(10), sort)
    listReq.input('offset', sql.Int, offset)
    listReq.input('limit', sql.Int, limit)
    const listResult = await listReq.query(`
      ${cte}
      SELECT
        Tx.Trid,
        Tx.Dated,
        Tx.Timed,
        Tx.Type,
        Tx.VNo,
        Tx.Debit,
        Tx.Credit,
        Tx.Description,
        Tx.HSD,
        Tx.RHSD,
        Tx.PMG,
        Tx.RPMG,
        Tx.HO,
        Tx.RHO,
        Tx.RunningBalance,
        U.UserName,
        U.Type AS UserType
      FROM Tx
      LEFT JOIN dbo.UserReg U ON U.UserId = Tx.UserId
      ${filterSql}
      ORDER BY
        CASE WHEN @sort = N'recent' THEN Tx.Dated END DESC,
        CASE WHEN @sort = N'recent' THEN Tx.Trid END DESC,
        CASE WHEN @sort = N'oldest' THEN Tx.Dated END ASC,
        CASE WHEN @sort = N'oldest' THEN Tx.Trid END ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `)

    const transactions = listResult.recordset.map((row) => {
      const { type, amount } = mapAmount(row, kind)
      const product = productFields(row)
      return {
        trid: row.Trid,
        id: txDisplayId(row.Type, row.VNo, row.Trid),
        when: formatWhen(row.Dated, row.Timed),
        type,
        product: product.product,
        quantity: product.quantity,
        rate: product.rate,
        amount,
        balance: money(row.RunningBalance),
        by: cleanText(row.UserName) || cleanText(row.UserType) || '—',
      }
    })

    return res.json({ ok: true, total, offset, limit, transactions })
  } catch (err) {
    return dbFail(res, err)
  }
})
