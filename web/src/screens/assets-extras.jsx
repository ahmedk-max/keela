/* Keela — Assets helpers ("Warm" reskin). Cost-basis only (SAR, no live prices /
   no P/L): a holding's `invested` equals its `current` balance; "gain" is always
   flat. Portfolios carry a savings-style goal. These pure helpers feed the
   re-skinned Assets screen; charts are SVG <Sparkline> built from `holdingSeries`. */
import { monthsBetween, NOW_MONTH } from '../lib/format'

/* ---------- portfolio helpers ---------- */
export const pfProgress = (p) => (p.target > 0 ? Math.min(100, Math.round((p.value / p.target) * 100)) : 0)
export const pfMonthsLeft = (p) => Math.max(0, monthsBetween(NOW_MONTH, p.targetDate))
export function pfMonthlyNeeded(p) {
  const remain = (p.target || 0) - (p.value || 0)
  if (remain <= 0) return 0
  const m = pfMonthsLeft(p)
  return m > 0 ? Math.ceil(remain / m) : remain
}

/* signed cash effect of one activity entry on a holding's cost basis.
   buy / deposit raise it; withdraw lowers it; sell removes cost at the running
   average (costRemoved), leaving avg cost unchanged. */
export function entryDelta(e) {
  if (e.type === 'buy' || e.type === 'deposit') return e.amount || 0
  if (e.type === 'sell') return -(e.costRemoved != null ? e.costRemoved : (e.amount || 0))
  if (e.type === 'withdraw') return -(e.amount || 0)
  return 0
}

/* ---------- cost-basis balance series (for the SVG Sparkline) ----------
   Rebuilds the running cost basis from the activity log: an opening baseline
   then a step per buy / sell / deposit / withdraw, ending at the live balance. */
export function holdingSeries(h) {
  const evs = [...(h.entries || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const net = evs.reduce((s, e) => s + entryDelta(e), 0)
  const opening = Math.max(0, Math.round((h.costBasis || 0) - net))
  const vals = [opening]
  let run = opening
  for (const e of evs) { run += entryDelta(e); vals.push(Math.max(0, Math.round(run))) }
  return vals
}
