import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'
import sql from 'mssql'
import { env } from './config.js'
import { getPool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const SUBS_FILE = path.join(DATA_DIR, 'push-subs.json')
const STATE_FILE = path.join(DATA_DIR, 'push-state.json')
const STAFF_ROLES = new Set(['Administrator', 'Accountant'])
const INTERVAL_MS = 20_000

let lastTrid = 0
let primed = false
let timer = null
let ticking = false
let vapidReady = false

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  ensureDataDir()
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

export function isPushConfigured() {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey)
}

export function getVapidPublicKey() {
  return env.vapidPublicKey
}

function configureWebPush() {
  if (vapidReady || !isPushConfigured()) return vapidReady
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey)
  vapidReady = true
  return true
}

export function loadSubs() {
  const data = readJson(SUBS_FILE, { subscriptions: [] })
  return Array.isArray(data.subscriptions) ? data.subscriptions : []
}

function saveSubs(subs) {
  writeJson(SUBS_FILE, { subscriptions: subs })
}

export function addSubscription(sub) {
  const next = loadSubs().filter((item) => item.endpoint !== sub.endpoint)
  next.push(sub)
  saveSubs(next)
}

export function removeSubscription(endpoint) {
  saveSubs(loadSubs().filter((item) => item.endpoint !== endpoint))
}

function loadState() {
  return readJson(STATE_FILE, { lastTrid: 0 })
}

function saveState(trid) {
  writeJson(STATE_FILE, { lastTrid: trid })
}

async function initLastTrid() {
  const state = loadState()
  const stored = Number(state.lastTrid)
  if (Number.isFinite(stored) && stored > 0) {
    lastTrid = stored
    primed = true
    return
  }
  const pool = await getPool()
  const result = await pool.request().query(`
    SELECT ISNULL(MAX(Trid), 0) AS MaxTrid FROM dbo.Leger
  `)
  lastTrid = Number(result.recordset[0]?.MaxTrid || 0)
  saveState(lastTrid)
  primed = true
}

async function fetchNewRows(sinceTrid) {
  const pool = await getPool()
  const request = pool.request()
  request.input('last', sql.Int, sinceTrid)
  const result = await request.query(`
    SELECT TOP (8)
      Trid, Accid, Debit, Credit, Type, Description
    FROM dbo.Leger
    WHERE Trid > @last
    ORDER BY Trid
  `)
  return result.recordset
}

function formatAmount(row) {
  const debit = Number(row.Debit || 0)
  const credit = Number(row.Credit || 0)
  const amount = debit > 0 ? debit : credit
  return amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function payloadForRow(row) {
  const type = String(row.Type || 'Entry').trim() || 'Entry'
  const desc = String(row.Description || '').trim().slice(0, 80)
  const amount = formatAmount(row)
  return {
    title: 'New entry added',
    body: desc ? `${type} · PKR ${amount} · ${desc}` : `${type} · PKR ${amount}`,
    url: '/transactions',
  }
}

async function sendToStaff(payload) {
  const subs = loadSubs().filter((item) => STAFF_ROLES.has(item.role))
  if (!subs.length) return
  const body = JSON.stringify(payload)
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
          { TTL: 3600 },
        )
      } catch (err) {
        const status = err?.statusCode
        if (status === 404 || status === 410) {
          removeSubscription(sub.endpoint)
        } else {
          console.error('[push] send failed', status || err.message)
        }
      }
    }),
  )
}

async function tick() {
  if (ticking) return
  ticking = true
  try {
    if (!isPushConfigured() || !configureWebPush()) return
    if (!loadSubs().length) return
    if (!primed) {
      await initLastTrid()
      return
    }
    const rows = await fetchNewRows(lastTrid)
    if (!rows.length) return
    for (const row of rows) {
      await sendToStaff(payloadForRow(row))
      lastTrid = Number(row.Trid)
      saveState(lastTrid)
    }
  } catch (err) {
    console.error('[push] tick skipped', err.message)
  } finally {
    ticking = false
  }
}

export function startPushWatcher() {
  if (!isPushConfigured()) {
    console.warn('[push] VAPID keys missing — watcher disabled')
    return
  }
  configureWebPush()
  if (loadSubs().length) {
    initLastTrid().catch((err) => {
      console.error('[push] init last Trid failed', err.message)
    })
  }
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    tick().catch(() => {})
  }, INTERVAL_MS)
  console.log('[push] Leger watcher every 20s')
}
