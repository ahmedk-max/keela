/* Keela — Assets analytics: portfolio roll-ups and a per-holding cost-basis
   growth chart. Cost-basis only (no prices / no P/L), Qahwa palette. */
import { fmt, fmtDate, monthsBetween, NOW_MONTH } from '../lib/format'
import { EChart, hexToRgba } from '../ui/echart'

/* ---------- portfolio helpers ---------- */
export const pfProgress = (p) => (p.target > 0 ? Math.min(100, Math.round((p.value / p.target) * 100)) : 0)
export const pfMonthsLeft = (p) => Math.max(0, monthsBetween(NOW_MONTH, p.targetDate))
export function pfMonthlyNeeded(p) {
  const remain = (p.target || 0) - (p.value || 0)
  if (remain <= 0) return 0
  const m = pfMonthsLeft(p)
  return m > 0 ? Math.ceil(remain / m) : remain
}

/* signed cash effect of one activity entry on a holding's cost basis */
export function entryDelta(e) {
  if (e.type === 'buy' || e.type === 'deposit') return e.amount || 0
  if (e.type === 'sell') return -(e.costRemoved != null ? e.costRemoved : (e.amount || 0))
  if (e.type === 'withdraw') return -(e.amount || 0)
  return 0
}

/* resolve a colour var ('var(--qahwa-espresso)' | '#hex') to a live hex */
function liveHex(color, c) {
  if (!color) return c.accent
  if (color[0] === '#') return color
  const m = color.match(/--qahwa-([a-z]+)/)
  return (m && c[m[1]]) || c.accent
}

/* ---------- Cost-basis growth (ECharts area) ----------
   Rebuilds the running cost basis from the activity log: an opening baseline
   then a step per buy / sell / deposit / withdraw. No target line — a holding's
   goal lives on its portfolio, not the holding. */
export function HoldingChart({ h }) {
  const evs = [...(h.entries || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  if (evs.length < 2) return null

  const net = evs.reduce((s, e) => s + entryDelta(e), 0)
  const opening = Math.max(0, Math.round((h.costBasis || 0) - net))

  const cats = ['Start']
  const vals = [opening]
  let run = opening
  for (const e of evs) { run += entryDelta(e); cats.push(e.date); vals.push(Math.max(0, Math.round(run))) }
  const labels = cats.map((cd, i) => (i === 0 ? 'Opening' : fmtDate(cd)))

  const peak = Math.max(...vals)
  const sig = vals.join(',') + '|' + h.color

  const make = (c) => {
    const color = liveHex(h.color, c)
    return {
      animation: true, animationDuration: 600,
      grid: { left: 1, right: 1, top: 12, bottom: 2 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: c.borderStrong, type: 'dashed' } },
        backgroundColor: c.canvas, borderColor: c.borderStrong, borderWidth: 1, padding: [6, 9],
        textStyle: { color: c.fg1, fontSize: 11 },
        extraCssText: 'border-radius:0;box-shadow:0 2px 10px rgba(28,22,17,0.14);',
        formatter: (ps) => {
          const i = ps[0].dataIndex
          return `<span style="color:${c.fg3};font-size:10px;letter-spacing:.04em">${labels[i]}</span><br/><b>${fmt(ps[0].value)}</b> <span style="color:${c.fg3}">SAR</span>`
        },
      },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: labels },
      yAxis: { type: 'value', show: false, min: 0, max: peak * 1.08 },
      series: [{
        type: 'line', data: vals, smooth: false, showSymbol: false,
        lineStyle: { color, width: 1.75 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: hexToRgba(color, 0.2) }, { offset: 1, color: hexToRgba(color, 0) },
        ] } },
      }],
    }
  }
  return <EChart make={make} sig={sig} height={120} ariaLabel="Cost basis over time" />
}
