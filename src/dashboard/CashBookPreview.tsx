import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '../toast'
import {
  formatCashbookAmount,
  formatCashbookBalance,
  formatCashbookDate,
  type CashbookEntry,
} from './cashbook'
import {
  cashbookTotals,
  exportCashbookPdf,
  groupCashbookEntries,
  isPrinterConnected,
  printCashbookPreview,
  subscribePrinterChanges,
  todayIsoDate,
  voucherHeaderMeta,
  voucherHeaderTitle,
} from './cashbookPrint'
import type { CompanyProfile } from './company'

type Props = {
  open: boolean
  entries: CashbookEntry[]
  company: CompanyProfile
  dateFrom: string
  dateTo: string
  onClose: () => void
}

export function CashBookPreview({ open, entries, company, dateFrom, dateTo, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'pdf' | 'print' | null>(null)
  const busyRef = useRef(busy)
  busyRef.current = busy
  const [printerBlocked, setPrinterBlocked] = useState(false)
  const generated = todayIsoDate()

  const groups = useMemo(() => groupCashbookEntries(entries), [entries])
  const totals = useMemo(() => cashbookTotals(entries), [entries])

  useEffect(() => {
    if (!open) return
    setPrinterBlocked(false)
    setBusy(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose()
    }
    document.addEventListener('keydown', onKey)
    const unsub = subscribePrinterChanges(() => {
      setPrinterBlocked(false)
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      unsub()
    }
  }, [open, onClose])

  if (!open) return null

  async function handlePdf() {
    if (busy) return
    setBusy('pdf')
    setPrinterBlocked(false)
    try {
      await exportCashbookPdf({
        company,
        groups,
        dateFrom,
        dateTo,
        generatedAt: generated,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export PDF')
    } finally {
      setBusy(null)
    }
  }

  async function handlePrint() {
    if (busy) return
    setBusy('print')
    try {
      const probe = await isPrinterConnected()
      if (!probe.connected && probe.source !== 'unknown') {
        setPrinterBlocked(true)
        return
      }
      const sheet = sheetRef.current
      if (!sheet) return
      await printCashbookPreview(sheet)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not print report')
    } finally {
      setBusy(null)
    }
  }

  const rangeLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatCashbookDate(dateFrom) : '…'} – ${dateTo ? formatCashbookDate(dateTo) : '…'}`
      : 'All dates'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5" role="presentation">
      <button
        type="button"
        className="cb-no-print absolute inset-0 border-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close print preview"
        disabled={busy !== null}
        onClick={() => {
          if (!busy) onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cashbook-preview-title"
        className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-[56rem] flex-col overflow-hidden rounded-2xl border border-line bg-[#f4f5f7] shadow-[0_24px_60px_rgba(26,29,33,0.28)] animate-rise"
      >
        <div className="cb-no-print flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-5">
          <div>
            <h2
              id="cashbook-preview-title"
              className="m-0 text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink"
            >
              Print preview
            </h2>
            <p className="mt-0.5 mb-0 text-[0.74rem] font-medium text-muted">
              Web entries · {rangeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePdf()}
              disabled={busy !== null}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[0.65rem] border border-line bg-white px-3.5 text-[0.82rem] font-extrabold text-ink hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === 'pdf' ? 'Exporting…' : 'Export to PDF'}
            </button>
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={busy !== null}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[0.65rem] border-0 bg-fuel px-3.5 text-[0.82rem] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === 'print' ? 'Printing…' : 'Print'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy !== null}
              className="grid size-10 cursor-pointer place-items-center rounded-[0.65rem] border border-line bg-white text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-6 sm:py-5">
          <div
            ref={sheetRef}
            className="mx-auto w-full max-w-[48rem] overflow-hidden rounded-xl border border-line bg-white shadow-[0_8px_28px_rgba(26,29,33,0.06)]"
          >
            <div className="h-1.5 bg-fuel" />
            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start gap-3 border-b border-line pb-4">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-xl border border-line object-cover"
                  />
                ) : (
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-fuel-soft text-[0.95rem] font-extrabold text-[#c99700]">
                    {(company.name || 'C').slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[1.05rem] font-extrabold tracking-[-0.02em] text-navy">
                    {company.name || 'Cash Book'}
                  </p>
                  {company.address ? (
                    <p className="mt-0.5 mb-0 text-[0.78rem] font-medium text-muted">{company.address}</p>
                  ) : null}
                  {company.phone ? (
                    <p className="mt-0.5 mb-0 text-[0.78rem] font-medium text-muted">{company.phone}</p>
                  ) : null}
                </div>
                <div className="hidden text-right sm:block">
                  <p className="m-0 text-[0.68rem] font-bold tracking-[0.06em] text-muted uppercase">
                    Report
                  </p>
                  <p className="mt-0.5 mb-0 text-[0.78rem] font-semibold text-ink">
                    {formatCashbookDate(generated)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="m-0 text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
                    Cash Book
                  </h3>
                  <p className="mt-1 mb-0 text-[0.78rem] font-semibold text-muted">
                    Web entries · Reference type WEB
                  </p>
                </div>
                <p className="m-0 rounded-full bg-[#fafbfc] px-3 py-1 text-[0.74rem] font-bold text-ink">
                  {rangeLabel}
                </p>
              </div>

              {groups.length === 0 ? (
                <p className="mt-8 mb-4 text-center text-[0.88rem] font-semibold text-muted">
                  No web entries to print.
                </p>
              ) : (
                <div className="mt-5 flex flex-col gap-5">
                  {groups.map((group) => (
                    <section key={group.key} className="overflow-hidden rounded-xl border border-line">
                      <div className="border-b border-line bg-[#fff8d9] px-3.5 py-2.5">
                        <p className="m-0 text-[0.92rem] font-extrabold text-navy">
                          {voucherHeaderTitle(group)}
                        </p>
                        <p className="mt-0.5 mb-0 text-[0.72rem] font-semibold text-muted">
                          {voucherHeaderMeta(group) || 'Complete voucher'}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse">
                          <thead>
                            <tr className="bg-[#1a2f4b] text-white">
                              {['Date', 'VNo', 'MVNo', 'Debit', 'Credit', 'Description'].map((h) => (
                                <th
                                  key={h}
                                  className={`px-2.5 py-2 text-left text-[0.66rem] font-bold tracking-[0.05em] uppercase ${
                                    h === 'Debit' || h === 'Credit' ? 'text-right' : ''
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((row) => (
                              <tr key={row.trid} className="border-b border-[#f1f2f4]">
                                <td className="px-2.5 py-2 text-[0.78rem] whitespace-nowrap text-[#374151]">
                                  {formatCashbookDate(row.dated)}
                                </td>
                                <td className="px-2.5 py-2 text-[0.78rem] whitespace-nowrap text-[#374151]">
                                  {row.vno || '—'}
                                </td>
                                <td className="px-2.5 py-2 text-[0.78rem] whitespace-nowrap text-[#374151]">
                                  {row.mvno || '—'}
                                </td>
                                <td className="px-2.5 py-2 text-right text-[0.78rem] whitespace-nowrap tabular-nums text-[#374151]">
                                  {formatCashbookAmount(row.debit)}
                                </td>
                                <td className="px-2.5 py-2 text-right text-[0.78rem] whitespace-nowrap tabular-nums text-[#374151]">
                                  {formatCashbookAmount(row.credit)}
                                </td>
                                <td className="px-2.5 py-2 text-[0.78rem] text-[#374151]">
                                  <span className="font-semibold text-ink">{row.accName}</span>
                                  {row.description ? (
                                    <span>{` · ${row.description}`}</span>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-[#fafbfc]">
                              <td
                                colSpan={3}
                                className="px-2.5 py-2 text-right text-[0.74rem] font-extrabold text-ink"
                              >
                                Voucher total
                              </td>
                              <td className="px-2.5 py-2 text-right text-[0.78rem] font-extrabold tabular-nums text-ink">
                                {formatCashbookBalance(group.debitTotal)}
                              </td>
                              <td className="px-2.5 py-2 text-right text-[0.78rem] font-extrabold tabular-nums text-ink">
                                {formatCashbookBalance(group.creditTotal)}
                              </td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy px-4 py-3 text-white">
                    <span className="text-[0.82rem] font-extrabold tracking-[0.02em]">Grand total</span>
                    <div className="flex flex-wrap gap-5 text-[0.84rem] font-extrabold tabular-nums">
                      <span>Debit {formatCashbookBalance(totals.debit)}</span>
                      <span>Credit {formatCashbookBalance(totals.credit)}</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-5 mb-0 text-center text-[0.68rem] font-semibold tracking-[0.04em] text-muted uppercase">
                Reference type WEB
              </p>
            </div>
          </div>
        </div>
      </div>

      {printerBlocked ? (
        <div className="cb-no-print fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-ink/35"
            aria-label="Close printer message"
            onClick={() => setPrinterBlocked(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="printer-blocked-title"
            className="relative z-10 w-full max-w-[24rem] rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(26,29,33,0.2)] animate-rise"
          >
            <div className="mb-3 grid size-11 place-items-center rounded-xl bg-fuel-soft text-[#c99700]">
              <PrinterIcon />
            </div>
            <h3
              id="printer-blocked-title"
              className="m-0 text-[1.08rem] font-extrabold tracking-[-0.02em] text-ink"
            >
              Printer not connected
            </h3>
            <p className="mt-2 mb-0 text-[0.88rem] font-medium leading-relaxed text-muted">
              No printer is connected to this PC. Please connect a printer, then try Print again. You
              can still export this report as a PDF.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPrinterBlocked(false)}
                className="cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-[#f7f8fa]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrinterBlocked(false)
                  void handlePdf()
                }}
                className="cursor-pointer rounded-xl border-0 bg-fuel px-4 py-2.5 text-[0.85rem] font-bold text-ink"
              >
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V8"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect x="5" y="8" width="14" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 16v4h8v-4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
