import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from '../toast'
import {
  customerSlug,
  displayText,
  formatFilterDate,
  type Customer,
  type CustomerGroup,
} from './customers'
import { applyDateRange, DateRangeFilter, MenuFilter } from './filters'
import { CustomerDetailsPage } from './CustomerDetailsPage'
import { PkrValue } from './customerDetails/ui'
import { CustomerMark } from './icons'
import { LoadingHint } from './loading'
import {
  CUSTOMER_BATCH,
  CUSTOMER_CHUNK,
  loadCustomerGroups,
  loadCustomerListPage,
  peekCustomerGroups,
  peekCustomerList,
  type CustomerListParams,
} from './pageCache'
import { panel } from './styles'

type Props = {
  searchQuery?: string
  txPath: string
}

export function CustomersPage({ searchQuery = '' }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams<{ slug?: string }>()
  const listPath = location.pathname.startsWith('/accountant')
    ? '/accountant/customers'
    : '/customers'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [type, setType] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const params: CustomerListParams = useMemo(
    () => ({
      q: debouncedQuery.trim(),
      dateFrom,
      dateTo,
      type,
    }),
    [debouncedQuery, dateFrom, dateTo, type],
  )
  const seeded = peekCustomerList(params)
  const [fetched, setFetched] = useState<Customer[]>(() => seeded?.customers ?? [])
  const [total, setTotal] = useState(() => seeded?.total ?? 0)
  const [visible, setVisible] = useState(() => Math.min(CUSTOMER_CHUNK, seeded?.customers.length ?? 0))
  const [loading, setLoading] = useState(() => !seeded)
  const [loadingMore, setLoadingMore] = useState(false)
  const [groups, setGroups] = useState<CustomerGroup[]>(() => peekCustomerGroups() ?? [])
  const inflight = useRef(false)
  const fetchedRef = useRef(fetched)
  const totalRef = useRef(total)
  const afterFiveMobileRef = useRef<HTMLLIElement | null>(null)
  const afterFiveDesktopRef = useRef<HTMLTableRowElement | null>(null)
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null)
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchedRef.current = fetched
  }, [fetched])
  useEffect(() => {
    totalRef.current = total
  }, [total])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(searchQuery), 200)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    const ac = new AbortController()
    loadCustomerGroups()
      .then(setGroups)
      .catch(() => {
        if (!ac.signal.aborted) toast.error('Could not load account types')
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (slug) return
    const cached = peekCustomerList(params)
    if (cached) {
      setFetched(cached.customers)
      setTotal(cached.total)
      setVisible(Math.min(CUSTOMER_CHUNK, cached.customers.length))
      setLoading(false)
    } else {
      setFetched([])
      setTotal(0)
      setVisible(CUSTOMER_CHUNK)
      setLoading(true)
    }
    inflight.current = true
    loadCustomerListPage(params, 1)
      .then((data) => {
        setFetched(data.customers)
        setTotal(data.total)
        setVisible(Math.min(CUSTOMER_CHUNK, data.customers.length || data.total))
      })
      .catch((err) => {
        if (cached) return
        setFetched([])
        setTotal(0)
        toast.error(err instanceof Error ? err.message : 'Could not load customers')
      })
      .finally(() => {
        inflight.current = false
        setLoading(false)
      })
  }, [params, slug])

  const loadNextBatch = useCallback(async () => {
    if (slug || inflight.current) return
    const have = fetchedRef.current.length
    if (have >= totalRef.current) return
    inflight.current = true
    setLoadingMore(true)
    const nextPage = Math.floor(have / CUSTOMER_BATCH) + 1
    try {
      const data = await loadCustomerListPage(params, nextPage)
      setTotal(data.total)
      setFetched((prev) => {
        const seen = new Set(prev.map((row) => row.accid))
        return [...prev, ...data.customers.filter((row) => !seen.has(row.accid))]
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load more customers')
    } finally {
      inflight.current = false
      setLoadingMore(false)
    }
  }, [params, slug])

  const revealMore = useCallback(() => {
    if (visible >= totalRef.current) return
    const next = visible + CUSTOMER_CHUNK
    if (fetchedRef.current.length < Math.min(next, totalRef.current)) {
      void loadNextBatch()
    }
    setVisible((v) => Math.min(v + CUSTOMER_CHUNK, totalRef.current || v + CUSTOMER_CHUNK))
  }, [visible, loadNextBatch])

  useEffect(() => {
    if (loading || slug) return
    if (fetched.length < total && fetched.length <= visible + CUSTOMER_CHUNK) {
      void loadNextBatch()
    }
  }, [loading, slug, fetched.length, total, visible, loadNextBatch])

  const rows = fetched.slice(0, Math.min(visible, fetched.length))
  const hasMore = visible < total

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const watch = (target: Element | null) => {
      if (!target) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) revealMore()
        },
        { root: null, rootMargin: '220px 0px', threshold: 0.01 },
      )
      observer.observe(target)
      observers.push(observer)
    }
    watch(afterFiveMobileRef.current)
    watch(afterFiveDesktopRef.current)
    watch(mobileSentinelRef.current)
    watch(desktopSentinelRef.current)
    return () => observers.forEach((o) => o.disconnect())
  }, [revealMore, hasMore, rows.length])

  const typeOptions = useMemo(
    () => [
      { value: '', label: 'All types' },
      ...groups
        .filter((g) => g.groupName)
        .map((g) => ({ value: g.groupName, label: g.groupName })),
    ],
    [groups],
  )

  function openCustomer(row: Customer) {
    navigate(`${listPath}/${customerSlug(row)}`, { state: { customer: row } })
  }

  if (slug) {
    return (
      <CustomerDetailsPage
        slug={slug}
        listPath={listPath}
        onBack={() => navigate(listPath)}
      />
    )
  }

  return (
    <>
      <section className={`${panel} relative z-10 overflow-visible rounded-3xl p-4 lg:p-5`} aria-label="Search Account">
        <div className="mb-4 flex flex-col gap-3.5 lg:mb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink lg:text-[1.5rem]">
              Search Account
            </h1>
            <p className="mt-1 mb-0 text-[0.82rem] font-medium text-muted">
              Find and manage accounts.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-2 overflow-visible lg:flex lg:shrink-0 lg:flex-wrap lg:justify-end">
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onFromChange={(next) => {
                const range = applyDateRange('from', next, dateFrom, dateTo)
                setDateFrom(range.from)
                setDateTo(range.to)
              }}
              onToChange={(next) => {
                const range = applyDateRange('to', next, dateFrom, dateTo)
                setDateFrom(range.from)
                setDateTo(range.to)
              }}
            />
            <MenuFilter
              icon="type"
              value={type}
              placeholder="Type"
              ariaLabel="Filter by type"
              onChange={setType}
              options={typeOptions}
            />
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <LoadingHint label="Loading customers…" />
        ) : total === 0 ? (
          <p className="my-10 text-center text-sm font-semibold text-muted">No customers found.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
              {rows.map((row, index) => (
                <li
                  key={row.accid}
                  ref={index % CUSTOMER_CHUNK === 4 ? afterFiveMobileRef : undefined}
                  className="cursor-pointer rounded-2xl border border-line bg-[#fafbfc] p-3.5 shadow-[0_4px_14px_rgba(26,29,33,0.04)]"
                  onClick={() => openCustomer(row)}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(26,29,33,0.1)] ring-1 ring-black/5">
                      <CustomerMark />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[0.92rem] font-extrabold text-ink">{row.name}</p>
                      <p className="mt-2 mb-0 text-[0.78rem] font-medium text-[#4b5563]">
                        {displayText(row.phone)}
                      </p>
                      <p className="mt-1 mb-0 text-[0.72rem] font-semibold text-muted">
                        {row.createdAt ? formatFilterDate(row.createdAt) : '—'} · {displayText(row.type)}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <p
                          className={`m-0 text-[0.82rem] font-extrabold ${
                            row.currentBalance < 0 ? 'text-debit' : 'text-credit'
                          }`}
                        >
                          <PkrValue value={row.currentBalance} />
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              <div ref={mobileSentinelRef} className="h-4 shrink-0" />
              {loadingMore ? <LoadingHint compact label="Loading more customers…" /> : null}
            </ul>

            <div className="-mx-1 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr>
                    {[
                      'Date',
                      'Customer Name',
                      'Phone',
                      'Group',
                      'Closing Balance',
                      'Opening Balance',
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-line px-2.5 py-3 text-left text-[0.72rem] font-bold tracking-[0.04em] text-muted uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.accid}
                      ref={index % CUSTOMER_CHUNK === 4 ? afterFiveDesktopRef : undefined}
                      className="cursor-pointer hover:bg-[#fcfcfd]"
                      onClick={() => openCustomer(row)}
                    >
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {row.createdAt ? formatFilterDate(row.createdAt) : '—'}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-semibold whitespace-nowrap text-ink">
                        {row.name}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {displayText(row.phone)}
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        {displayText(row.type)}
                      </td>
                      <td
                        className={`border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] font-bold whitespace-nowrap ${
                          row.currentBalance < 0 ? 'text-debit' : 'text-credit'
                        }`}
                      >
                        <PkrValue value={row.currentBalance} />
                      </td>
                      <td className="border-b border-[#f1f2f4] px-2.5 py-3.5 text-[0.84rem] whitespace-nowrap text-[#374151]">
                        <PkrValue value={row.openingBalance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={desktopSentinelRef} className="h-4" />
              {loadingMore ? <LoadingHint compact label="Loading more customers…" /> : null}
            </div>

            <p className="mt-4 mb-0 border-t border-line pt-4 text-center text-[0.78rem] font-medium text-muted sm:text-left">
              Showing {rows.length} of {total} customers
            </p>
          </>
        )}
      </section>
    </>
  )
}
