import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CompanyProfile } from './company'
import {
  formatCashbookBalance,
  formatCashbookDate,
  type CashbookEntry,
} from './cashbook'

export type PrinterProbeSource = 'web-printing' | 'webusb' | 'unknown'

export type PrinterProbe = {
  connected: boolean
  source: PrinterProbeSource
}

export type CashbookParty = {
  accid: number
  accNo: string
  accName: string
  groupName: string
  phone: string
}

export type CashbookAccountGroup = {
  key: string
  vno: string
  mvno: string
  dated: string
  debitAcc: CashbookParty | null
  creditAcc: CashbookParty | null
  rows: CashbookEntry[]
  debitTotal: number
  creditTotal: number
}

type UsbPrinterDevice = {
  deviceClass?: number
  productName?: string
  configuration?: {
    interfaces: Array<{
      alternates: Array<{ interfaceClass: number }>
    }>
  }
}

type UsbApi = {
  getDevices: () => Promise<UsbPrinterDevice[]>
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

type WebPrinter = { name?: string; printerName?: string }

type PrintingManager = {
  getPrinters: () => Promise<WebPrinter[]>
}

const USB_PRINTER_CLASS = 7

function getPrinting(): PrintingManager | null {
  const nav = navigator as Navigator & { printing?: PrintingManager }
  if (!nav.printing || typeof nav.printing.getPrinters !== 'function') return null
  return nav.printing
}

function getUsb(): UsbApi | null {
  const nav = navigator as Navigator & { usb?: UsbApi }
  if (!nav.usb || typeof nav.usb.getDevices !== 'function') return null
  return nav.usb
}

function isUsbPrinter(device: UsbPrinterDevice) {
  if (device.deviceClass === USB_PRINTER_CLASS) return true
  const interfaces = device.configuration?.interfaces ?? []
  for (const iface of interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass === USB_PRINTER_CLASS) return true
    }
  }
  return false
}

/** Probe whether a printer is available to this browser. */
export async function isPrinterConnected(): Promise<PrinterProbe> {
  let listedEmpty = false
  let listedFound = false

  const printing = getPrinting()
  if (printing) {
    try {
      const printers = await printing.getPrinters()
      if (Array.isArray(printers) && printers.length > 0) listedFound = true
      else listedEmpty = true
    } catch {
      /* cannot query */
    }
  }

  let usbFound = false
  const usb = getUsb()
  if (usb) {
    try {
      const devices = await usb.getDevices()
      usbFound = devices.some(isUsbPrinter)
    } catch {
      /* ignore */
    }
  }

  if (listedFound) return { connected: true, source: 'web-printing' }
  if (usbFound) return { connected: true, source: 'webusb' }
  if (listedEmpty) return { connected: false, source: 'web-printing' }
  return { connected: true, source: 'unknown' }
}

export function subscribePrinterChanges(onChange: () => void) {
  const usb = getUsb()
  if (!usb) return () => {}
  usb.addEventListener('connect', onChange)
  usb.addEventListener('disconnect', onChange)
  return () => {
    usb.removeEventListener('connect', onChange)
    usb.removeEventListener('disconnect', onChange)
  }
}

export function filterCashbookEntries(
  entries: CashbookEntry[],
  dateFrom: string,
  dateTo: string,
) {
  const from = dateFrom.trim().slice(0, 10)
  const to = dateTo.trim().slice(0, 10)
  if (!from && !to) return entries
  const start = from || to
  const end = to || from
  return entries.filter((row) => {
    const dated = String(row.dated || '')
      .trim()
      .slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dated)) return false
    if (dated < start) return false
    if (dated > end) return false
    return true
  })
}

function partyFromRow(row: CashbookEntry): CashbookParty {
  return {
    accid: row.accid,
    accNo: row.accNo,
    accName: row.accName,
    groupName: row.groupName,
    phone: row.phone,
  }
}

