// Keela bridge — Firestore access + the same money math the PWA uses.
// Single source of truth is Firestore; this mirrors web/src/data/useKeelaData.js
// so terminal Keela and the app agree on every number.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
// The service-account key lives at the repo root (gitignored). Override with
// GOOGLE_APPLICATION_CREDENTIALS / KEELA_SA_PATH when deployed elsewhere.
const SA_PATH = process.env.KEELA_SA_PATH || resolve(ROOT, 'serviceAccountKey.json')

if (!admin.apps.length) {
  const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(sa) })
}
export const db = admin.firestore()
export const { Timestamp, FieldValue } = admin.firestore

// ---- ISO date helpers ----
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const isoMonth = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const docs = async (col) => (await db.collection(col).get()).docs.map((d) => ({ id: d.id, ...d.data() }))

// Load everything needed for a summary. Data is tiny (single user), so a full read is fine.
export async function loadAll() {
  const [profileSnap, transactions, bills, goals, assets, income] = await Promise.all([
    db.doc('profile/main').get(),
    docs('transactions'),
    docs('bills'),
    docs('goals'),
    docs('assets'),
    docs('income'),
  ])
  const profile = profileSnap.exists ? profileSnap.data() : {}
  return { profile, transactions, bills, goals, assets, income }
}

export const goalBalance = (g) => Math.max(0, (g.allocated || 0) - (g.spent || 0))

// Pay-cycle window: a "month" is payday -> next payday (default 27 -> 27), NOT calendar.
export function cycleWindow(profile, now = new Date()) {
  const payday = profile.payday || 27
  const start = new Date(now.getFullYear(), now.getMonth(), payday)
  if (now.getDate() < payday) start.setMonth(start.getMonth() - 1)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start: isoDate(start), end: isoDate(end), payday }
}

// The full cashflow + net-worth picture, computed exactly like the PWA.
export function computeSummary(raw, now = new Date()) {
  const { profile, transactions, bills, goals, assets, income } = raw
  const saveTarget = profile.split?.save ?? 70

  const { start, end, payday } = cycleWindow(profile, now)
  const cycleTxns = (transactions || []).filter((t) => (t.date || '') >= start && (t.date || '') < end)
  const variableSpent = Math.round(cycleTxns.reduce((s, t) => s + (t.amount || 0), 0))

  const monthlyBills = (bills || []).filter((b) => (b.type || 'monthly') === 'monthly')
  const fixed = Math.round(monthlyBills.filter((b) => !b.isSubscription).reduce((s, b) => s + (b.amount || 0), 0))
  const subs = Math.round(monthlyBills.filter((b) => b.isSubscription).reduce((s, b) => s + (b.amount || 0), 0))

  const recurringIncome = [
    { amount: profile.salary || 0, recurring: true },
    ...(income || []).map((x) => ({ amount: x.amount || 0, recurring: !!x.isRecurring })),
  ]
  const monthlyIncome = recurringIncome.filter((x) => x.recurring).reduce((s, x) => s + x.amount, 0)

  const saved = monthlyIncome - fixed - subs - variableSpent
  const rate = monthlyIncome > 0 ? Math.round((saved / monthlyIncome) * 100) : 0
  const liveBudget = Math.round((monthlyIncome * (100 - saveTarget)) / 100)
  const variableBudget = Math.max(0, liveBudget - fixed - subs) // room for variable spend this cycle
  const variableLeft = variableBudget - variableSpent

  const assetsTotal = (assets || []).reduce((s, a) => s + (a.allocated || 0), 0)
  const savingsBalance = (goals || []).reduce((s, g) => s + goalBalance(g), 0)
  const netWorth = assetsTotal + savingsBalance

  // Pact progress (Oct 2024 -> Oct 2027 by default).
  const pactStart = profile.pactStart || '2024-10'
  const pactEnd = profile.pactEnd || '2027-10'
  const mIdx = (m) => { const [y, mo] = m.split('-').map(Number); return y * 12 + (mo - 1) }
  const pactTotal = Math.max(1, mIdx(pactEnd) - mIdx(pactStart))
  const pactElapsed = Math.min(pactTotal, Math.max(0, mIdx(isoMonth(now)) - mIdx(pactStart)))

  return {
    currency: profile.currency || 'SAR',
    cycle: { start, end, payday },
    income: monthlyIncome, fixed, subs,
    variableSpent, variableBudget, variableLeft,
    saved, savingsRate: rate, pactTarget: saveTarget,
    onTrack: rate >= saveTarget,
    netWorth, assetsTotal, savingsBalance,
    pact: { start: pactStart, end: pactEnd, monthsElapsed: pactElapsed, monthsTotal: pactTotal },
    counts: { goals: (goals || []).length, transactions: (transactions || []).length },
  }
}

// Deterministic memory doc id from a section name (matches the import script's slug style).
export const memSlug = (section) =>
  section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
