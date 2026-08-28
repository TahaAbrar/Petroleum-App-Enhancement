import {
  displayText,
  formatFilterDate,
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
  PkrValue,
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
            Search Account
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
          Back to Search Account
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
              </div>
            </div>
          </div>

          <div className="hidden gap-3 lg:flex">
            <BalanceChip
              label="Opening Balance"
              value={view.openingBalance}
              icon="wallet"
              tone="muted"
            />
            <BalanceChip
              label="Closing Balance"
              value={view.currentBalance}
              icon="wallet"
              tone={view.currentBalance < 0 ? 'debit' : 'credit'}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 lg:hidden">
        <BalanceCard
          label="Opening Balance"
          value={view.openingBalance}
          valueClass="text-ink"
          iconTone="fuel"
        />
        <BalanceCard
          label="Closing Balance"
          value={view.currentBalance}
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
            <InfoIconCard icon="pin" iconTone="sky" label="Account Type / Group" value={displayText(view.type)} />
            <InfoIconCard
              icon="calendar"
              iconTone="sky"
              label="Account Since"
              value={formatFilterDate(view.createdAt)}
            />
            <InfoIconCard
              icon="clipboard"
              iconTone="orange"
              label="Opening Balance"
              valueNode={<PkrValue value={view.openingBalance} amountClass="font-bold" />}
            />
            <InfoIconCard
              icon="down"
              iconTone="credit"
              label="Closing Balance"
              valueNode={
                <PkrValue
                  value={view.currentBalance}
                  amountClass="font-bold"
                  className={view.currentBalance < 0 ? 'text-debit' : 'text-credit'}
                />
              }
            />
          </div>
        </section>

        <aside className={`${panel} rounded-2xl p-4 lg:p-5`} aria-label="Summary">
          <h3 className="mb-3 mt-0 text-[1rem] font-extrabold text-ink lg:mb-4">Summary</h3>
          <div className="flex flex-col gap-2.5">
            <SummaryCard
              label="Total Credit"
              value={detailLoading ? '…' : view.totalCredit}
              isPkr={!detailLoading}
              tone="credit"
              icon="down"
            />
            <SummaryCard
              label="Total Debit"
              value={detailLoading ? '…' : view.totalDebit}
              isPkr={!detailLoading}
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
