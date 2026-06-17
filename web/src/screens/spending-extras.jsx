/* Keela — Spending analytics: month-over-month stats, a cumulative pacing chart,
   and a category breakdown. Minimal SVG, Qahwa palette. */
import { fmt, fmtDay } from '../lib/format'
import { CAT } from '../lib/icons'
import { EChart, hexToRgba } from '../ui/echart'

/* ---------- date helpers (ISO YYYY-MM-DD) ---------- */
const D = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const addMonths = (iso, n) => { const dt = D(iso); dt.setMonth(dt.getMonth() + n); return isoOf(dt) }
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000)

function cumulative(txns, startIso, len) {
  const arr = new Array(len).fill(0)
  for (const t of txns) {
    const i = daysBetween(startIso, t.date)
    if (i >= 0 && i < len) arr[i] += t.amount
  }
  for (let i = 1; i < len; i++) arr[i] += arr[i - 1]
  return arr
}

export function spendStats(data) {
  const { txns, cashflow } = data
  const { cycleStart, cycleEnd, variableBudget } = cashflow
  const prevStart = addMonths(cycleStart, -1)
  const len = Math.max(1, daysBetween(cycleStart, cycleEnd))
  const prevLen = Math.max(1, daysBetween(prevStart, cycleStart))

  const cur = txns.filter((t) => t.date >= cycleStart && t.date < cycleEnd)
  const prev = txns.filter((t) => t.date >= prevStart && t.date < cycleStart)

  const curTotal = Math.round(cur.reduce((s, t) => s + t.amount, 0))
  const prevTotal = Math.round(prev.reduce((s, t) => s + t.amount, 0))

  const today = isoOf(new Date())
  const elapsed = Math.min(len, Math.max(1, daysBetween(cycleStart, today) + 1))

  const curCum = cumulative(cur, cycleStart, len)
  const prevCum = cumulative(prev, prevStart, Math.max(len, prevLen))

  // per-day (non-cumulative) spend for the current cycle — drives the column chart
  const curDaily = new Array(len).fill(0)
  for (const t of cur) {
    const i = daysBetween(cycleStart, t.date)
    if (i >= 0 && i < len) curDaily[i] += t.amount
  }
  const prevAtNow = prevCum[Math.min(elapsed - 1, prevCum.length - 1)] || 0
  const paceVal = curCum[elapsed - 1] - prevAtNow // + = spending faster than last cycle

  const dailyAvg = curTotal / elapsed
  const projected = Math.round(dailyAvg * len)

  // category breakdown (current cycle), top 5 + Other
  const map = {}
  for (const t of cur) map[t.cat] = (map[t.cat] || 0) + t.amount
  let cats = Object.entries(map)
    .map(([cat, amount]) => ({ cat, amount: Math.round(amount), color: CAT[cat]?.color || 'var(--qahwa-fg-3)' }))
    .sort((a, b) => b.amount - a.amount)
  if (cats.length > 6) {
    const rest = cats.slice(5).reduce((s, c) => s + c.amount, 0)
    cats = [...cats.slice(0, 5), { cat: 'Other', amount: rest, color: 'var(--qahwa-fg-3)' }]
  }

  return {
    curTotal, prevTotal, budget: variableBudget, len, elapsed, cycleStart, cycleEnd,
    curCum, prevCum, curDaily: curDaily.map(Math.round), prevAtNow, paceVal, dailyAvg, projected, cats,
    daysLeft: Math.max(0, len - elapsed),
  }
}

/* ---------- Daily spend columns (ECharts) ----------
   one column per day of the cycle; dashed line marks the average day. Minimal:
   no axes, transparent. Days past today read fainter. */
export function DailySpendChart({ daily, avg, elapsed, cycleStart }) {
  const len = daily.length
  const start = D(cycleStart)
  const dates = daily.map((_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return fmtDay(isoOf(d)) })
  const maxV = Math.max(...daily, avg, 1)
  const sig = `${daily.join(',')}|${avg}|${elapsed}|${cycleStart}`

  const make = (c) => ({
    animation: true, animationDuration: 600,
    grid: { left: 1, right: 1, top: 10, bottom: 2 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: hexToRgba(c.accent, 0.1) } },
      backgroundColor: c.canvas, borderColor: c.borderStrong, borderWidth: 1, padding: [6, 9],
      textStyle: { color: c.fg1, fontSize: 11 },
      extraCssText: 'border-radius:0;box-shadow:0 2px 10px rgba(28,22,17,0.14);',
      formatter: (ps) => {
        const i = ps[0].dataIndex
        return `<span style="color:${c.fg3};font-size:10px;letter-spacing:.04em">${dates[i]}</span><br/><b>${fmt(ps[0].value)}</b> <span style="color:${c.fg3}">SAR</span>`
      },
    },
    xAxis: { type: 'category', show: false, boundaryGap: true, data: dates },
    yAxis: { type: 'value', show: false, min: 0, max: maxV * 1.08 },
    series: [{
      type: 'bar', barCategoryGap: '36%',
      emphasis: { itemStyle: { color: c.accent } },
      data: daily.map((v, i) => ({
        value: v,
        itemStyle: { color: i + 1 > elapsed ? hexToRgba(c.accent, 0.28) : c.accent },
      })),
      markLine: avg > 0 ? {
        silent: true, symbol: 'none', data: [{ yAxis: avg }],
        lineStyle: { color: c.borderStrong, width: 1, type: 'dashed' }, label: { show: false },
      } : undefined,
    }],
  })
  return <EChart make={make} sig={sig} height={100} ariaLabel="Daily spend this cycle" />
}

/* ---------- Category breakdown bars ---------- */
export function CategoryBars({ cats, total }) {
  if (!cats.length) return null
  const max = cats[0].amount || 1
  return (
    <div className="k-catbars">
      {cats.map((c) => (
        <div className="k-catbar" key={c.cat}>
          <span className="k-catbar-dot" style={{ background: c.color }} />
          <span className="k-catbar-name">{c.cat}</span>
          <span className="k-catbar-track"><i style={{ width: Math.max(2, c.amount / max * 100) + '%', background: c.color }} /></span>
          <span className="k-catbar-val k-num">{fmt(c.amount)}</span>
          <span className="k-catbar-pct">{total ? Math.round(c.amount / total * 100) : 0}%</span>
        </div>
      ))}
    </div>
  )
}
