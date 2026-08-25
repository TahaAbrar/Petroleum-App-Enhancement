import { BAR_DAYS, TREND } from './data'

export function CreditDebitChart() {
  const max = 100
  const chartH = 180
  const chartW = 520
  const padL = 36
  const padB = 36
  const padT = 16
  const groupW = (chartW - padL) / BAR_DAYS.length

  return (
    <svg
      className="block h-auto w-full"
      viewBox={`0 0 ${chartW} ${chartH + padB}`}
      role="img"
      aria-label="Credit vs Debit"
    >
      {[0, 25, 50, 75, 100].map((t) => {
        const y = padT + ((max - t) / max) * chartH
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={chartW} y2={y} className="stroke-[#eef0f3]" strokeWidth={1} />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-[#9ca3af] text-[10px]">
              {t}
            </text>
          </g>
        )
      })}
      {BAR_DAYS.map((d, i) => {
        const x = padL + i * groupW + groupW * 0.22
        const barW = groupW * 0.24
        const creditH = (d.credit / max) * chartH
        const debitH = (d.debit / max) * chartH
        const base = padT + chartH
        const delayCredit = 0.15 + i * 0.08
        const delayDebit = delayCredit + 0.05
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={base - creditH}
              width={barW}
              height={creditH}
              rx="4"
              className="chart-bar fill-fuel"
              style={{ animationDelay: `${delayCredit}s` }}
            />
            <rect
              x={x + barW + 4}
              y={base - debitH}
              width={barW}
              height={debitH}
              rx="4"
              className="chart-bar fill-ink"
              style={{ animationDelay: `${delayDebit}s` }}
            />
            <text
              x={x + barW + 2}
              y={base + 20}
              textAnchor="middle"
              className="chart-axis-label fill-[#9ca3af] text-[10px]"
              style={{ animationDelay: `${delayDebit + 0.1}s` }}
            >
              {d.label.replace('May ', '')}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function BalanceTrendChart() {
  const w = 520
  const h = 200
  const pad = { t: 20, r: 16, b: 36, l: 48 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const min = 30
  const max = 90
  const points = TREND.map((v, i) => {
    const x = pad.l + (i / (TREND.length - 1)) * innerW
    const y = pad.t + ((max - v) / (max - min)) * innerH
    return { x, y }
  })
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},${pad.t + innerH} ${line} ${points[points.length - 1].x},${pad.t + innerH}`

  return (
    <svg className="block h-auto w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Balance Trend">
      {[90, 70, 50, 30].map((t) => {
        const y = pad.t + ((max - t) / (max - min)) * innerH
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} className="stroke-[#eef0f3]" strokeWidth={1} />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-[#9ca3af] text-[10px]">
              {t}k
            </text>
          </g>
        )
      })}
      <polygon points={area} className="chart-area fill-fuel/20" />
      <polyline
        points={line}
        fill="none"
        pathLength={1}
        className="chart-line stroke-fuel"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="5"
          className="chart-dot fill-fuel stroke-white"
          strokeWidth={2}
          style={{ animationDelay: `${0.55 + i * 0.1}s` }}
        />
      ))}
      {BAR_DAYS.map((d, i) => (
        <text
          key={d.label}
          x={pad.l + (i / (BAR_DAYS.length - 1)) * innerW}
          y={h - 10}
          textAnchor="middle"
          className="chart-axis-label fill-[#9ca3af] text-[10px]"
          style={{ animationDelay: `${0.4 + i * 0.06}s` }}
        >
          {d.label.replace('May ', '')}
        </text>
      ))}
    </svg>
  )
}