function partyMeta(party: CashbookParty | null, kind: 'Debit' | 'Credit') {
  if (!party) return ''
  const bits = [
    party.accNo && party.accNo !== '—' ? party.accNo : '',
    party.groupName && party.groupName !== '—' ? party.groupName : '',
    party.phone ? `Ph ${party.phone}` : '',
  ].filter(Boolean)
  const name = party.accName || '—'
  return bits.length ? `${kind} ${name} (${bits.join(' · ')})` : `${kind} ${name}`
}

export function voucherHeaderTitle(group: CashbookAccountGroup) {
  return group.vno ? `Voucher #${group.vno}` : 'Voucher'
}

export function voucherHeaderMeta(group: CashbookAccountGroup) {
  return [
    group.dated ? formatCashbookDate(group.dated) : '',
    group.mvno ? `MVNo ${group.mvno}` : '',
    partyMeta(group.debitAcc, 'Debit'),
    partyMeta(group.creditAcc, 'Credit'),
  ]
    .filter(Boolean)
    .join('  ·  ')
}

export function groupCashbookEntries(entries: CashbookEntry[]): CashbookAccountGroup[] {
  const groups: CashbookAccountGroup[] = []
  const index = new Map<string, CashbookAccountGroup>()
  for (const row of entries) {
    const key = row.vno || `trid:${row.trid}`
    let group = index.get(key)
    if (!group) {
      group = {
        key,
        vno: row.vno,
        mvno: row.mvno,
        dated: row.dated,
        debitAcc: null,
        creditAcc: null,
        rows: [],
        debitTotal: 0,
        creditTotal: 0,
      }
      index.set(key, group)
      groups.push(group)
    }
    group.rows.push(row)
    group.debitTotal += row.debit
    group.creditTotal += row.credit
    if (row.dated && !group.dated) group.dated = row.dated
    if (row.mvno && !group.mvno) group.mvno = row.mvno
    if (row.debit > 0 && !group.debitAcc) group.debitAcc = partyFromRow(row)
    if (row.credit > 0 && !group.creditAcc) group.creditAcc = partyFromRow(row)
  }
  for (const group of groups) {
    group.rows.sort((a, b) => {
      if ((a.debit > 0) !== (b.debit > 0)) return a.debit > 0 ? -1 : 1
      return 0
    })
  }
  return groups
}

export function cashbookTotals(entries: CashbookEntry[]) {
  let debit = 0
  let credit = 0
  for (const row of entries) {
    debit += row.debit
    credit += row.credit
  }
  return { debit, credit }
}

export function todayIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function waitForImages(doc: Document) {
  const images = Array.from(doc.images)
  if (images.length === 0) return Promise.resolve()
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
}

export async function printCashbookPreview(sheet: HTMLElement) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    throw new Error('Could not open print preview')
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n')

  doc.open()
  doc.write(`<!DOCTYPE html><html><head>
    <title>Cash Book</title>
    ${styles}
    <style>
      @page { size: A4; margin: 12mm; }
      html, body { background: #fff !important; margin: 0; }
      .cb-no-print { display: none !important; }
    </style>
  </head><body>${sheet.outerHTML}</body></html>`)
  doc.close()

  await waitForImages(doc)
  await new Promise((r) => window.setTimeout(r, 50))
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  window.setTimeout(() => iframe.remove(), 1500)
}

function pdfMoney(value: number) {
  if (!value) return ''
  return formatCashbookBalance(value)
}

function logoFormat(logoUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (logoUrl.includes('image/png')) return 'PNG'
  if (logoUrl.includes('image/webp')) return 'WEBP'
  return 'JPEG'
}

