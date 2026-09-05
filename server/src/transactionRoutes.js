import { Router } from 'express'
import { z } from 'zod'
import { getPool, sql } from './db.js'
import { safeEqualPassword } from './security.js'

/**
 * Global transactions APIs.
 * List/summary: SELECT only.
 * Delete: parameterized DELETE (+ RecordTB audit) for Admin/Accountant.
 * Never returns AccReg.WebUser, WebPass, or Pic.
 */

export const transactionRouter = Router()

let cachedBizId = null

async function resolveBizId(pool) {
  if (cachedBizId != null) return cachedBizId
  const result = await pool.request().query(`
    SELECT TOP (1) CompanyId FROM dbo.CompanyPro ORDER BY CompanyId
  `)
  cachedBizId = result.recordset[0]?.CompanyId ?? 1
  return cachedBizId
}

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

/** Payment mode for transactions table — from SlipType, Description, account, Leger.Type. */
function resolvePaymentType(row) {
  const slipType = cleanText(row.SlipType)
  if (slipType) {
    return slipType.charAt(0).toUpperCase() + slipType.slice(1).toLowerCase()
  }

  const desc = cleanText(row.Description).toLowerCase()
  const acc = cleanText(row.AccName).toLowerCase()
  const legerType = cleanText(row.Type)

  if (/\bonline\b|1bill|jazz\s*cash|\bpos\b|card\s*pos|card machine|byco company 1bill/.test(desc)) {
    return 'Online'
  }
  if (/\btransfer\b|khata|\bcheck\b|cheque/.test(desc)) {
    return 'Transfer'
  }

  if (/bank|mcb|alfalah|meezan|hbl|ubl|faysal/.test(acc)) return 'Online'

  if (legerType === 'JV') return 'Transfer'
  if (legerType === 'Slip') return 'Cash'
  if (legerType === 'Purchases' || legerType === 'DSales' || legerType === 'Adjustment') {
    return 'Transfer'
  }
  if (legerType === 'Sales') return 'Cash'

  return legerType || '—'
}

function mapRow(row, kind) {
  const { type, amount } = mapAmount(row, kind)
  const name = cleanText(row.AccName) || '—'
  const fields = productFields(row)
  return {
    trid: row.Trid,
    id: txDisplayId(row.Type, row.VNo, row.Trid),
    vno: row.VNo != null && row.VNo !== '' ? String(row.VNo) : '—',
    accid: row.Accid,
    slug: customerSlug(name, row.Accid),
    when: formatWhen(row.Dated, row.Timed),
    customer: name,
    type,
    ledgerType: cleanText(row.Type) || '—',
    paymentType: resolvePaymentType(row),
    product: displayProduct(row),
    quantity: fields.quantity,
    rate: fields.rate,
    amount,
    debit: money(row.Debit),
    credit: money(row.Credit),
    balance: money(row.RunningBalance),
    reference: cleanText(row.RefNo) || (row.VNo != null && row.VNo !== '' ? String(row.VNo) : '—'),
    by: cleanText(row.UserName) || cleanText(row.UserType) || '—',
    description: cleanText(row.Description) || '—',
  }
}

