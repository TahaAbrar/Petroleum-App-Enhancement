import { KindLedgerPage } from './KindLedgerPage'

type Props = {
  homePath: string
  txPath: string
  searchQuery?: string
}

export function DebitPage({ homePath, searchQuery = '' }: Props) {
  return (
    <KindLedgerPage
      homePath={homePath}
      kind="debit"
      title="Debit"
      subtitle="Customer debit transactions"
      searchQuery={searchQuery}
    />
  )
}
