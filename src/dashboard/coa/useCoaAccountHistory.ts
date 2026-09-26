import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '../../toast'
import {
  fetchCoaAccountTransactions,
  fetchCoaGroupTransactions,
  type CoaGroupTxSummary,
  type CoaHistoryKind,
  type CoaHistorySort,
  type CoaTransaction,
} from '../chartOfAccounts'

const PAGE = 15
const PREFETCH = 50

const GROUP_PAGE = 30

export type CoaAccountHistoryState = {
  rows: CoaTransaction[]
  total: number
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  emptyRange: boolean
  revealMore: () => void
}

export type CoaGroupHistoryState = CoaAccountHistoryState & {
  summary: CoaGroupTxSummary
}

export function useCoaAccountHistory(
  accid: number | null,
  kind: CoaHistoryKind,
  dateFrom: string,
  dateTo: string,
  sort: CoaHistorySort,
): CoaAccountHistoryState {
  const [fetched, setFetched] = useState<CoaTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [visible, setVisible] = useState(PAGE)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const inflight = useRef(false)
  const fetchedRef = useRef<CoaTransaction[]>([])
  const totalRef = useRef(0)
  const gen = useRef(0)

  useEffect(() => {
    fetchedRef.current = fetched
  }, [fetched])
  useEffect(() => {
    totalRef.current = total
  }, [total])

  useEffect(() => {
    if (!accid) {
      setFetched([])
      setTotal(0)
      setLoading(false)
      return
    }
    const id = ++gen.current
    const ac = new AbortController()
    inflight.current = true
    setLoading(true)
    setFetched([])
    setVisible(PAGE)
    setTotal(0)
    fetchCoaAccountTransactions(
      accid,
      {
        kind,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort,
        offset: 0,
        limit: PAGE,
      },
      ac.signal,
    )
      .then((data) => {
        if (id !== gen.current) return
        setFetched(data.transactions)
        setTotal(data.total)
        setVisible(Math.min(PAGE, data.total))
      })
      .catch((err) => {
        if (ac.signal.aborted || id !== gen.current) return
        setFetched([])
        setTotal(0)
        toast.error(err instanceof Error ? err.message : 'Could not load transactions')
      })
      .finally(() => {
        if (id === gen.current) {
          inflight.current = false
          setLoading(false)
        }
      })
    return () => {
      ac.abort()
      inflight.current = false
    }
  }, [accid, kind, dateFrom, dateTo, sort])

  const loadFromServer = useCallback(
    async (limit: number) => {
      if (!accid || inflight.current) return
      const offset = fetchedRef.current.length
      if (offset >= totalRef.current) return
      inflight.current = true
      setLoadingMore(true)
      try {
        const data = await fetchCoaAccountTransactions(accid, {
          kind,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sort,
          offset,
          limit: Math.min(limit, 50),
        })
        setTotal(data.total)
        setFetched((prev) => {
          const seen = new Set(prev.map((row) => row.trid))
          return [...prev, ...data.transactions.filter((row) => !seen.has(row.trid))]
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load more transactions')
      } finally {
        inflight.current = false
        setLoadingMore(false)
      }
    },
    [accid, kind, dateFrom, dateTo, sort],
  )

  const revealMore = useCallback(() => {
    if (visible >= totalRef.current) return
    const next = visible + PAGE
    if (fetchedRef.current.length < Math.min(next, totalRef.current)) {
      void loadFromServer(PREFETCH)
    }
    setVisible((v) => Math.min(v + PAGE, totalRef.current || v + PAGE))
  }, [visible, loadFromServer])

  useEffect(() => {
    if (loading) return
    void loadFromServer(PREFETCH)
  }, [loading, loadFromServer])

  return {
    rows: fetched.slice(0, Math.min(visible, fetched.length)),
    total,
    loading,
    loadingMore,
    hasMore: visible < total,
    emptyRange: Boolean(dateFrom || dateTo) && !loading && total === 0,
    revealMore,
  }
}

export function useCoaGroupHistory(
  groupId: number | null,
  dateFrom: string,
  dateTo: string,
): CoaGroupHistoryState {
  const [fetched, setFetched] = useState<CoaTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<CoaGroupTxSummary>({ totalDebit: 0, totalCredit: 0 })
  const [visible, setVisible] = useState(GROUP_PAGE)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const inflight = useRef(false)
  const fetchedRef = useRef<CoaTransaction[]>([])
  const totalRef = useRef(0)
  const gen = useRef(0)

  useEffect(() => {
    fetchedRef.current = fetched
  }, [fetched])
  useEffect(() => {
    totalRef.current = total
  }, [total])

  useEffect(() => {
    if (!groupId) {
      setFetched([])
      setTotal(0)
      setSummary({ totalDebit: 0, totalCredit: 0 })
      setLoading(false)
      return
    }
    const id = ++gen.current
    const ac = new AbortController()
    inflight.current = true
    setLoading(true)
    setFetched([])
    setVisible(GROUP_PAGE)
    setTotal(0)
    setSummary({ totalDebit: 0, totalCredit: 0 })
    fetchCoaGroupTransactions(
      groupId,
      {
        kind: 'all',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort: 'oldest',
        offset: 0,
        limit: GROUP_PAGE,
      },
      ac.signal,
    )
      .then((data) => {
        if (id !== gen.current) return
        setFetched(data.transactions)
        setTotal(data.total)
        setSummary(data.summary ?? { totalDebit: 0, totalCredit: 0 })
        setVisible(Math.min(GROUP_PAGE, data.total))
      })
      .catch((err) => {
        if (ac.signal.aborted || id !== gen.current) return
        setFetched([])
        setTotal(0)
        setSummary({ totalDebit: 0, totalCredit: 0 })
        toast.error(err instanceof Error ? err.message : 'Could not load transactions')
      })
      .finally(() => {
        if (id === gen.current) {
          inflight.current = false
          setLoading(false)
        }
      })
    return () => {
      ac.abort()
      inflight.current = false
    }
  }, [groupId, dateFrom, dateTo])

  const loadFromServer = useCallback(async () => {
    if (!groupId || inflight.current) return
    const offset = fetchedRef.current.length
    if (offset >= totalRef.current) return
    inflight.current = true
    setLoadingMore(true)
    try {
      const data = await fetchCoaGroupTransactions(groupId, {
        kind: 'all',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort: 'oldest',
        offset,
        limit: GROUP_PAGE,
      })
      setTotal(data.total)
      if (data.summary) setSummary(data.summary)
      setFetched((prev) => {
        const seen = new Set(prev.map((row) => row.trid))
        return [...prev, ...data.transactions.filter((row) => !seen.has(row.trid))]
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load more transactions')
    } finally {
      inflight.current = false
      setLoadingMore(false)
    }
  }, [groupId, dateFrom, dateTo])

  const revealMore = useCallback(() => {
    if (visible >= totalRef.current) return
    const next = visible + GROUP_PAGE
    if (fetchedRef.current.length < Math.min(next, totalRef.current)) {
      void loadFromServer()
    }
    setVisible((v) => Math.min(v + GROUP_PAGE, totalRef.current || v + GROUP_PAGE))
  }, [visible, loadFromServer])

  return {
    rows: fetched.slice(0, Math.min(visible, fetched.length)),
    total,
    summary,
    loading,
    loadingMore,
    hasMore: visible < total,
    emptyRange: Boolean(dateFrom || dateTo) && !loading && total === 0,
    revealMore,
  }
}
