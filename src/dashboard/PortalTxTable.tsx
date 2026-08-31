import type { RefObject } from 'react'
import { formatPkrAmount } from './customers'
import { LoadingHint } from './loading'
import type { PortalTransaction } from './portal'
import { panel } from './styles'

type Props = {
  rows: PortalTransaction[]
  openingBalance?: number
  showOpening?: boolean
  loading?: boolean
  emptyMessage?: string
  afterFiveMobileRef?: RefObject<HTMLLIElement | null>
  afterFiveDesktopRef?: RefObject<HTMLTableRowElement | null>
  mobileSentinelRef?: RefObject<HTMLDivElement | null>
  desktopSentinelRef?: RefObject<HTMLDivElement | null>
  loadingMore?: boolean
  onPrefetch?: () => void
}

function cell(value: string | number) {
  const s = String(value ?? '').trim()
  return s || ''
}

function Money({
  value,
  tone,
  hideZero = true,
}: {
  value: number
  tone?: 'debit' | 'credit' | 'balance'
  hideZero?: boolean
}) {
  if (hideZero && !value) return null
  const cls =
    tone === 'debit' ? 'text-debit' : tone === 'credit' ? 'text-credit' : 'font-bold text-ink'
  return <span className={cls}>{formatPkrAmount(value)}</span>
}

const th =
  'border border-[#c5c9d2] bg-[#eef0f3] px-2 py-2 text-center text-[0.78rem] font-extrabold text-ink'
const td = 'border border-[#c5c9d2] px-2 py-2 align-top text-[0.82rem] text-ink'

export function PortalTxTable({
  rows,
  openingBalance = 0,
  showOpening = true,
  loading = false,
  emptyMessage = 'No records found.',
  afterFiveMobileRef,
  afterFiveDesktopRef,
  mobileSentinelRef,
  desktopSentinelRef,
  loadingMore = false,
  onPrefetch,
}: Props) {
  return (
    <div
      className={`${panel} overflow-hidden rounded-2xl`}
      onFocus={onPrefetch}
      onPointerEnter={onPrefetch}
    >
      {/* Mobile */}
      <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
        {showOpening ? (
          <li className="border-b border-[#ECEEF2] bg-linear-to-r from-fuel via-[#ffe58a] to-[#fff3c0] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-[0.9rem] font-extrabold text-ink">Opening Balance</p>
              <p className="m-0 text-[0.9rem] font-extrabold text-ink">
                {formatPkrAmount(openingBalance)}
              </p>
            </div>
          </li>
        ) : null}
        {rows.map((row, index) => (
          <li
            key={row.trid}
            ref={index === 4 ? afterFiveMobileRef : undefined}
            className="flex flex-col gap-1.5 border-b border-[#ECEEF2] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-[0.78rem] font-bold text-muted">{row.date || row.when}</p>
                <p className="mt-1 mb-0 whitespace-pre-wrap text-[0.84rem] font-semibold leading-snug text-ink">
                  {row.description || row.product || '—'}
                </p>
              </div>
              <div className="shrink-0 text-right text-[0.72rem] font-semibold text-muted">
                <p className="m-0">Ticket {cell(row.ticket) || '0'}</p>
                <p className="mt-0.5 mb-0">V.No {cell(row.vno) || '0'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.78rem]">
              <span className="font-semibold text-debit">
                Dr {row.debit ? formatPkrAmount(row.debit) : '—'}
              </span>
              <span className="font-semibold text-credit">
                Cr {row.credit ? formatPkrAmount(row.credit) : '—'}
              </span>
              <span className="font-extrabold text-ink">Running Bal {formatPkrAmount(row.balance)}</span>
            </div>
          </li>
        ))}
        {loading && (
          <li className="px-4 py-3">
            <LoadingHint label="Loading transactions…" />
          </li>
        )}
        {!loading && rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm font-medium text-muted">{emptyMessage}</li>
        )}
        {loadingMore ? (
          <li className="px-4 py-2">
            <LoadingHint compact label="Loading more…" />
          </li>
        ) : null}
        <div ref={mobileSentinelRef} className="h-4 shrink-0" />
      </ul>

      {/* Desktop ledger */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr>
              <th className={`${th} w-[9%]`}>Date</th>
              <th className={`${th} w-[38%]`}>Descriptions</th>
              <th className={`${th} w-[9%]`}>Ticket #</th>
              <th className={`${th} w-[8%]`}>V.No</th>
              <th className={`${th} w-[12%]`}>Debit</th>
              <th className={`${th} w-[12%]`}>Credit</th>
              <th className={`${th} w-[12%]`}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {showOpening ? (
              <tr className="bg-linear-to-r from-fuel via-[#ffe58a] to-[#fff3c0]">
                <td className={td} />
                <td className={`${td} font-extrabold`}>Opening Balance</td>
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={`${td} text-right font-extrabold`}>
                  {formatPkrAmount(openingBalance)}
                </td>
              </tr>
            ) : null}
            {rows.map((row, index) => (
              <tr
                key={row.trid}
                ref={index === 4 ? afterFiveDesktopRef : undefined}
                className="bg-white"
              >
                <td className={`${td} whitespace-nowrap text-center`}>{row.date || '—'}</td>
                <td className={`${td} whitespace-pre-wrap leading-snug`}>
                  {row.description || row.product || '—'}
                </td>
                <td className={`${td} text-center`}>{cell(row.ticket) || '0'}</td>
                <td className={`${td} text-center`}>{cell(row.vno) || '0'}</td>
                <td className={`${td} text-right`}>
                  <Money value={row.debit} tone="debit" />
                </td>
                <td className={`${td} text-right`}>
                  <Money value={row.credit} tone="credit" />
                </td>
                <td className={`${td} text-right`}>
                  <Money value={row.balance} tone="balance" hideZero={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-4">
            <LoadingHint label="Loading transactions…" />
          </div>
        )}
        {!loading && rows.length === 0 && (
          <p className="py-8 text-center text-sm font-medium text-muted">{emptyMessage}</p>
        )}
        {loadingMore ? (
          <div className="p-3">
            <LoadingHint compact label="Loading more…" />
          </div>
        ) : null}
        <div ref={desktopSentinelRef} className="h-4 shrink-0" />
      </div>
    </div>
  )
}
