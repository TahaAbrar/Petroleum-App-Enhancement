import {
  displayText,
  formatFilterDate,
  formatPkr,
  type CustomerDetail,
} from '../customers'
import { CustomerMark } from '../icons'
import { panel } from '../styles'
import {
  BackChevron,
  BalanceCard,
  BalanceChip,
  IdChip,
  InfoIconCard,
  MiniStat,
  StatusPill,
  SummaryCard,
} from './ui'

function compactPkr(value: number) {
  return Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

type Props = {
  view: CustomerDetail
  detailLoading: boolean
  onBack: () => void
}

export function CustomerDetailsProfile({ view, detailLoading, onBack }: Props) {
  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent px-0 py-1 text-[0.9rem] font-bold text-[#c99700]"
        >
          <BackChevron />
          Back
        </button>
        <h1 className="m-0 flex-1 text-center text-[1.1rem] font-extrabold tracking-[-0.02em] text-ink pr-12">
          Customer Details
        </h1>
      </div>

      <div className="hidden items-center justify-between gap-3 lg:flex">
        <p className="m-0 text-[0.82rem] font-medium text-muted">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 font-medium text-muted hover:text-ink"
          >
            Customers
          </button>
          <span className="mx-1.5 text-[#c4c9d2]">›</span>
          <span className="font-semibold text-ink">Customer Details</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[0.84rem] font-bold text-ink hover:bg-[#f7f8fa]"
        >
          <BackChevron />
          Back to Customers
        </button>
      </div>

      <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Customer profile">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5 lg:items-center">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-fuel-soft text-[#c99700] lg:size-[4.25rem]">
              <CustomerMark />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-[1.15rem] font-extrabold tracking-[-0.02em] text-ink lg:text-[1.35rem]">
                  {view.name}
                </h2>
                <StatusPill status={view.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <IdChip label="Customer ID" value={displayText(view.id)} accent />
                <IdChip label="CNIC" value={displayText(view.cnic)} />
              </div>
            </div>
          </div>

          <div className="hidden gap-3 lg:flex">
            <BalanceChip
              label="Opening Balance"
              value={formatPkr(view.openingBalance)}
              icon="wallet"
              tone="muted"
            />
            <BalanceChip
              label="Closing Balance"
              value={formatPkr(view.currentBalance)}
              icon="wallet"
              tone={view.currentBalance < 0 ? 'debit' : 'credit'}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 lg:hidden">
        <BalanceCard
          label="Opening Balance"
          value={formatPkr(view.openingBalance)}
          valueClass="text-ink"
          iconTone="fuel"
        />
        <BalanceCard
          label="Closing Balance"
          value={formatPkr(view.currentBalance)}
          valueClass={view.currentBalance < 0 ? 'text-debit' : 'text-credit'}
          iconTone="amber"
        />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            label="Total Credit"
            value={detailLoading ? '…' : compactPkr(view.totalCredit)}
            tone="credit"
          />
          <MiniStat
            label="Total Debit"
            value={detailLoading ? '…' : compactPkr(view.totalDebit)}
            tone="debit"
          />
          <MiniStat
            label="Transactions"
            value={detailLoading ? '…' : String(view.transactionCount)}
            tone="blue"
          />
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1fr_250px] lg:gap-4">
        <section className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Customer information">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">
            Customer Information
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <InfoIconCard icon="user" iconTone="fuel" label="Customer Name" value={view.name} />
            <InfoIconCard icon="phone" iconTone="sky" label="Phone" value={displayText(view.phone)} />
            <InfoIconCard icon="email" iconTone="credit" label="Email" value={displayText(view.email)} />
            <InfoIconCard
              icon="pin"
              iconTone="amber"
              label="Address"
              value={displayText(view.address)}
              className="sm:col-span-2 xl:col-span-2"
            />
            <InfoIconCard
              icon="clipboard"
              iconTone="orange"
              label="Opening Balance"
              value={formatPkr(view.openingBalance)}
            />
            <InfoIconCard
              icon="down"
              iconTone="credit"
              label="Closing Balance"
              value={formatPkr(view.currentBalance)}
              valueTone={view.currentBalance < 0 ? 'debit' : 'credit'}
            />
            <InfoIconCard
              icon="note"
              iconTone="fuel"
              label="Notes"
              value={displayText(view.notes)}
              className="sm:col-span-2 xl:col-span-2"
            />
            <InfoIconCard
              icon="calendar"
              iconTone="sky"
              label="Account Since"
              value={formatFilterDate(view.createdAt)}
            />
          </div>
        </section>

        <aside className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Summary">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">Summary</h3>
          <div className="flex flex-col gap-2.5">
            <SummaryCard
              label="Total Credit"
              value={detailLoading ? '…' : formatPkr(view.totalCredit)}
              tone="credit"
              icon="down"
            />
            <SummaryCard
              label="Total Debit"
              value={detailLoading ? '…' : formatPkr(view.totalDebit)}
              tone="debit"
              icon="up"
            />
            <SummaryCard
              label="Transactions"
              value={detailLoading ? '…' : String(view.transactionCount)}
              tone="blue"
              icon="doc"
            />
          </div>
        </aside>
      </div>
    </>
  )
}