function voucherKeysCte() {
  return `
      VoucherKeys AS (
        SELECT
          Tx.Dated,
          Tx.VNo,
          Tx.Type,
          MIN(Tx.Trid) AS AnchorTrid
        FROM Tx
        GROUP BY Tx.Dated, Tx.VNo, Tx.Type
        HAVING (@hasFrom = 0 OR CAST(MIN(Tx.Dated) AS date) >= @dateFrom)
          AND (@hasTo = 0 OR CAST(MIN(Tx.Dated) AS date) <= @dateTo)
          AND (
            @hasAccid = 0
            OR MAX(CASE WHEN Tx.Accid = @accid THEN 1 ELSE 0 END) = 1
          )
          AND (
            @kind = N'all'
            OR (@kind = N'credit' AND MAX(CASE WHEN ISNULL(Tx.Credit, 0) > 0 AND Tx.Accid <> 1 THEN 1 ELSE 0 END) = 1)
            OR (@kind = N'debit' AND MAX(CASE WHEN ISNULL(Tx.Debit, 0) > 0 AND Tx.Accid <> 1 THEN 1 ELSE 0 END) = 1)
          )
          AND (
            @q = N''
            OR MAX(CASE
              WHEN Tx.AccName LIKE @qLike
                OR Tx.Description LIKE @qLike
                OR CAST(Tx.RefNo AS nvarchar(80)) LIKE @qLike
                OR CAST(Tx.VNo AS nvarchar(80)) LIKE @qLike
              THEN 1 ELSE 0 END) = 1
          )
      ),
      VoucherRank AS (
        SELECT
          VoucherKeys.Dated,
          VoucherKeys.VNo,
          VoucherKeys.Type,
          VoucherKeys.AnchorTrid,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE WHEN @sort = N'recent' THEN VoucherKeys.Dated END DESC,
              CASE WHEN @sort = N'oldest' THEN VoucherKeys.Dated END ASC,
              CASE WHEN @sort = N'recent' THEN VoucherKeys.VNo END DESC,
              CASE WHEN @sort = N'oldest' THEN VoucherKeys.VNo END ASC,
              CASE WHEN @sort = N'recent' THEN VoucherKeys.AnchorTrid END DESC,
              CASE WHEN @sort = N'oldest' THEN VoucherKeys.AnchorTrid END ASC
          ) AS VoucherRn
        FROM VoucherKeys
      )
  `
}

function dbFail(res, err) {
  console.error('[transactions] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Transaction service temporarily unavailable',
  })
}

const deleteBodySchema = z.object({
  trid: z.coerce.number().int().positive().max(2_147_483_647),
  password: z.string().min(1, 'Password is required').max(128),
})

/** Verify against Administrator account password (UserReg). Wrong password → no delete. */
async function verifyAdminPassword(pool, password) {
  const result = await pool.request().query(`
    SELECT TOP (1) UserPass
    FROM dbo.UserReg
    WHERE LTRIM(RTRIM(Type)) IN (N'Administrator', N'Admin')
    ORDER BY UserId
  `)
  const admin = result.recordset[0]
  if (!admin) return false
  return safeEqualPassword(password, admin.UserPass ?? '')
}

async function tryQuery(label, run) {
  try {
    await run()
  } catch (err) {
    console.warn(`[transactions] optional ${label} skipped:`, err.message)
  }
}

/**
 * Resolve all VNos to delete: source VNo + nearest opposite debit/credit leg
 * (Slip pairs often use consecutive VNos with matching amounts).
 */
async function resolveDeleteVnos(pool, { trid, vno, type, dated, debit, credit, bizId }) {
  const vnos = new Set()
  if (vno != null && vno !== '') vnos.add(Number(vno))

  const oppReq = pool
    .request()
    .input('trid', sql.Int, trid)
    .input('type', sql.NVarChar(50), type)
    .input('dated', sql.DateTime, dated)
    .input('debit', sql.Money, debit)
    .input('credit', sql.Money, credit)
    .input('bizId', sql.Int, bizId)

  const oppResult = await oppReq.query(`
    SELECT TOP (1) L.VNo, L.Trid
    FROM dbo.Leger L
    WHERE L.Trid <> @trid
      AND L.BizId = @bizId
      AND L.Type = @type
      AND CAST(L.Dated AS date) = CAST(@dated AS date)
      AND (
        (@debit > 0 AND ISNULL(L.Credit, 0) = @debit AND ISNULL(L.Debit, 0) = 0)
        OR (@credit > 0 AND ISNULL(L.Debit, 0) = @credit AND ISNULL(L.Credit, 0) = 0)
      )
    ORDER BY ABS(L.Trid - @trid)
  `)

  const opp = oppResult.recordset[0]
  if (opp?.VNo != null && opp.VNo !== '') vnos.add(Number(opp.VNo))

  // Same-VNo siblings (Cash Book / JV dual legs) — already covered by source VNo,
  // but collect any extra VNos sharing the voucher key with either side.
  if (vnos.size > 0) {
    const list = [...vnos]
    for (const vn of list) {
      const sib = await pool
        .request()
        .input('vno', sql.Int, vn)
        .input('type', sql.NVarChar(50), type)
        .input('dated', sql.DateTime, dated)
        .input('bizId', sql.Int, bizId)
        .query(`
          SELECT DISTINCT L.VNo
          FROM dbo.Leger L
          WHERE L.BizId = @bizId
            AND L.Type = @type
            AND L.VNo = @vno
            AND CAST(L.Dated AS date) = CAST(@dated AS date)
        `)
      for (const row of sib.recordset) {
        if (row.VNo != null && row.VNo !== '') vnos.add(Number(row.VNo))
      }
    }
  }

  return [...vnos].filter((n) => Number.isFinite(n))
}

