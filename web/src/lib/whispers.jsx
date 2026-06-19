/* Keela — whispers: short, derived one-liners in her voice, surfaced inline on the
   data screens. Pure functions over the adapted `data` shape (no storage, no AI).
   Each whisper carries a priority `p`; callers take the most salient few. */
import React from 'react'
import { fmt } from './format'

const DAY = 86400000
const b = (x) => <b>{x}</b>
const plural = (n) => (n === 1 ? '' : 's')

export function whispers(data) {
  const out = []
  const cf = data.cashflow || {}

  // ----- pace this cycle -----
  const variableLeft = (cf.variableBudget || 0) - (cf.variableSpent || 0)
  const daysLeft = cf.cycleEnd
    ? Math.max(0, Math.ceil((new Date(cf.cycleEnd) - new Date()) / DAY))
    : 0
  if (cf.variableBudget > 0) {
    if (variableLeft < 0) {
      out.push({ p: 10, node: <>You&rsquo;re {b(fmt(-variableLeft) + ' SAR')} over the variable budget with {daysLeft} day{plural(daysLeft)} to go.</> })
    } else {
      const perDay = daysLeft > 0 ? Math.round(variableLeft / daysLeft) : variableLeft
      out.push({ p: 4, node: <>{b(fmt(variableLeft) + ' SAR')} left to spend &mdash; about {fmt(perDay)}/day to coast the last {daysLeft} day{plural(daysLeft)}.</> })
    }
  }

  // ----- savings rate vs the pact -----
  if (cf.income > 0) {
    const diff = (cf.rate || 0) - (cf.target || 0)
    if (diff >= 0) out.push({ p: 6, node: <>You&rsquo;re keeping {b(cf.rate + '%')} this cycle &mdash; {diff} point{plural(diff)} above the {cf.target} pact.</> })
    else out.push({ p: 8, node: <>Savings are at {b(cf.rate + '%')}, {Math.abs(diff)} below the {cf.target} pact. Worth a nudge.</> })
  }

  // ----- top category this cycle -----
  const map = {}
  for (const t of (data.cycleTxns || [])) map[t.cat] = (map[t.cat] || 0) + t.amount
  const entries = Object.entries(map).sort((a, x) => x[1] - a[1])
  const totalCat = entries.reduce((s, [, v]) => s + v, 0)
  if (entries.length && totalCat > 0) {
    const [name, amt] = entries[0]
    const share = Math.round((amt / totalCat) * 100)
    out.push({ p: 3, node: <>{b(name)} is your biggest category this cycle at {b(share + '%')} of variable spend.</> })
  }

  // ----- planned outflows before payday -----
  const soon = (data.upcoming || []).filter((u) => u.date && cf.cycleEnd && u.date < cf.cycleEnd)
  if (soon.length) {
    const sum = soon.reduce((s, u) => s + u.amount, 0)
    out.push({ p: 7, node: <>{b(fmt(sum) + ' SAR')} in planned outflows fall before payday &mdash; keep headroom.</> })
  }

  // ----- net-worth move -----
  const snaps = data.snapshots || []
  if (snaps.length > 1) {
    const d = snaps[snaps.length - 1].netWorth - snaps[snaps.length - 2].netWorth
    if (d !== 0) out.push({ p: 2, node: <>Net worth {d > 0 ? 'rose' : 'slipped'} {b(fmt(Math.abs(d)) + ' SAR')} since last month.</> })
  }

  return out.sort((a, x) => x.p - a.p).map((w) => w.node)
}