export async function exportCashbookPdf(opts: {
  company: CompanyProfile
  groups: CashbookAccountGroup[]
  dateFrom: string
  dateTo: string
  generatedAt?: string
}) {
  const { company, groups, dateFrom, dateTo } = opts
  const generated = opts.generatedAt || todayIsoDate()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 14

  const navy: [number, number, number] = [26, 47, 75]
  const gold: [number, number, number] = [245, 197, 24]
  const ink: [number, number, number] = [26, 29, 33]
  const muted: [number, number, number] = [107, 114, 128]

  doc.setFillColor(...gold)
  doc.rect(0, 0, pageWidth, 3.2, 'F')

  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, logoFormat(company.logoUrl), margin, y, 16, 16)
    } catch {
      /* skip broken logo */
    }
  }

  const textX = company.logoUrl ? margin + 20 : margin
  doc.setTextColor(...navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(company.name || 'Cash Book', textX, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...muted)
  const details = [company.address, company.phone].filter(Boolean)
  if (details.length) doc.text(details.join('  ·  '), textX, y + 12)

  y += 24
  doc.setDrawColor(236, 238, 242)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  doc.setTextColor(...ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Cash Book', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  const rangeLabel =
    dateFrom || dateTo
      ? `Date range: ${dateFrom ? formatCashbookDate(dateFrom) : '…'} – ${dateTo ? formatCashbookDate(dateTo) : '…'}`
      : 'All dates'
  doc.text(`Web entries  ·  RefNo WEB  ·  ${rangeLabel}  ·  Generated ${formatCashbookDate(generated)}`, margin, y)
  y += 8

  if (groups.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...muted)
    doc.text('No web entries to print.', margin, y + 6)
  }

  let grandDebit = 0
  let grandCredit = 0

  for (const group of groups) {
    grandDebit += group.debitTotal
    grandCredit += group.creditTotal
    if (y > 250) {
      doc.addPage()
      y = 16
    }
    const meta = voucherHeaderMeta(group)
    const metaLines = meta ? doc.splitTextToSize(meta, pageWidth - margin * 2 - 8) : []
    const headerH = 8 + (metaLines.length ? metaLines.length * 4 + 2 : 0)
    doc.setFillColor(255, 246, 214)
    doc.roundedRect(margin, y, pageWidth - margin * 2, headerH, 1.5, 1.5, 'F')
    doc.setTextColor(...navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(voucherHeaderTitle(group), margin + 3, y + 5)
    if (metaLines.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...muted)
      doc.text(metaLines, margin + 3, y + 9.5)
    }
    y += headerH + 2

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'VNo', 'MVNo', 'Debit', 'Credit', 'Description']],
      body: group.rows.map((row) => [
        formatCashbookDate(row.dated),
        row.vno || '—',
        row.mvno || '—',
        pdfMoney(row.debit),
        pdfMoney(row.credit),
        [row.accName, row.description].filter(Boolean).join(' · ') || '—',
      ]),
      foot: [
        [
          { content: 'Voucher total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          formatCashbookBalance(group.debitTotal),
          formatCashbookBalance(group.creditTotal),
          '',
        ],
      ],
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 1.6,
        textColor: ink,
        lineColor: [236, 238, 242],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: navy,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      footStyles: {
        fillColor: [250, 251, 252],
        textColor: ink,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 16 },
        2: { cellWidth: 18 },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 'auto' },
      },
      didParseCell(data) {
        if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
          data.cell.styles.halign = 'right'
        }
      },
    })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    y += 8
  }

  if (groups.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 16
    }
    doc.setFillColor(...navy)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Grand total', margin + 4, y + 8.5)
    doc.setFontSize(10)
    const debitLabel = `Debit  ${formatCashbookBalance(grandDebit)}`
    const creditLabel = `Credit  ${formatCashbookBalance(grandCredit)}`
    doc.text(creditLabel, pageWidth - margin - 4, y + 8.5, { align: 'right' })
    doc.text(debitLabel, pageWidth - margin - 52, y + 8.5, { align: 'right' })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(
      `Reference type WEB  ·  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 7,
      { align: 'center' },
    )
  }

  doc.save(`CashBook-WEB-${generated}.pdf`)
}
