import { Router } from 'express'
import { z } from 'zod'
import { getPool, sql } from './db.js'

/**
 * Cash Book APIs — AccReg balances + WEB Leger entries.
 * INSERT only into Leger (parameterized). No UPDATE/DELETE.
 */

export const cashbookRouter = Router()

const VOUCHER_TYPES = [
  'Cash Payment',
  'Cash Received',
  'JV',
  'Online',
  'Cheque',
  'Transfer',
]

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

function roundMoney(value) {
  return Math.round(money(value) * 10000) / 10000
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

async function accountBalance(pool, accid, bizId) {
  const result = await pool
    .request()
    .input('accid', sql.Int, accid)
    .input('bizId', sql.Int, bizId)
    .query(`
      SELECT
        A.Accid,
        A.AccName,
        A.AccNo,
        ISNULL(A.OpBal, 0) + ISNULL((
          SELECT SUM(ISNULL(L.Debit, 0)) - SUM(ISNULL(L.Credit, 0))
          FROM dbo.Leger L
          WHERE L.Accid = A.Accid AND (L.BizId = @bizId OR L.BizId IS NULL)
        ), 0) AS Balance
      FROM dbo.AccReg A
      WHERE A.Accid = @accid
    `)
  return result.recordset[0] || null
}

async function nextVoucherNo(pool) {
  const result = await pool.request().query(`
    SELECT COUNT(VNo) / 2 + 1 AS VNo
    FROM dbo.Leger
    WHERE RefNo = N'WEB'
  `)
  return Math.max(1, Math.floor(money(result.recordset[0]?.VNo)))
}

async function nextDNo(pool, bizId) {
  const result = await pool.request().input('bizId', sql.Int, bizId).query(`
    SELECT ISNULL(MAX(DNo), 0) + 1 AS NewDNo
    FROM dbo.Leger
    WHERE BizId = @bizId
  `)
  return Math.max(1, Math.floor(money(result.recordset[0]?.NewDNo)))
}

async function loadWebEntries(pool) {
  const result = await pool.request().query(`
    SELECT
      L.Trid,
      L.VNo,
      A.AccNo,
      A.AccName,
      G.GroupName,
      L.MVNo,
      L.Debit,
      L.Credit,
      L.Description,
      L.Dated,
      L.Timed,
      L.DNo
    FROM dbo.Leger L
    LEFT JOIN dbo.AccReg A ON A.Accid = L.Accid
    LEFT JOIN dbo.GroupReg G ON G.GroupId = A.GroupId
    WHERE L.RefNo = N'WEB'
    ORDER BY L.Trid DESC
  `)

  return result.recordset.map((row) => ({
    trid: money(row.Trid),
    vno: row.VNo == null ? '' : String(row.VNo),
    accNo: cleanText(row.AccNo) || '—',
    accName: cleanText(row.AccName) || '—',
    groupName: cleanText(row.GroupName) || '—',
    mvno: cleanText(row.MVNo),
    debit: money(row.Debit),
    credit: money(row.Credit),
    description: cleanText(row.Description),
    dno: row.DNo == null ? null : money(row.DNo),
  }))
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

cashbookRouter.get('/meta', async (_req, res) => {
  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const [vno, dno, cash] = await Promise.all([
      nextVoucherNo(pool),
      nextDNo(pool, bizId),
      accountBalance(pool, 1, bizId),
    ])

    if (!cash) {
      return res.status(503).json({ ok: false, message: 'Cash In Hand account not found' })
    }

    return res.json({
      ok: true,
      nextVNo: vno,
      nextDNo: dno,
      bizId,
      cashInHand: {
        accid: money(cash.Accid),
        accNo: cleanText(cash.AccNo),
        name: cleanText(cash.AccName) || 'Cash In Hand',
        balance: money(cash.Balance),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})

cashbookRouter.get('/entries', async (_req, res) => {
  try {
    const pool = await getPool()
    const entries = await loadWebEntries(pool)
    return res.json({ ok: true, entries })
  } catch (err) {
    return dbFail(res, err)
  }
})

const saveSchema = z.object({
  voucherType: z.enum(VOUCHER_TYPES),
  debitAccid: z.coerce.number().int().positive().max(2_147_483_647),
  creditAccid: z.coerce.number().int().positive().max(2_147_483_647),
  description: z.string().trim().min(1).max(500),
  amount: z.coerce.number().positive().max(1_000_000_000_000),
  /** Optional manual voucher ref → Leger.MVNo. VNo is always auto. */
  mvno: z.string().trim().max(50).optional().default(''),
})

cashbookRouter.post('/entries', async (req, res) => {
  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Invalid request' })
  }

  const { voucherType, debitAccid, creditAccid, description, amount, mvno } = parsed.data
  if (debitAccid === creditAccid) {
    return res.status(400).json({ ok: false, message: 'Debit and credit accounts must be different' })
  }

  const userId = Number(req.user?.id)
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  // Enforce Cash Payment / Cash Received account rules on server
  if (voucherType === 'Cash Payment' && creditAccid !== 1) {
    return res.status(400).json({ ok: false, message: 'Cash Payment credit must be Cash In Hand' })
  }
  if (voucherType === 'Cash Received' && debitAccid !== 1) {
    return res.status(400).json({ ok: false, message: 'Cash Received debit must be Cash In Hand' })
  }

  try {
    const pool = await getPool()
    const bizId = await resolveBizId(pool)
    const [debitAcc, creditAcc] = await Promise.all([
      accountBalance(pool, debitAccid, bizId),
      accountBalance(pool, creditAccid, bizId),
    ])

    if (!debitAcc || !creditAcc) {
      return res.status(400).json({ ok: false, message: 'Account not found' })
    }

    const vno = await nextVoucherNo(pool)
    const dno = await nextDNo(pool, bizId)
    const debitName = cleanText(debitAcc.AccName) || '—'
    const creditName = cleanText(creditAcc.AccName) || '—'
    // Store Acc Bal box value as-is (current balance shown on form)
    const debitBal = roundMoney(money(debitAcc.Balance))
    const creditBal = roundMoney(money(creditAcc.Balance))
    const mvnoValue = cleanText(mvno).slice(0, 50)
    const descDebit = `${description} From ${creditName}`.slice(0, 1500)
    const descCredit = `${description} From ${debitName}`.slice(0, 1500)

    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    try {
      const debitReq = new sql.Request(transaction)
      debitReq.input('dated', sql.DateTime, new Date())
      debitReq.input('userId', sql.Int, userId)
      debitReq.input('accid', sql.Int, debitAccid)
      debitReq.input('vno', sql.Int, vno)
      debitReq.input('type', sql.NVarChar(50), 'JV')
      debitReq.input('refNo', sql.NVarChar(50), 'WEB')
      debitReq.input('debit', sql.Money, amount)
      debitReq.input('description', sql.NVarChar(1500), descDebit)
      debitReq.input('mvno', sql.NVarChar(50), mvnoValue)
      debitReq.input('dno', sql.Int, dno)
      debitReq.input('bal', sql.NVarChar(50), String(debitBal))
      debitReq.input('bizId', sql.Int, bizId)
      await debitReq.query(`
        INSERT INTO dbo.Leger (
          Dated, UserId, Accid, VNo, Type, RefNo, Debit, Description, Timed, MVNo, DNo, Bal, BizId
        ) VALUES (
          CAST(@dated AS date),
          @userId,
          @accid,
          @vno,
          @type,
          @refNo,
          @debit,
          @description,
          CAST(GETDATE() AS time),
          @mvno,
          @dno,
          @bal,
          @bizId
        )
      `)

      const creditReq = new sql.Request(transaction)
      creditReq.input('dated', sql.DateTime, new Date())
      creditReq.input('userId', sql.Int, userId)
      creditReq.input('accid', sql.Int, creditAccid)
      creditReq.input('vno', sql.Int, vno)
      creditReq.input('type', sql.NVarChar(50), 'JV')
      creditReq.input('refNo', sql.NVarChar(50), 'WEB')
      creditReq.input('credit', sql.Money, amount)
      creditReq.input('description', sql.NVarChar(1500), descCredit)
      creditReq.input('mvno', sql.NVarChar(50), mvnoValue)
      creditReq.input('dno', sql.Int, dno)
      creditReq.input('bal', sql.NVarChar(50), String(creditBal))
      creditReq.input('bizId', sql.Int, bizId)
      await creditReq.query(`
        INSERT INTO dbo.Leger (
          Dated, UserId, Accid, VNo, Type, RefNo, Credit, Description, Timed, MVNo, DNo, Bal, BizId
        ) VALUES (
          CAST(@dated AS date),
          @userId,
          @accid,
          @vno,
          @type,
          @refNo,
          @credit,
          @description,
          CAST(GETDATE() AS time),
          @mvno,
          @dno,
          @bal,
          @bizId
        )
      `)

      await transaction.commit()
    } catch (err) {
      try {
        await transaction.rollback()
      } catch {
        /* ignore */
      }
      throw err
    }

    const [entries, nextV, nextD, cash] = await Promise.all([
      loadWebEntries(pool),
      nextVoucherNo(pool),
      nextDNo(pool, bizId),
      accountBalance(pool, 1, bizId),
    ])

    return res.json({
      ok: true,
      voucher: { vno, dno, amount },
      nextVNo: nextV,
      nextDNo: nextD,
      cashInHand: cash
        ? {
            accid: money(cash.Accid),
            accNo: cleanText(cash.AccNo),
            name: cleanText(cash.AccName) || 'Cash In Hand',
            balance: money(cash.Balance),
          }
        : null,
      entries,
    })
  } catch (err) {
    return dbFail(res, err)
  }
})
