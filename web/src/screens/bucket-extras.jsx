/* Keela — Buckets analytics: portfolio-level stats, savings composition, and a
   per-bucket contribution-growth chart. Minimal ECharts, Qahwa palette. */
import { fmt, fmtDate, monthsBetween, NOW_MONTH } from '../lib/format'
import { EChart, hexToRgba } from '../ui/echart'

/* ---------- per-goal helpers (shared with the list + cards) ---------- */
export function monthsLeft(g) { return Math.max(0, monthsBetween(NOW_MONTH, g.targetDate)) }
export function monthlyNeeded(g) {
  const remain = g.target - (g.allocated - (g.spent || 0))
  if (remain <= 0) return 0
  const m = monthsLeft(g)
  return m > 0 ? Math.ceil(remain / m) : remain
}
export const goalBalance = (g) => Math.max(0, (g.allocated || 0) - (g.spent || 0))

/* ---------- portfolio roll-up (over whatever subset of goals is passed) ---------- */
export function bucketStats(goals, profile) {
  const active = goals.filter((g) => g.status === 'active')
  const paused = goals.filter((g) => g.status === 'paused')
  const ongoing = [...active, ...paused]
  const fundedReady = goals.filter((g) => g.status === 'completed') // completed & untouched here

  const netSavings = goals.reduce((s, g) => s + goalBalance(g), 0)

  // composition of money currently held — biggest bucket first
  const alloc = goals
    .map((g) => ({ cat: g.name, amount: Math.round(goalBalance(g)), color: g.color }))
    .filter((a) => a.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const ongoingTarget = ongoing.reduce((s, g) => s + g.target, 0)
  const ongoingBalance = ongoing.reduce((s, g) => s + goalBalance(g), 0)
  const fundedPct = ongoingTarget > 0 ? Math.round((ongoingBalance / ongoingTarget) * 100) : 0
  const remaining = ongoing.reduce((s, g) => s + Math.max(0, g.target - goalBalance(g)), 0)

  const requiredMonthly = active.reduce((s, g) => s + monthlyNeeded(g), 0)
  const saveBudget = Math.round((profile.salary || 0) * (profile.split?.save || 0) / 100)
  const headroom = saveBudget - requiredMonthly

  return {
    active, paused, ongoing, fundedReady, netSavings, alloc,
    ongoingTarget, ongoingBalance, fundedPct, remaining, requiredMonthly, saveBudget, headroom,
  }
}

/* resolve a goal's colour var ('var(--qahwa-espresso)' | '#hex') to a live hex */
function goalHex(color, c) {
  if (!color) return c.accent
  if (color[0] === '#') return color
  const m = color.match(/--qahwa-([a-z]+)/)
  return (m && c[m[1]]) || c.accent
}

/* ---------- Contribution growth (ECharts area) ----------
   Rebuilds the running balance from the activity log: an opening baseline (what
   was held before the first logged entry) then a step per deposit / withdrawal /
   spend, with the target drawn as a dashed reference line. */
export function ContributionChart({ g }) {
  const balance = goalBalance(g)
  const evs = [...(g.entries || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  if (!evs.length) return null

  const delta = (e) => (e.type === 'deposit' ? e.amount : -e.amount)
  const net = evs.reduce((s, e) => s + delta(e), 0)
  const opening = Math.max(0, Math.round(balance - net))

  const cats = ['Start']
  const vals = [opening]
  let run = opening
  for (const e of evs) { run += delta(e); cats.push(e.date); vals.push(Math.max(0, Math.round(run))) }
  const labels = cats.map((cd, i) => (i === 0 ? 'Opening balance' : fmtDate(cd)))

  const peak = Math.max(...vals, g.target)
  const sig = vals.join(',') + '|' + g.target + '|' + g.color
  const funded = g.status === 'completed' || balance >= g.target

  const make = (c) => {
    const color = goalHex(g.color, c)
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
        type: 'line', data: vals, smooth: false, showSymbol: false, silent: false,
        lineStyle: { color, width: 1.75 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: hexToRgba(color, 0.2) }, { offset: 1, color: hexToRgba(color, 0) },
        ] } },
        markLine: g.target > 0 && !funded ? {
          silent: true, symbol: 'none', data: [{ yAxis: g.target }],
          lineStyle: { color: c.borderStrong, width: 1, type: 'dashed' },
          label: { show: true, position: 'insideEndTop', formatter: 'Target',
            color: c.fg3, fontSize: 9, letterSpacing: 0.04 },
        } : undefined,
      }],
    }
  }
  return <EChart make={make} sig={sig} height={120} ariaLabel="Contribution growth" />
}
