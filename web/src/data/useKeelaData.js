// Live Firestore -> screen-shaped data. Subscribes to every collection (data is
// tiny and single-user, so onSnapshot everywhere) and adapts the raw documents
// into the exact shapes the ported design screens expect (see data.jsx contract).
//
// Derived client-side (DATA_MODEL.md: "computed in the client, not stored"):
//   - netWorth  = sum of asset current balances
//   - thisMonth = income vs (this month's transactions + monthly bills)
//   - snapshots = real history if present, else a single current-month point
import { useEffect, useMemo, useState } from 'react'
import { collection, collectionGroup, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cap, catCode, fmt, NOW_MONTH } from '../lib/format'

const COFFEE = [
  'var(--qahwa-latte)', 'var(--qahwa-brewed)', 'var(--qahwa-espresso)',
  'var(--qahwa-bean)', 'var(--qahwa-flat)', 'var(--qahwa-accent)',
]

const hhmm = (createdAt) => {
  try {
    const d = createdAt && createdAt.toDate ? createdAt.toDate() : null
    if (!d) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

const codeFromName = (name) => {
  const w = (name || '').split(/\s+/).filter(Boolean)
  const c = (w[0]?.[0] || '') + (w[1]?.[0] || w[0]?.[1] || '')
  return c.toUpperCase() || 'GL'
}

const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')

function buildData(raw) {
  // group entries (collectionGroup) back under their parent goal/asset
  const entriesByParent = {}
  for (const e of raw.entries) {
    const parts = e.path.split('/') // e.g. goals/4/entries/1
    const key = parts[0] + '/' + parts[1]
    ;(entriesByParent[key] ||= []).push(e)
  }

  const goals = (raw.goals || []).map((g) => ({
    id: g.id,
    name: g.name,
    target: g.target,
    allocated: g.allocated || 0,
    spent: g.spent || 0,
    status: g.status || 'active',
    color: g.color || 'var(--qahwa-accent)',
    code: codeFromName(g.name),
    targetDate: (g.targetDate || '').slice(0, 7) || NOW_MONTH,
    note: g.note || '',
    entries: (entriesByParent['goals/' + g.id] || [])
      .slice()
      .sort(byDateDesc)
      .map((e) => ({ type: e.type, amount: e.amount, date: (e.date || '').slice(0, 10), note: e.note || '' })),
  }))

  const assets = (raw.assets || []).map((a, i) => ({
    id: a.id,
    name: a.name,
    cat: cap(a.category || 'General'),
    code: catCode(a.category || 'General'),
    invested: a.invested || 0,
    current: a.allocated || 0, // allocated = current balance in the savor model
    color: a.color || COFFEE[i % COFFEE.length],
    goal: a.goal ? `Target ${fmt(a.goal)}` : cap(a.category || ''),
    entries: (entriesByParent['assets/' + a.id] || [])
      .slice()
      .sort(byDateDesc)
      .map((e) => ({
        type: e.type,
        amount: e.type === 'update' || e.type === 'initial' ? e.newBalance : e.amountChange,
        date: (e.date || '').slice(0, 10),
        note: e.note || '',
      })),
  }))

  const assetsTotal = assets.reduce((s, a) => s + a.current, 0)
  const savingsBalance = goals.reduce((s, g) => s + Math.max(0, (g.allocated || 0) - (g.spent || 0)), 0)
  const netWorth = assetsTotal + savingsBalance

  const txns = (raw.transactions || [])
    .map((t) => ({
      id: t.id,
      name: t.name,
      amount: t.amount,
      cat: cap(t.category || 'Other'),
      code: catCode(t.category || 'Other'),
      date: t.date,
      time: hhmm(t.createdAt),
      source: t.source || 'app',
      note: t.notes || '',
    }))
    .sort((a, b) => byDateDesc(a, b) || (b.time || '').localeCompare(a.time || ''))

  const bills = (raw.bills || []).map((b) => ({
    id: b.id,
    name: b.name,
    amount: b.amount,
    cat: cap(b.category || 'Other'),
    code: catCode(b.category || 'Other'),
    type: b.type || 'monthly',
    day: b.billingDay ?? null,
    sub: !!b.isSubscription,
  }))

  const p = raw.profile || {
    salary: 0, payday: 27, split: { save: 70, live: 30 },
    pactStart: '2024-10', pactEnd: '2027-10', currency: 'SAR',
  }

  // Salary lives in profile; other_income are extra streams.
  const income = [
    { id: 'salary', name: 'Salary', amount: p.salary || 0, code: 'SL', recurring: true },
    ...(raw.income || []).map((x) => ({
      id: x.id, name: x.name, amount: x.amount,
      code: catCode(x.name || 'IN'), recurring: !!x.isRecurring,
    })),
  ]

  // Pay-cycle window (payday -> next payday). "Month" = the 27->27 cycle.
  const payday = p.payday || 27
  const today = new Date()
  const cycleStartD = new Date(today.getFullYear(), today.getMonth(), payday)
  if (today.getDate() < payday) cycleStartD.setMonth(cycleStartD.getMonth() - 1)
  const cycleEndD = new Date(cycleStartD)
  cycleEndD.setMonth(cycleEndD.getMonth() + 1)
  const isod = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const cycleStart = isod(cycleStartD)
  const cycleEnd = isod(cycleEndD)

  const cycleTxns = txns.filter((t) => (t.date || '') >= cycleStart && (t.date || '') < cycleEnd)
  const variableSpent = Math.round(cycleTxns.reduce((s, t) => s + t.amount, 0))
  const monthlyBills = bills.filter((b) => b.type === 'monthly')
  const fixed = Math.round(monthlyBills.filter((b) => !b.sub).reduce((s, b) => s + b.amount, 0))
  const subs = Math.round(monthlyBills.filter((b) => b.sub).reduce((s, b) => s + b.amount, 0))
  const monthlyIncome = income.filter((s) => s.recurring).reduce((s, x) => s + x.amount, 0)
  const saveTarget = p.split?.save ?? 70
  const saved = monthlyIncome - fixed - subs - variableSpent
  const rate = monthlyIncome > 0 ? Math.round((saved / monthlyIncome) * 100) : 0
  const liveBudget = Math.round((monthlyIncome * (100 - saveTarget)) / 100) // pact's "live on" share
  const variableBudget = Math.max(0, liveBudget - fixed - subs) // what's left for variable spending

  const cashflow = {
    income: monthlyIncome, fixed, subs, variableSpent, saved, rate, target: saveTarget,
    liveBudget, variableBudget, cycleStart, cycleEnd, payday,
  }
  const thisMonth = {
    income: monthlyIncome,
    spending: fixed + subs + variableSpent,
    kept: Math.max(0, Math.min(100, rate)),
    target: saveTarget,
  }

  let snapshots = (raw.snapshots || [])
    .map((s) => ({ m: s.monthKey, netWorth: s.netWorth, income: s.totalIncome, expenses: s.totalExpenses, savingsRate: s.savingsRate }))
    .sort((a, b) => a.m.localeCompare(b.m))
  if (!snapshots.length) {
    snapshots = [{ m: NOW_MONTH, netWorth, income: monthlyIncome, expenses: thisMonth.spending, savingsRate: thisMonth.kept }]
  }

  const profile = {
    name: 'Ahmed',
    currency: p.currency || 'SAR',
    salary: p.salary || 0,
    payday: p.payday || 27,
    split: p.split || { save: 70, live: 30 },
    pactStart: p.pactStart || '2024-10',
    pactEnd: p.pactEnd || '2027-10',
    netWorth,
  }

  const meetings = (raw.meetings || [])
    .map((m) => ({
      id: m.id,
      date: m.date,
      title: m.title || (m.summary || '').slice(0, 48) || 'Note',
      summary: m.summary || '',
      body: m.body || '',
    }))
    .sort(byDateDesc)

  const memory = (raw.memory || []).map((m) => ({
    id: m.id, section: m.section, private: !!m.private, body: m.body || '',
  }))

  const wishlist = (raw.wishlist || []).map((w) => ({ id: w.id, name: w.name, amount: w.amount }))
  const upcoming = (raw.upcoming || [])
    .map((u) => ({ id: u.id, name: u.name, amount: u.amount, date: u.dueDate }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return {
    profile, txns, goals, assets, bills, income, wishlist, upcoming,
    snapshots, thisMonth, cashflow, cycleTxns, meetings, memory, netWorth, now: NOW_MONTH,
  }
}

const EMPTY = {
  profile: null, transactions: [], bills: [], income: [], goals: [], assets: [],
  wishlist: [], upcoming: [], snapshots: [], meetings: [], memory: [], entries: [],
}

export function useKeelaData(enabled = true) {
  const [raw, setRaw] = useState(EMPTY)

  useEffect(() => {
    if (!enabled) return
    const merge = (patch) => setRaw((r) => ({ ...r, ...patch }))
    const noop = () => {}
    const subCol = (path, key = path) =>
      onSnapshot(collection(db, path), (s) =>
        merge({ [key]: s.docs.map((d) => ({ id: d.id, ...d.data() })) }), noop,
      )

    const unsubs = [
      onSnapshot(doc(db, 'profile', 'main'), (s) =>
        merge({ profile: s.exists() ? { id: s.id, ...s.data() } : null }), noop,
      ),
      subCol('transactions'),
      subCol('bills'),
      subCol('income'),
      subCol('goals'),
      subCol('assets'),
      subCol('wishlist'),
      subCol('upcomingExpenses', 'upcoming'),
      subCol('snapshots'),
      subCol('meetings'),
      subCol('memory'),
      onSnapshot(collectionGroup(db, 'entries'), (s) =>
        merge({ entries: s.docs.map((d) => ({ path: d.ref.path, ...d.data() })) }), noop,
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [enabled])

  const data = useMemo(() => buildData(raw), [raw])
  const loading = enabled ? raw.profile === null : false
  return { data, loading }
}
