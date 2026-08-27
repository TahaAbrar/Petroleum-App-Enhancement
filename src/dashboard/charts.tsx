import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { BalanceTrendPoint, CreditDebitPoint } from './dashboard'
import { formatPkrAmount } from './customers'

/** Placeholder bars so animation can start before the API responds. */
const PLACEHOLDER_CREDIT_DEBIT: CreditDebitPoint[] = [
  { label: '21', credit: 62, debit: 38 },
  { label: '22', credit: 78, debit: 45 },
  { label: '23', credit: 55, debit: 70 },
  { label: '24', credit: 88, debit: 42 },
  { label: '25', credit: 70, debit: 58 },
  { label: '26', credit: 95, debit: 48 },
  { label: '27', credit: 82, debit: 65 },
]

const PLACEHOLDER_TREND: BalanceTrendPoint[] = [
  { label: '21', value: 42 },
  { label: '22', value: 48 },
  { label: '23', value: 45 },
  { label: '24', value: 58 },
  { label: '25', value: 62 },
  { label: '26', value: 70 },
  { label: '27', value: 78 },
]

/** Matches CSS: bar ~0.7s + delays; line ~1.55s total */
const BAR_ANIM_MS = 1200
const LINE_ANIM_MS = 1600

function shortLabel(label: string) {
  const parts = label.trim().split(/\s+/)
  if (parts.length >= 2 && /^\d{1,2}$/.test(parts[0])) return parts[0]
  return label.length > 8 ? label.slice(0, 7) : label
}

function niceMax(values: number[]) {
  const peak = Math.max(...values.map((v) => Math.abs(v)), 1)
  const magnitude = 10 ** Math.floor(Math.log10(peak))
  return Math.ceil(peak / magnitude) * magnitude
}

