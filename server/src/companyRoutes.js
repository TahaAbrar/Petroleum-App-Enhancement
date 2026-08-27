import { Router } from 'express'
import { getPool } from './db.js'

/**
 * Company profile — SELECT only from CompanyPro.
 * Never returns WebUser / WebPass.
 */
export const companyRouter = Router()

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function logoDataUrl(raw) {
  if (raw == null) return null
  try {
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
    if (!buf.length) return null
    const hex = buf.slice(0, 4).toString('hex')
    let mime = 'image/jpeg'
    if (hex.startsWith('89504e47')) mime = 'image/png'
    else if (hex.startsWith('47494638')) mime = 'image/gif'
    else if (hex.startsWith('424d')) mime = 'image/bmp'
    else if (hex.startsWith('ffd8')) mime = 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function dbFail(res, err) {
  console.error('[company] db error', err.message)
  return res.status(503).json({
    ok: false,
    message: 'Company service temporarily unavailable',
  })
}

companyRouter.get('/', async (_req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT TOP (1)
        CompanyName,
        CompanyAddress,
        CompanyPh,
        CompanyLogo
      FROM dbo.CompanyPro
    `)
    const row = result.recordset[0]
    if (!row) {
      return res.json({
        ok: true,
        company: {
          name: 'FuelLedger',
          address: '',
          phone: '',
          logoUrl: null,
        },
      })
    }
    return res.json({
      ok: true,
      company: {
        name: cleanText(row.CompanyName) || 'FuelLedger',
        address: cleanText(row.CompanyAddress),
        phone: cleanText(row.CompanyPh),
        logoUrl: logoDataUrl(row.CompanyLogo),
      },
    })
  } catch (err) {
    return dbFail(res, err)
  }
})
