/* Keela — Buckets analytics: portfolio-level stats + savings composition.
   Pure helpers shared by the list, the ring cards and the detail page. The
   balance-over-time chart is now an inline SVG built in the detail view itself
   (no ECharts in the "Warm" reskin). */
import { monthsBetween, NOW_MONTH } from '../lib/format'

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
  // 70% of total recurring income (matches the Home summary), not just base salary
  const saveBudget = Math.round((profile.monthlyIncome ?? profile.salary ?? 0) * (profile.split?.save || 0) / 100)
  const headroom = saveBudget - requiredMonthly

  return {
    active, paused, ongoing, fundedReady, netSavings, alloc,
    ongoingTarget, ongoingBalance, fundedPct, remaining, requiredMonthly, saveBudget, headroom,
  }
}

/* ---------- Balance over time ----------
   Rebuilds the running balance from the activity log: an opening baseline (what
   was held before the first logged entry) then a step per deposit / withdrawal /
   spend. Returns the value series + opening/now so the detail view can draw the
   zero-based SVG line (with an optional dashed target reference). */
export function balanceSeries(g) {
  const balance = goalBalance(g)
  const evs = [...(g.entries || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const delta = (e) => (e.type === 'deposit' ? e.amount : -e.amount)
  const net = evs.reduce((s, e) => s + delta(e), 0)
  const opening = Math.max(0, Math.round(balance - net))
  const vals = [opening]
  let run = opening
  for (const e of evs) { run += delta(e); vals.push(Math.max(0, Math.round(run))) }
  return { vals, opening, now: Math.round(balance) }
}
