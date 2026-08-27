import { KindLedgerPage } from './KindLedgerPage'

type Props = {
  homePath: string
  txPath: string
  searchQuery?: string
}

export function CreditPage({ homePath, searchQuery = '' }: Props) {
  return (
    <KindLedgerPage
      homePath={homePath}
      kind="credit"
      title="Credit"
      subtitle="Customer credit transactions"
      searchQuery={searchQuery}
    />
  )
}