async function deleteLegerForVno(transaction, { vno, type, dated, bizId, useDated }) {
  const req = new sql.Request(transaction)
  req.input('vno', sql.Int, vno)
  req.input('type', sql.NVarChar(50), type)
  req.input('bizId', sql.Int, bizId)
  if (useDated) {
    req.input('dated', sql.DateTime, dated)
    const result = await req.query(`
      DELETE FROM dbo.Leger
      WHERE VNo = @vno
        AND Type = @type
        AND CAST(Dated AS date) = CAST(@dated AS date)
        AND BizId = @bizId
    `)
    return result.rowsAffected?.[0] ?? 0
  }
  const result = await req.query(`
    DELETE FROM dbo.Leger
    WHERE VNo = @vno
      AND Type = @type
      AND BizId = @bizId
  `)
  return result.rowsAffected?.[0] ?? 0
}

async function runSecondaryDeletes(pool, { type, vnos, dated, bizId }) {
  for (const vno of vnos) {
    if (type === 'JV') {
      await tryQuery('JV', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`DELETE FROM dbo.JV WHERE VNo = @vno AND BizId = @bizId`),
      )
    }

    if (type === 'Slip') {
      await tryQuery('Slip', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('dated', sql.DateTime, dated)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.Slip
            WHERE VNo = @vno
              AND CAST(Dated AS date) = CAST(@dated AS date)
              AND BizId = @bizId
          `),
      )
      await tryQuery('SlipDet', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('dated', sql.DateTime, dated)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.SlipDet
            WHERE VNo = @vno
              AND CAST(Dated AS date) = CAST(@dated AS date)
              AND BizId = @bizId
          `),
      )
    }

    if (type === 'Purchases') {
      await tryQuery('PR', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('dated', sql.DateTime, dated)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.PR
            WHERE VNo = @vno
              AND CAST(Dated AS date) = CAST(@dated AS date)
              AND BizId = @bizId
          `),
      )
      await tryQuery('Stockleger Purchases', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.Stockleger
            WHERE VNo = @vno AND RefNo = N'Purchases' AND BizId = @bizId
          `),
      )
    }

    if (type === 'Sales') {
      await tryQuery('Sales', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`DELETE FROM dbo.Sales WHERE VNo = @vno AND BizId = @bizId`),
      )
      await tryQuery('Stockleger Sales', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.Stockleger
            WHERE VNo = @vno AND RefNo = N'Sales' AND BizId = @bizId
          `),
      )
      await tryQuery('SaleDetail', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`DELETE FROM dbo.SaleDetail WHERE VNo = @vno AND BizId = @bizId`),
      )
    }

    if (type === 'SaleReturn') {
      await tryQuery('SaleReturn', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('dated', sql.DateTime, dated)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.SaleReturn
            WHERE VNo = @vno
              AND CAST(Dated AS date) = CAST(@dated AS date)
              AND BizId = @bizId
          `),
      )
      await tryQuery('Stockleger SaleReturn', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.Stockleger
            WHERE VNo = @vno AND RefNo = N'SaleReturn' AND BizId = @bizId
          `),
      )
    }

    if (type === 'PurchaseReturn') {
      await tryQuery('PurchaseReturn', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('dated', sql.DateTime, dated)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.PurchaseReturn
            WHERE VNo = @vno
              AND CAST(Dated AS date) = CAST(@dated AS date)
              AND BizId = @bizId
          `),
      )
      await tryQuery('Stockleger PurchaseReturn', () =>
        pool
          .request()
          .input('vno', sql.Int, vno)
          .input('bizId', sql.Int, bizId)
          .query(`
            DELETE FROM dbo.Stockleger
            WHERE VNo = @vno AND RefNo = N'PurchaseReturn' AND BizId = @bizId
          `),
      )
    }
  }
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
        OR (@kind = N'credit' AND ISNULL(${credit}, 0) > 0 AND ${accid} <> 1)
        OR (@kind = N'debit' AND ISNULL(${debit}, 0) > 0 AND ${accid} <> 1)
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
      ? 'AND ISNULL(L.Credit, 0) > 0 AND L.Accid <> 1'
      : 'AND ISNULL(L.Debit, 0) > 0 AND L.Accid <> 1'

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
    const totalCredit = money(summaryRow.TotalCredit)
    const totalDebit = money(summaryRow.TotalDebit)

    const countReq = pool.request()
    bindListParams(countReq, parsed.data)
    countReq.input('sort', sql.NVarChar(10), sort)
    const countResult = await countReq.query(`
      WITH Tx AS (
        SELECT
          L.Trid,
          L.Dated,
          L.Type,
          L.VNo,
          L.RefNo,
          L.Debit,
          L.Credit,
          L.Description,
          L.Accid,
          A.AccName
        FROM dbo.Leger L
        INNER JOIN dbo.AccReg A ON A.Accid = L.Accid
        INNER JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
        WHERE ${STATUS_SQL}
      ),
      ${voucherKeysCte()}
      SELECT COUNT(*) AS TotalVouchers FROM VoucherRank
    `)
    const total = money(countResult.recordset[0]?.TotalVouchers)

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
          L.SlipType,
          L.Cash,
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
      ),
      ${voucherKeysCte()},
      PagedVouchers AS (
        SELECT Dated, VNo, Type, VoucherRn
        FROM VoucherRank
        WHERE VoucherRn > @offset AND VoucherRn <= @offset + @limit
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
        Tx.SlipType,
        Tx.Cash,
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
        U.Type AS UserType,
        pv.VoucherRn
      FROM Tx
      INNER JOIN PagedVouchers pv
        ON Tx.Dated = pv.Dated AND Tx.VNo = pv.VNo AND Tx.Type = pv.Type
      LEFT JOIN dbo.UserReg U ON U.UserId = Tx.UserId
      WHERE (
        @kind = N'all'
        OR (@kind = N'credit' AND ISNULL(Tx.Credit, 0) > 0 AND Tx.Accid <> 1)
        OR (@kind = N'debit' AND ISNULL(Tx.Debit, 0) > 0 AND Tx.Accid <> 1)
      )
      ORDER BY
        pv.VoucherRn,
        CASE
          WHEN ISNULL(Tx.Debit, 0) > 0 AND ISNULL(Tx.Credit, 0) = 0 THEN 0
          WHEN ISNULL(Tx.Credit, 0) > 0 AND ISNULL(Tx.Debit, 0) = 0 THEN 1
          ELSE 2
        END,
        Tx.Trid ASC
    `)

    const transactions = listResult.recordset.map((row) => mapRow(row, kind))

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

/**
 * Delete a voucher: debit + credit pair (and type-specific related tables).
 * Body: { trid, password } — admin password required; wrong password blocks delete.
 */
transactionRouter.post('/delete', async (req, res) => {
  const parsed = deleteBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: parsed.error.issues[0]?.message || 'Invalid request',
    })
  }

  const { trid, password } = parsed.data
  const userId = Number(req.user?.id)
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  // Only Administrator may delete — Accountant (e.g. Arsalan) is blocked
  if (req.user?.role !== 'Administrator') {
    return res.status(403).json({
      ok: false,
      message: 'Only Administrator can delete transactions',
    })
  }

  try {
    const pool = await getPool()

    const adminOk = await verifyAdminPassword(pool, password)
    if (!adminOk) {
      return res.status(403).json({ ok: false, message: 'Incorrect admin password' })
    }

    const bizId = await resolveBizId(pool)

    const sourceResult = await pool
      .request()
      .input('trid', sql.Int, trid)
      .input('bizId', sql.Int, bizId)
      .query(`
        SELECT
          L.Trid,
          L.VNo,
          L.Type,
          L.Dated,
          ISNULL(L.Debit, 0) AS Debit,
          ISNULL(L.Credit, 0) AS Credit,
          L.Description,
          L.Accid,
          L.DNo,
          L.RefNo
        FROM dbo.Leger L
        WHERE L.Trid = @trid AND L.BizId = @bizId
      `)

    const source = sourceResult.recordset[0]
    if (!source) {
      return res.status(404).json({ ok: false, message: 'Transaction not found' })
    }

    const type = cleanText(source.Type)
    if (!type) {
      return res.status(400).json({ ok: false, message: 'Transaction type missing' })
    }

    const debit = money(source.Debit)
    const credit = money(source.Credit)
    const dated = source.Dated instanceof Date ? source.Dated : new Date(source.Dated)
    if (Number.isNaN(dated.getTime())) {
      return res.status(400).json({ ok: false, message: 'Transaction date invalid' })
    }

    const vnos = await resolveDeleteVnos(pool, {
      trid: source.Trid,
      vno: source.VNo,
      type,
      dated,
      debit,
      credit,
      bizId,
    })

    if (vnos.length === 0) {
      return res.status(400).json({ ok: false, message: 'Could not resolve voucher number' })
    }

    const primaryVno = Number(source.VNo)
    const amount = debit > 0 ? debit : credit
    const descBits = [
      cleanText(source.Description) || 'Transaction',
      'Debit and Credit pair deleted',
      type,
      `VNo ${vnos.join(',')}`,
    ]
    if (source.DNo != null) descBits.push(`DNo ${source.DNo}`)
    const auditDesc = descBits.join(' — ').slice(0, 1500)
    const auditRef = `${type}-${Number.isFinite(primaryVno) ? primaryVno : vnos[0]}`.slice(0, 50)

    await tryQuery('RecordTB', () =>
      pool
        .request()
        .input('dated', sql.DateTime, dated)
        .input('userId', sql.Int, userId)
        .input('refNo', sql.NVarChar(50), auditRef)
        .input('description', sql.NVarChar(1500), auditDesc)
        .input('debit', sql.Money, debit)
        .input('credit', sql.Money, credit)
        .input('timed', sql.NVarChar(50), new Date().toISOString().slice(0, 19).replace('T', ' '))
        .input('bizId', sql.Int, bizId)
        .query(`
          INSERT INTO dbo.RecordTB (Dated, UserId, RefNo, Description, Debit, Credit, Timed, BizId)
          VALUES (
            CAST(@dated AS date),
            @userId,
            @refNo,
            @description,
            @debit,
            @credit,
            @timed,
            @bizId
          )
        `),
    )

    const useDated = !['Purchases', 'Sales', 'SaleReturn', 'PurchaseReturn'].includes(type)
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    let deletedLegs = 0
    try {
      for (const vno of vnos) {
        deletedLegs += await deleteLegerForVno(transaction, {
          vno,
          type,
          dated,
          bizId,
          useDated,
        })
      }
      await transaction.commit()
    } catch (err) {
      try {
        await transaction.rollback()
      } catch {
        /* ignore */
      }
      throw err
    }

    await runSecondaryDeletes(pool, { type, vnos, dated, bizId })

    const vnoLabel = vnos.length === 1 ? String(vnos[0]) : vnos.join(', ')
    const message = `Debit and Credit entries deleted for V.No ${vnoLabel} (${type}).`

    return res.json({
      ok: true,
      deletedLegs,
      type,
      vnos,
      amount,
      message,
    })
  } catch (err) {
    return dbFail(res, err)
  }
})
