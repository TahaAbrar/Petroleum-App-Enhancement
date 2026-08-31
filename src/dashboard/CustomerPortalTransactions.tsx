import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HistoryKind, HistorySort } from './customers'
import { CustomerHistoryPanel } from './customerDetails/HistoryPanel'
import { BackChevron } from './customerDetails/ui'
import { usePortalHistory } from './usePortalHistory'

type Props = {
  homePath: string
}

export function CustomerPortalTransactions({ homePath }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<HistoryKind>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<HistorySort>('recent')
  const history = usePortalHistory(tab, dateFrom, dateTo, sort)

  function handleTab(next: HistoryKind) {
    if (next === tab) return
    setDateFrom('')
    setDateTo('')
    setTab(next)
  }

  const emptyMessage = history.emptyRange
    ? 'No transactions in this date range'
    : 'No records found.'

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => navigate(homePath)}
          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent px-0 py-1 text-[0.9rem] font-bold text-[#c99700]"
        >
          <BackChevron />
          Back
        </button>
        <h1 className="m-0 flex-1 pr-12 text-center text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink">
          My Transactions
        </h1>
      </div>

      <div className="hidden items-center justify-between gap-3 lg:flex">
        <div>
          <p className="m-0 text-[0.82rem] font-medium text-muted">
            <button
              type="button"
              onClick={() => navigate(homePath)}
              className="cursor-pointer border-0 bg-transparent p-0 font-medium text-muted hover:text-ink"
            >
              My Account
            </button>
            <span className="mx-1.5 text-[#c4c9d2]">›</span>
            <span className="font-semibold text-ink">My Transactions</span>
          </p>
          <h1 className="mt-1 mb-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink">
            My Transactions
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(homePath)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
        >
          <BackChevron />
          Back to My Account
        </button>
      </div>

      <CustomerHistoryPanel
        history={history}
        tab={tab}
        sort={sort}
        dateFrom={dateFrom}
        dateTo={dateTo}
        emptyMessage={emptyMessage}
        onTab={handleTab}
        onSort={setSort}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
      />
    </div>
  )
}
