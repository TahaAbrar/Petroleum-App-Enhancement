import { Router } from 'express'
import { z } from 'zod'
import { getPool, sql } from './db.js'

/**
 * Reports APIs — stock statement + ledger.
 * SELECT for lists; Administrator may UPDATE ItemReg.SaleRate.
 */

export const reportsRouter = Router()

const optionalIsoDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .transform((value) => value || undefined)

const optionalAccid = z
  .union([z.literal(''), z.coerce.number().int().positive().max(2_147_483_647)])
  .optional()
  .transform((value) => (value === '' || value == null ? undefined : value))

const filterQuerySchema = z.object({
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
  accid: optionalAccid,
  type: z.string().trim().max(50).optional().default(''),
  product: z.string().trim().max(50).optional().default(''),
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

function formatPkr(value) {
  return money(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

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

function productSql(product) {
  const key = String(product || '').trim().toUpperCase()
  if (!key || key === 'ALL PRODUCTS') return ''
  if (key === 'PMG') return 'AND ISNULL(L.PMG, 0) > 0'
  if (key === 'HSD') return 'AND ISNULL(L.HSD, 0) > 0'
  if (key === 'HO' || key === 'HIGH OCTAN') return 'AND ISNULL(L.HO, 0) > 0'
  if (key === 'CASH') return 'AND ISNULL(L.Cash, 0) > 0'
  if (key === 'OTHER') return 'AND ISNULL(L.Other, 0) > 0'
  return ''
}

function stockProductSql(product) {
  const key = String(product || '').trim()
  if (!key || key.toUpperCase() === 'ALL PRODUCTS') return { sql: '', name: '' }
  if (['CASH', 'OTHER'].includes(key.toUpperCase())) return { sql: '', name: '' }
  return { sql: 'AND I.ItemName = @productName', name: key }
}

function bindFilters(request, { dateFrom, dateTo, accid, type, product, bizId }) {
  request.input('bizId', sql.Int, bizId)
  request.input('hasFrom', sql.Bit, dateFrom ? 1 : 0)
  request.input('hasTo', sql.Bit, dateTo ? 1 : 0)
  request.input('dateFrom', sql.Date, dateFrom || '1900-01-01')
  request.input('dateTo', sql.Date, dateTo || '1900-01-01')
  request.input('hasAccid', sql.Bit, accid ? 1 : 0)
  request.input('accid', sql.Int, accid || 0)
  request.input('hasType', sql.Bit, type ? 1 : 0)
  request.input('type', sql.NVarChar(50), type || '')
  request.input('hasProduct', sql.Bit, product ? 1 : 0)
  request.input('productName', sql.NVarChar(100), product || '')
}

const BASE_WHERE = `
  L.BizId = @bizId
  AND (@hasFrom = 0 OR CAST(L.Dated AS date) >= @dateFrom)
  AND (@hasTo = 0 OR CAST(L.Dated AS date) <= @dateTo)
  AND (@hasAccid = 0 OR L.Accid = @accid)
  AND (@hasType = 0 OR L.Type = @type)
`

const STOCK_WHERE = `
  SL.BizId = @bizId
  AND (@hasFrom = 0 OR CAST(SL.Dated AS date) >= @dateFrom)
  AND (@hasTo = 0 OR CAST(SL.Dated AS date) <= @dateTo)
  AND (@hasAccid = 0 OR SL.Accid = @accid)
  AND (@hasType = 0 OR SL.RefNo = @type)
`

function dbFail(res, err) {
  console.error('[reports] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Reports service temporarily unavailable',
  })
}

reportsRouter.get('/filters', async (_req, res) => {
  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)

    const [typesResult, customersResult, rangeResult, itemsResult] = await Promise.all([
      pool.request().input('bizId', sql.Int, bizId).query(`
        SELECT DISTINCT L.Type
        FROM dbo.Leger L
        WHERE L.BizId = @bizId AND NULLIF(LTRIM(RTRIM(ISNULL(L.Type, N''))), N'') IS NOT NULL
        ORDER BY L.Type
      `),
      pool.request().query(`
        SELECT A.Accid, A.AccName, A.AccNo
        FROM dbo.AccReg A
        ORDER BY A.AccName
      `),
      pool.request().input('bizId', sql.Int, bizId).query(`
        SELECT
          MIN(CAST(L.Dated AS date)) AS MinDate,
          MAX(CAST(L.Dated AS date)) AS MaxDate
        FROM dbo.Leger L
        WHERE L.BizId = @bizId
      `),
      pool.request().query(`
        SELECT ItemId, ItemName FROM dbo.ItemReg ORDER BY ItemName
      `),
    ])

    const range = rangeResult.recordset[0] || {}
    const minDate = range.MinDate instanceof Date ? range.MinDate.toISOString().slice(0, 10) : ''
    const maxDate = range.MaxDate instanceof Date ? range.MaxDate.toISOString().slice(0, 10) : ''

    const itemNames = itemsResult.recordset.map((row) => cleanText(row.ItemName)).filter(Boolean)

    return res.json({
      ok: true,
      types: typesResult.recordset.map((row) => cleanText(row.Type)).filter(Boolean),
      products: [...itemNames, 'Cash', 'Other'],
      items: itemsResult.recordset.map((row) => ({
        itemId: row.ItemId,
        name: cleanText(row.ItemName),
      })),
      customers: customersResult.recordset.map((row) => ({
        accid: row.Accid,
        name: cleanText(row.AccName) || '—',
        accNo: cleanText(row.AccNo),
      })),
      defaultDateFrom: minDate,
      defaultDateTo: maxDate,
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

reportsRouter.get('/stock-statement', async (_req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        I.ItemId,
        I.ItemName,
        ISNULL(SV.Stock, 0) AS Stock,
        ISNULL(I.PrRate, 0) AS LastRate,
        ISNULL(I.SaleRate, 0) AS SaleRate,
        ISNULL(SV.StockValue, 0) AS StockValue
      FROM dbo.ItemReg I
      LEFT JOIN dbo.StockValue SV ON SV.ItemId = I.ItemId
      ORDER BY I.ItemId
    `)

    const items = result.recordset.map((row) => ({
      itemId: money(row.ItemId),
      itemName: cleanText(row.ItemName) || '—',
      stock: money(row.Stock),
      lastRate: money(row.LastRate),
      saleRate: money(row.SaleRate),
      stockValue: money(row.StockValue),
    }))

    const totalStockValue = items.reduce((sum, row) => sum + row.stockValue, 0)

    return res.json({
      ok: true,
      items,
      totalStockValue,
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

const itemIdParamSchema = z.object({
  itemId: z.coerce.number().int().positive().max(2_147_483_647),
})

const saleRateBodySchema = z.object({
  saleRate: z.coerce.number().finite().min(0).max(99_999_999.99),
})

reportsRouter.post('/stock-statement/:itemId/sale-rate', async (req, res) => {
  if (req.user?.role !== 'Administrator') {
    return res.status(403).json({
      ok: false,
      message: 'Only Administrator can update sale rate',
    })
  }

  const params = itemIdParamSchema.safeParse(req.params)
  if (!params.success) {
    return res.status(400).json({ ok: false, message: 'Invalid item id' })
  }

  const body = saleRateBodySchema.safeParse(req.body)
  if (!body.success) {
    return res.status(400).json({
      ok: false,
      message: body.error.issues[0]?.message || 'Invalid sale rate',
    })
  }

  const { itemId } = params.data
  const { saleRate } = body.data

  try {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('itemId', sql.Int, itemId)
      .input('saleRate', sql.Money, saleRate)
      .query(`
        UPDATE dbo.ItemReg
        SET SaleRate = @saleRate
        WHERE ItemId = @itemId
      `)

    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({ ok: false, message: 'Item not found' })
    }

    return res.json({
      ok: true,
      item: { itemId, saleRate },
      message: 'Sale rate updated',
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

function formatLedgerDate(dated) {
  if (!dated) return '—'
  const d = dated instanceof Date ? dated : new Date(dated)
  if (Number.isNaN(d.getTime())) return '—'
  const day = String(d.getUTCDate()).padStart(2, '0')
  const mon = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${mon}/${year}`
}

function formatIsoDate(dated) {
  if (!dated) return ''
  const d = dated instanceof Date ? dated : new Date(dated)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

reportsRouter.get('/stock-statement/:itemId', async (req, res) => {
  const parsed = itemIdParamSchema.safeParse(req.params)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid item id' })
  }

  const { itemId } = parsed.data

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)

    const itemResult = await pool
      .request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT
          I.ItemId,
          I.ItemName,
          ISNULL(B.BrandName, N'') AS BrandName,
          ISNULL(I.PrRate, 0) AS LastRate,
          ISNULL(SV.Stock, 0) AS Stock,
          ISNULL(SV.StockValue, 0) AS StockValue
        FROM dbo.ItemReg I
        LEFT JOIN dbo.BrandReg B ON B.BrandId = I.BrandId
        LEFT JOIN dbo.StockValue SV ON SV.ItemId = I.ItemId
        WHERE I.ItemId = @itemId
      `)

    const itemRow = itemResult.recordset[0]
    if (!itemRow) {
      return res.status(404).json({ ok: false, message: 'Item not found' })
    }

    const ledgerResult = await pool
      .request()
      .input('itemId', sql.Int, itemId)
      .input('bizId', sql.Int, bizId)
      .query(`
        SELECT
          SL.Trid,
          SL.Dated,
          SL.VNo,
          SL.Description,
          SL.SX,
          SL.QtyIn,
          SL.QtyOut,
          SL.RateIn,
          SL.RateOut,
          SL.PrValue,
          SL.RefNo,
          SUM(ISNULL(SL.QtyIn, 0) - ISNULL(SL.QtyOut, 0)) OVER (
            ORDER BY SL.Dated, SL.Trid
            ROWS UNBOUNDED PRECEDING
          ) AS Balance
        FROM dbo.Stockleger SL
        WHERE SL.ItemId = @itemId
          AND (SL.BizId = @bizId OR SL.BizId IS NULL)
        ORDER BY SL.Dated, SL.Trid
      `)

    let totalStockIn = 0
    let totalStockOut = 0
    let minDate = ''
    let maxDate = ''

    const entries = ledgerResult.recordset.map((row) => {
      const qtyIn = money(row.QtyIn)
      const qtyOut = money(row.QtyOut)
      totalStockIn += qtyIn
      totalStockOut += qtyOut

      const iso = formatIsoDate(row.Dated)
      if (iso) {
        if (!minDate || iso < minDate) minDate = iso
        if (!maxDate || iso > maxDate) maxDate = iso
      }

      const rate =
        qtyIn > 0
          ? money(row.RateIn ?? row.PrValue)
          : qtyOut > 0
            ? money(row.RateOut ?? row.PrValue)
            : money(row.PrValue)

      return {
        trid: money(row.Trid),
        date: formatLedgerDate(row.Dated),
        vno: row.VNo == null || row.VNo === '' ? '' : String(row.VNo),
        description: cleanText(row.Description) || '—',
        sx: row.SX == null || row.SX === '' ? null : money(row.SX),
        rate,
        reference: cleanText(row.RefNo) || '—',
        stockIn: qtyIn,
        stockOut: qtyOut,
        balance: money(row.Balance),
      }
    })

    const closingBalance =
      entries.length > 0 ? entries[entries.length - 1].balance : money(itemRow.Stock)

    return res.json({
      ok: true,
      item: {
        itemId: money(itemRow.ItemId),
        itemName: cleanText(itemRow.ItemName) || '—',
        brandName: cleanText(itemRow.BrandName) || '—',
        lastRate: money(itemRow.LastRate),
        stock: money(itemRow.Stock),
        stockValue: money(itemRow.StockValue),
      },
      openingStock: 0,
      dateFrom: minDate,
      dateTo: maxDate,
      entries,
      totals: {
        stockIn: totalStockIn,
        stockOut: totalStockOut,
        closingBalance,
        stockValue: money(itemRow.StockValue),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

reportsRouter.get('/summary', async (req, res) => {
  const parsed = filterQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const { dateFrom, dateTo } = resolveDateRange(parsed.data.dateFrom, parsed.data.dateTo)
  const { accid, type, product } = parsed.data
  const productFilter = productSql(product)

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const request = pool.request()
    bindFilters(request, { dateFrom, dateTo, accid, type, product: '', bizId })

    const result = await request.query(`
      SELECT
        COUNT(*) AS TotalTx,
        SUM(ISNULL(L.Credit, 0)) AS TotalCredit,
        SUM(ISNULL(L.Debit, 0)) AS TotalDebit
      FROM dbo.Leger L
      WHERE ${BASE_WHERE}
      ${productFilter}
    `)

    const row = result.recordset[0] || {}
    const totalCredit = money(row.TotalCredit)
    const totalDebit = money(row.TotalDebit)

    return res.json({
      ok: true,
      summary: {
        totalCredit,
        totalDebit,
        netFlow: totalCredit - totalDebit,
        totalTx: money(row.TotalTx),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

reportsRouter.get('/products', async (req, res) => {
  const parsed = filterQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const { dateFrom, dateTo } = resolveDateRange(parsed.data.dateFrom, parsed.data.dateTo)
  const { accid, type, product } = parsed.data
  const productFilter = productSql(product)
  const stockProduct = stockProductSql(product)

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const request = pool.request()
    bindFilters(request, {
      dateFrom,
      dateTo,
      accid,
      type,
      product: stockProduct.name,
      bizId,
    })

    const stockResult = await request.query(`
      SELECT
        I.ItemId,
        I.ItemName,
        SUM(CASE WHEN ISNULL(SL.QtyIn, 0) > 0
          THEN ISNULL(SL.QtyIn, 0) * ISNULL(SL.RateIn, ISNULL(SL.PrValue, 0)) ELSE 0 END) AS StockIn,
        SUM(CASE WHEN ISNULL(SL.QtyOut, 0) > 0
          THEN ISNULL(SL.QtyOut, 0) * ISNULL(SL.RateOut, ISNULL(SL.PrValue, 0)) ELSE 0 END) AS StockOut,
        MAX(ISNULL(SV.Stock, 0)) AS CurrentStock,
        MAX(ISNULL(SV.StockValue, 0)) AS CurrentStockValue
      FROM dbo.ItemReg I
      LEFT JOIN dbo.Stockleger SL ON SL.ItemId = I.ItemId AND ${STOCK_WHERE}
      LEFT JOIN dbo.StockValue SV ON SV.ItemId = I.ItemId
      WHERE 1 = 1
      ${stockProduct.sql}
      GROUP BY I.ItemId, I.ItemName
      ORDER BY I.ItemName
    `)

    const rows = stockResult.recordset.map((row) => {
      const stockIn = money(row.StockIn)
      const stockOut = money(row.StockOut)
      return {
        product: cleanText(row.ItemName),
        credit: formatPkr(stockIn),
        debit: formatPkr(stockOut),
        net: formatPkr(stockIn - stockOut),
        currentStock: money(row.CurrentStock),
        currentStockValue: formatPkr(row.CurrentStockValue),
      }
    })

    const showLegerExtras =
      !product ||
      product.toUpperCase() === 'ALL PRODUCTS' ||
      ['CASH', 'OTHER'].includes(product.toUpperCase())

    if (showLegerExtras) {
      const legerReq = pool.request()
      bindFilters(legerReq, { dateFrom, dateTo, accid, type, product: '', bizId })

      const legerResult = await legerReq.query(`
        SELECT
          SUM(CASE WHEN ISNULL(L.Cash, 0) > 0 THEN ISNULL(L.Credit, 0) ELSE 0 END) AS Cash_Credit,
          SUM(CASE WHEN ISNULL(L.Cash, 0) > 0 THEN ISNULL(L.Debit, 0) ELSE 0 END) AS Cash_Debit,
          SUM(CASE WHEN ISNULL(L.Other, 0) > 0 THEN ISNULL(L.Credit, 0) ELSE 0 END) AS Other_Credit,
          SUM(CASE WHEN ISNULL(L.Other, 0) > 0 THEN ISNULL(L.Debit, 0) ELSE 0 END) AS Other_Debit
        FROM dbo.Leger L
        WHERE ${BASE_WHERE}
      `)

      const legerRow = legerResult.recordset[0] || {}
      const extras = []

      if (!product || product.toUpperCase() === 'ALL PRODUCTS' || product.toUpperCase() === 'CASH') {
        const credit = money(legerRow.Cash_Credit)
        const debit = money(legerRow.Cash_Debit)
        extras.push({
          product: 'Cash',
          credit: formatPkr(credit),
          debit: formatPkr(debit),
          net: formatPkr(credit - debit),
          currentStock: 0,
          currentStockValue: formatPkr(0),
        })
      }

      if (!product || product.toUpperCase() === 'ALL PRODUCTS' || product.toUpperCase() === 'OTHER') {
        const credit = money(legerRow.Other_Credit)
        const debit = money(legerRow.Other_Debit)
        extras.push({
          product: 'Other',
          credit: formatPkr(credit),
          debit: formatPkr(debit),
          net: formatPkr(credit - debit),
          currentStock: 0,
          currentStockValue: formatPkr(0),
        })
      }

      return res.json({ ok: true, products: [...rows, ...extras] })
    }

    return res.json({ ok: true, products: rows })
  } catch (err) {
    return dbFail(res, err)
  }
})

reportsRouter.get('/recent', async (req, res) => {
  const parsed = filterQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const { dateFrom, dateTo } = resolveDateRange(parsed.data.dateFrom, parsed.data.dateTo)
  const { accid, type, product } = parsed.data
  const productFilter = productSql(product)
  const stockProduct = stockProductSql(product)

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const request = pool.request()
    bindFilters(request, {
      dateFrom,
      dateTo,
      accid,
      type,
      product: stockProduct.name,
      bizId,
    })

    const result = await request.query(`
      SELECT TOP (5)
        L.Trid,
        L.Type,
        L.VNo,
        L.Dated,
        L.Timed,
        L.Debit,
        L.Credit
      FROM dbo.Leger L
      WHERE ${BASE_WHERE}
      ${productFilter}
      ORDER BY L.Trid DESC
    `)

    const transactions = result.recordset.map((row) => {
      const debit = money(row.Debit)
      const credit = money(row.Credit)
      const isCredit = credit > 0 && debit === 0 ? true : credit >= debit
      const amount = isCredit ? credit : debit
      return {
        id: txDisplayId(row.Type, row.VNo, row.Trid),
        when: formatWhen(row.Dated, row.Timed),
        type: isCredit ? 'Credit' : 'Debit',
        amount: formatPkr(amount),
      }
    })

    return res.json({ ok: true, transactions })
  } catch (err) {
    return dbFail(res, err)
  }
})
