import { Router } from 'express'
import { z } from 'zod'
import { getPool, sql } from './db.js'

/**
 * Global transactions read APIs.
 * SELECT only — never INSERT / UPDATE / DELETE.
 * Never returns AccReg.WebUser, WebPass, or Pic.
 */

export const transactionRouter = Router()

const optionalIsoDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .transform((value) => value || undefined)

const optionalAccid = z
  .union([z.literal(''), z.coerce.number().int().positive().max(2_147_483_647)])
  .optional()
  .transform((value) => (value === '' || value == null ? undefined : value))

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  accid: optionalAccid,
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
  kind: z.enum(['all', 'credit', 'debit']).default('all'),
  sort: z.enum(['recent', 'oldest']).default('recent'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(50),
})

const customersQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
})

function resolveDateRange(from, to) {
  let dateFrom = from || ''
  let dateTo = to || ''
  if (dateFrom && dateTo && dateFrom > dateTo) {
    const swap = dateFrom
    dateFrom = dateTo
    dateTo = swap
  }
  return { dateFrom, dateTo }
}

function likeContains(value) {
  return `%${String(value).replace(/([%_[\]])/g, '[$1]')}%`
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

function slugifyName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function customerSlug(name, accid) {
  const base = slugifyName(name) || 'customer'
  return `${base}-${accid}`
}

function displayProduct(row) {
  const fields = productFields(row)
  if (fields.quantity !== '—') return `${fields.product} - ${fields.quantity}`
  return fields.product
}

function dbFail(res, err) {
  console.error('[transactions] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Transaction service temporarily unavailable',
  })
}

const STATUS_SQL = `(L.Status IS NULL OR L.Status = N'Posted')`

function filterSql(alias) {
  const dated = alias === 'Tx' ? 'Tx.Dated' : 'L.Dated'
  const accid = alias === 'Tx' ? 'Tx.Accid' : 'L.Accid'
  const credit = alias === 'Tx' ? 'Tx.Credit' : 'L.Credit'
  const debit = alias === 'Tx' ? 'Tx.Debit' : 'L.Debit'
  const accName = alias === 'Tx' ? 'Tx.AccName' : 'A.AccName'
  const description = alias === 'Tx' ? 'Tx.Description' : 'L.Description'
  const refNo = alias === 'Tx' ? 'Tx.RefNo' : 'L.RefNo'
  const vno = alias === 'Tx' ? 'Tx.VNo' : 'L.VNo'
  return `
      AND (@hasAccid = 0 OR ${accid} = @accid)
      AND (@hasFrom = 0 OR CAST(${dated} AS date) >= @dateFrom)
      AND (@hasTo = 0 OR CAST(${dated} AS date) <= @dateTo)
      AND (
        @kind = N'all'
        OR (@kind = N'credit' AND ISNULL(${credit}, 0) > 0)
        OR (@kind = N'debit' AND ISNULL(${debit}, 0) > 0)
      )
      AND (
        @q = N''
        OR ${accName} LIKE @qLike
        OR ${description} LIKE @qLike
        OR CAST(${refNo} AS nvarchar(80)) LIKE @qLike
        OR CAST(${vno} AS nvarchar(80)) LIKE @qLike
      )
  `
}

function bindListParams(request, parsed) {
  const { dateFrom, dateTo } = resolveDateRange(parsed.dateFrom, parsed.dateTo)
  request.input('accid', sql.Int, parsed.accid || 0)
  request.input('hasAccid', sql.Bit, parsed.accid ? 1 : 0)
  request.input('kind', sql.NVarChar(10), parsed.kind)
  request.input('hasFrom', sql.Bit, dateFrom ? 1 : 0)
  request.input('hasTo', sql.Bit, dateTo ? 1 : 0)
  request.input('dateFrom', sql.Date, dateFrom || '1900-01-01')
  request.input('dateTo', sql.Date, dateTo || '1900-01-01')
  request.input('q', sql.NVarChar(100), parsed.q || '')
  request.input('qLike', sql.NVarChar(120), parsed.q ? likeContains(parsed.q) : '')
  return { dateFrom, dateTo }
}

const CUSTOMER_GROUP_SQL = `G.GroupName = N'CUSTOMERS'`

const kindStatsSchema = z.object({
  kind: z.enum(['credit', 'debit']),
})

