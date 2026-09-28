import { roundMoney } from '../lib/money.mjs'
/* Keela — Buckets analytics: portfolio-level stats + savings composition.
   Pure helpers shared by the list, the ring cards and the detail page. The
   balance-over-time chart is now an inline SVG built in the detail view itself
   (no ECharts in the "Warm" reskin). */

import { balanceOf } from '../lib/buckets.mjs'

/* ---------- Balance over time ----------
   Rebuilds the running balance from the activity log: an opening baseline (what
   was held before the first logged entry) then a step per deposit / withdrawal /
   spend. Returns the value series + opening/now so the detail view can draw the
   zero-based SVG line (with an optional dashed target reference). */
export function balanceSeries(g) {
  const balance = balanceOf(g)
  const evs = [...(g.entries || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const delta = (e) => (e.type === 'deposit' ? e.amount : -e.amount)
  const net = evs.reduce((s, e) => s + delta(e), 0)
  const opening = roundMoney(balance - net)
  const vals = [opening]
  let run = opening
  for (const e of evs) { run += delta(e); vals.push(roundMoney(run)) }
  return { vals, opening, now: roundMoney(balance) }
}