function formatAxis(value: number, compact = false) {
  if (!compact) return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`
  return String(Math.round(value))
}

/**
 * Show placeholder + CSS animation immediately.
 * Fetch real data in the background; after the intro animation ends, swap to live data
 * (re-keyed so the grow / draw animation plays again on the real values).
 */
function useAnimatedChartData<T>(
  live: T[] | null,
  placeholder: T[],
  animMs: number,
  resetKey?: string | number,
) {
  const [display, setDisplay] = useState<T[]>(placeholder)
  const [animKey, setAnimKey] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'live'>('intro')

  useEffect(() => {
    setDisplay(placeholder)
    setPhase('intro')
    setAnimKey((k) => k + 1)
    const timer = window.setTimeout(() => {
      setPhase('live')
    }, animMs)
    return () => window.clearTimeout(timer)
  }, [resetKey, animMs, placeholder])

  useEffect(() => {
    if (phase !== 'live' || live == null) return
    setDisplay(live)
    setAnimKey((k) => k + 1)
  }, [phase, live])

  return { display, animKey }
}

type CreditDebitProps = {
  data: CreditDebitPoint[]
  loading?: boolean
}

export function CreditDebitChart({ data, loading }: CreditDebitProps) {
  const live = !loading && data.length > 0 ? data : null
  const { display: points, animKey } = useAnimatedChartData(
    live,
    PLACEHOLDER_CREDIT_DEBIT,
    BAR_ANIM_MS,
  )

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const max = niceMax(points.flatMap((d) => [d.credit, d.debit]))
  const chartH = 180
  const chartW = 520
  const padL = 44
  const padB = 36
  const padT = 16
  const groupW = (chartW - padL) / Math.max(points.length, 1)
  const svgH = chartH + padB

  const bars = useMemo(
    () =>
      points.map((d, i) => {
        const x = padL + i * groupW + groupW * 0.22
        const barW = groupW * 0.24
        const creditH = max > 0 ? (d.credit / max) * chartH : 0
        const debitH = max > 0 ? (d.debit / max) * chartH : 0
        const base = padT + chartH
        const centerX = x + barW + 2
        return {
          ...d,
          x,
          barW,
          creditH,
          debitH,
          base,
          centerX,
          tipY: base - Math.max(creditH, debitH, 8),
        }
      }),
    [points, max, groupW, chartH, padL, padT],
  )

  function nearestIndex(clientX: number) {
    const el = wrapRef.current
    if (!el || bars.length === 0) return null
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return null
    const svgX = ((clientX - rect.left) / rect.width) * chartW
    let best = 0
    let bestDist = Math.abs(bars[0].centerX - svgX)
    for (let i = 1; i < bars.length; i++) {
      const dist = Math.abs(bars[i].centerX - svgX)
      if (dist < bestDist) {
        best = i
        bestDist = dist
      }
    }
    return best
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const next = nearestIndex(e.clientX)
    setHoverIdx((prev) => (next === prev ? prev : next))
  }

  function onLeave() {
    setHoverIdx(null)
  }

  useEffect(() => {
    setHoverIdx(null)
  }, [animKey])

  const hover = hoverIdx != null ? bars[hoverIdx] : null
  const tipPct =
    hover && chartW > 0
      ? {
          left: `${(hover.centerX / chartW) * 100}%`,
          top: `${(hover.tipY / svgH) * 100}%`,
        }
      : null

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <svg
        key={animKey}
        className="block h-auto w-full"
        viewBox={`0 0 ${chartW} ${svgH}`}
        role="img"
        aria-label="Credit vs Debit"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const tick = max * (1 - t)
          const y = padT + t * chartH
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={chartW} y2={y} className="stroke-[#eef0f3]" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-[#9ca3af] text-[10px]">
                {formatAxis(tick, true)}
              </text>
            </g>
          )
        })}
        {bars.map((d, i) => {
          const delayCredit = 0.15 + i * 0.08
          const delayDebit = delayCredit + 0.05
          const active = hoverIdx === i
          return (
            <g key={`${d.label}-${i}`}>
              {active ? (
                <line
                  x1={d.centerX}
                  y1={padT}
                  x2={d.centerX}
                  y2={d.base}
                  className="stroke-[#d1d5db]"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              ) : null}
              <rect
                x={d.x}
                y={d.base - d.creditH}
                width={d.barW}
                height={Math.max(d.creditH, 0)}
                rx="4"
                className={`chart-bar fill-fuel ${active ? 'opacity-100' : ''}`}
                style={{ animationDelay: `${delayCredit}s` }}
              />
              <rect
                x={d.x + d.barW + 4}
                y={d.base - d.debitH}
                width={d.barW}
                height={Math.max(d.debitH, 0)}
                rx="4"
                className={`chart-bar fill-ink ${active ? 'opacity-100' : ''}`}
                style={{ animationDelay: `${delayDebit}s` }}
              />
              <text
                x={d.centerX}
                y={d.base + 20}
                textAnchor="middle"
                className="chart-axis-label fill-[#9ca3af] text-[10px]"
                style={{ animationDelay: `${delayDebit + 0.1}s` }}
              >
                {shortLabel(d.label)}
              </text>
            </g>
          )
        })}
      </svg>

      {hover && tipPct ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-line bg-white px-3 py-2 shadow-[0_10px_24px_rgba(26,29,33,0.14)]"
          style={{ left: tipPct.left, top: tipPct.top }}
        >
          <p className="m-0 text-[0.68rem] font-semibold text-muted">{hover.label}</p>
          <p className="mt-1 mb-0 whitespace-nowrap text-[0.78rem] font-bold tabular-nums text-ink">
            <span className="inline-block size-1.5 rounded-sm bg-fuel align-middle" />{' '}
            Credit:{' '}
            <span className="font-extrabold">{formatPkrAmount(hover.credit)}</span>{' '}
            <span className="font-normal text-muted">PKR</span>
          </p>
          <p className="mt-0.5 mb-0 whitespace-nowrap text-[0.78rem] font-bold tabular-nums text-ink">
            <span className="inline-block size-1.5 rounded-sm bg-ink align-middle" />{' '}
            Debit:{' '}
            <span className="font-extrabold">{formatPkrAmount(hover.debit)}</span>{' '}
            <span className="font-normal text-muted">PKR</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}

type BalanceTrendProps = {
  data: BalanceTrendPoint[]
  loading?: boolean
  rangeKey?: string
}

export function BalanceTrendChart({ data, loading, rangeKey = '7d' }: BalanceTrendProps) {
  const live = !loading && data.length > 0 ? data : null
  const { display: points, animKey } = useAnimatedChartData(
    live,
    PLACEHOLDER_TREND,
    LINE_ANIM_MS,
    rangeKey,
  )

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const w = 520
  const h = 200
  const pad = { t: 20, r: 16, b: 36, l: 52 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const values = points.map((p) => p.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const span = max - min || 1

  const coords = useMemo(
    () =>
      points.map((p, i) => {
        const x = pad.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
        const y = pad.t + ((max - p.value) / span) * innerH
        return { x, y, label: p.label, value: p.value }
      }),
    [points, innerW, innerH, max, min, span, pad.l, pad.t],
  )

  const line = coords.map((p) => `${p.x},${p.y}`).join(' ')
  const area =
    coords.length > 0
      ? `${coords[0].x},${pad.t + innerH} ${line} ${coords[coords.length - 1].x},${pad.t + innerH}`
      : ''

  function nearestIndex(clientX: number) {
    const el = wrapRef.current
    if (!el || coords.length === 0) return null
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return null
    const svgX = ((clientX - rect.left) / rect.width) * w
    let best = 0
    let bestDist = Math.abs(coords[0].x - svgX)
    for (let i = 1; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - svgX)
      if (dist < bestDist) {
        best = i
        bestDist = dist
      }
    }
    return best
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const next = nearestIndex(e.clientX)
    setHoverIdx((prev) => (next === prev ? prev : next))
  }

  function onLeave() {
    setHoverIdx(null)
  }

  useEffect(() => {
    setHoverIdx(null)
  }, [animKey, rangeKey])

  const hover = hoverIdx != null ? coords[hoverIdx] : null
  const tipPct =
    hover && w > 0
      ? {
          left: `${(hover.x / w) * 100}%`,
          top: `${(hover.y / h) * 100}%`,
        }
      : null

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <svg
        key={animKey}
        className="block h-auto w-full"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Balance Trend"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const tick = max - span * t
          const y = pad.t + t * innerH
          return (
            <g key={t}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} className="stroke-[#eef0f3]" strokeWidth={1} />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-[#9ca3af] text-[10px]">
                {formatAxis(tick, true)}
              </text>
            </g>
          )
        })}
        {area ? <polygon points={area} className="chart-area fill-fuel/20" /> : null}
        {line ? (
          <polyline
            points={line}
            fill="none"
            pathLength={1}
            className="chart-line stroke-fuel"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {coords.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 6.5 : 5}
            className={`chart-dot fill-fuel stroke-white ${hoverIdx === i ? 'opacity-100' : ''}`}
            strokeWidth={2}
            style={{ animationDelay: `${0.55 + i * 0.1}s` }}
          />
        ))}
        {hover ? (
          <line
            x1={hover.x}
            y1={pad.t}
            x2={hover.x}
            y2={pad.t + innerH}
            className="stroke-[#d1d5db]"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : null}
        {coords.map((p, i) => (
          <text
            key={`${p.label}-${i}`}
            x={p.x}
            y={h - 10}
            textAnchor="middle"
            className="chart-axis-label fill-[#9ca3af] text-[10px]"
            style={{ animationDelay: `${0.4 + i * 0.06}s` }}
          >
            {shortLabel(p.label)}
          </text>
        ))}
      </svg>

      {hover && tipPct ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-line bg-white px-3 py-2 shadow-[0_10px_24px_rgba(26,29,33,0.14)]"
          style={{ left: tipPct.left, top: tipPct.top }}
        >
          <p className="m-0 text-[0.68rem] font-semibold text-muted">{hover.label}</p>
          <p
            className={`mt-0.5 mb-0 whitespace-nowrap text-[0.82rem] font-extrabold tabular-nums ${
              hover.value < 0 ? 'text-debit' : 'text-ink'
            }`}
          >
            {formatPkrAmount(hover.value)}{' '}
            <span className="font-normal text-muted">PKR</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