transactionRouter.get('/stats', async (req, res) => {
  const parsed = kindStatsSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }
  const { kind } = parsed.data
  const amountCol = kind === 'credit' ? 'Credit' : 'Debit'
  const kindFilter =
    kind === 'credit'
      ? 'AND ISNULL(L.Credit, 0) > 0'
      : 'AND ISNULL(L.Debit, 0) > 0'

  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AccReg) AS TotalCustomers,
        (SELECT SUM(ISNULL(L.${amountCol}, 0))
         FROM dbo.Leger L
         INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
         INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
         WHERE ${STATUS_SQL}
           AND ${CUSTOMER_GROUP_SQL}
           ${kindFilter}) AS TotalAmount,
        (SELECT SUM(ISNULL(L.${amountCol}, 0))
         FROM dbo.Leger L
         INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
         INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
         WHERE ${STATUS_SQL}
           AND ${CUSTOMER_GROUP_SQL}
           ${kindFilter}
           AND YEAR(L.Dated) = YEAR(GETDATE())
           AND MONTH(L.Dated) = MONTH(GETDATE())) AS MonthAmount,
        (SELECT SUM(ISNULL(L.${amountCol}, 0))
         FROM dbo.Leger L
         INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
         INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
         WHERE ${STATUS_SQL}
           AND ${CUSTOMER_GROUP_SQL}
           ${kindFilter}
           AND CAST(L.Dated AS date) = CAST(GETDATE() AS date)) AS TodayAmount
    `)
    const row = result.recordset[0] || {}
    return res.json({
      ok: true,
      stats: {
        totalCustomers: money(row.TotalCustomers),
        total: money(row.TotalAmount),
        month: money(row.MonthAmount),
        today: money(row.TodayAmount),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

transactionRouter.get('/customers', async (req, res) => {
  const parsed = customersQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  try {
    const pool = await getPool()
    const request = pool.request()
    request.input('q', sql.NVarChar(100), parsed.data.q || '')
    request.input('qLike', sql.NVarChar(120), parsed.data.q ? likeContains(parsed.data.q) : '')
    const result = await request.query(`
      SELECT TOP (500)
        A.Accid,
        A.AccName
      FROM dbo.AccReg A
      WHERE @q = N''
        OR A.AccName LIKE @qLike
        OR A.AccNo LIKE @qLike
      ORDER BY A.AccName
    `)
    const customers = result.recordset.map((row) => ({
      accid: row.Accid,
      name: cleanText(row.AccName) || '—',
      slug: customerSlug(row.AccName, row.Accid),
    }))
    return res.json({ ok: true, customers })
  } catch (err) {
    return dbFail(res, err)
  }
})

transactionRouter.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const { kind, sort, page, pageSize } = parsed.data
  const offset = (page - 1) * pageSize

  try {
    const pool = await getPool()

    const summaryReq = pool.request()
    bindListParams(summaryReq, parsed.data)
    const summaryResult = await summaryReq.query(`
      SELECT
        COUNT(*) AS TotalTransactions,
        SUM(ISNULL(L.Credit, 0)) AS TotalCredit,
        SUM(ISNULL(L.Debit, 0)) AS TotalDebit
      FROM dbo.Leger L
      INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
      INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
      WHERE ${STATUS_SQL}
      ${filterSql('L')}
    `)
    const summaryRow = summaryResult.recordset[0] || {}
    const total = money(summaryRow.TotalTransactions)
    const totalCredit = money(summaryRow.TotalCredit)
    const totalDebit = money(summaryRow.TotalDebit)

    const listReq = pool.request()
    bindListParams(listReq, parsed.data)
    listReq.input('sort', sql.NVarChar(10), sort)
    listReq.input('offset', sql.Int, offset)
    listReq.input('limit', sql.Int, pageSize)
    const listResult = await listReq.query(`
      WITH Tx AS (
        SELECT
          L.Trid,
          L.Dated,
          L.Timed,
          L.Type,
          L.VNo,
          L.RefNo,
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
          L.Accid,
          A.AccName,
          ISNULL(A.OpBal, 0) + SUM(ISNULL(L.Debit, 0) - ISNULL(L.Credit, 0))
            OVER (PARTITION BY L.Accid ORDER BY L.Trid ROWS UNBOUNDED PRECEDING) AS RunningBalance
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
        INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
        WHERE ${STATUS_SQL}
      )
      SELECT
        Tx.Trid,
        Tx.Dated,
        Tx.Timed,
        Tx.Type,
        Tx.VNo,
        Tx.RefNo,
        Tx.Debit,
        Tx.Credit,
        Tx.Description,
        Tx.HSD,
        Tx.RHSD,
        Tx.PMG,
        Tx.RPMG,
        Tx.HO,
        Tx.RHO,
        Tx.Accid,
        Tx.AccName,
        Tx.RunningBalance,
        U.UserName,
        U.Type AS UserType
      FROM Tx
      LEFT JOIN dbo.UserReg U ON U.UserId = Tx.UserId
      WHERE 1 = 1
      ${filterSql('Tx')}
      ORDER BY
        CASE WHEN @sort = N'recent' THEN Tx.Dated END DESC,
        CASE WHEN @sort = N'recent' THEN Tx.Trid END DESC,
        CASE WHEN @sort = N'oldest' THEN Tx.Dated END ASC,
        CASE WHEN @sort = N'oldest' THEN Tx.Trid END ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `)

    const transactions = listResult.recordset.map((row) => {
      const { type, amount } = mapAmount(row, kind)
      const name = cleanText(row.AccName) || '—'
      const fields = productFields(row)
      return {
        trid: row.Trid,
        id: txDisplayId(row.Type, row.VNo, row.Trid),
        accid: row.Accid,
        slug: customerSlug(name, row.Accid),
        when: formatWhen(row.Dated, row.Timed),
        customer: name,
        type,
        product: displayProduct(row),
        quantity: fields.quantity,
        rate: fields.rate,
        amount,
        balance: money(row.RunningBalance),
        reference: cleanText(row.RefNo) || (row.VNo != null && row.VNo !== '' ? String(row.VNo) : '—'),
        by: cleanText(row.UserName) || cleanText(row.UserType) || '—',
      }
    })

    return res.json({
      ok: true,
      total,
      page,
      pageSize,
      summary: {
        totalTransactions: total,
        totalCredit,
        totalDebit,
        netFlow: totalCredit - totalDebit,
      },
      transactions,
    })
  } catch (err) {
    return dbFail(res, err)
  }
})
