import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '../toast'
import {
  fetchCustomerBySlug,
  type Customer,
  type CustomerDetail,
  type HistoryKind,
  type HistorySort,
} from './customers'
import { CustomerHistoryPanel } from './customerDetails/HistoryPanel'
import { CustomerDetailsProfile } from './customerDetails/Profile'
import { useCustomerHistory } from './customerDetails/useCustomerHistory'

type Props = {
  slug: string
  listPath: string
  onBack: () => void
}

export function CustomerDetailsPage({ slug, listPath, onBack }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const preview = (location.state as { customer?: Customer } | null)?.customer
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [tab, setTab] = useState<HistoryKind>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<HistorySort>('recent')
  const history = useCustomerHistory(detail?.accid ?? null, tab, dateFrom, dateTo, sort)

  useEffect(() => {
    const ac = new AbortController()
    setDetailLoading(true)
    fetchCustomerBySlug(slug, ac.signal)
      .then((customer) => {
        setDetail(customer)
        if (customer.slug && customer.slug !== slug) {
          navigate(`${listPath}/${customer.slug}`, { replace: true, state: location.state })
        }
      })
      .catch((err) => {
        if (ac.signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Could not load customer details')
        navigate(listPath)
      })
      .finally(() => {
        if (!ac.signal.aborted) setDetailLoading(false)
      })
    return () => ac.abort()
  }, [slug, listPath, navigate, location.state])

  const view: CustomerDetail = detail ?? {
    accid: preview?.accid ?? 0,
    id: preview?.id ?? '—',
    slug: preview?.slug ?? slug,
    name: preview?.name ?? 'Loading…',
    phone: preview?.phone ?? '',
    email: preview?.email ?? '',
    cnic: preview?.cnic ?? '',
    address: preview?.address ?? '',
    notes: preview?.notes ?? '',
    currentBalance: preview?.currentBalance ?? 0,
    openingBalance: preview?.openingBalance ?? 0,
    status: preview?.status ?? 'Active',
    type: preview?.type ?? '',
    createdAt: preview?.createdAt ?? '',
    totalCredit: 0,
    totalDebit: 0,
    transactionCount: 0,
  }

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
      <CustomerDetailsProfile view={view} detailLoading={detailLoading} onBack={onBack} />
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
