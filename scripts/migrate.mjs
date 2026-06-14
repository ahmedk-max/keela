// One-shot migration: savor.db (SQLite) -> Firestore.
// Reads each table via the `sqlite3 -json` CLI (no native deps), transforms to the
// Keela data model (docs/DATA_MODEL.md), and writes with firebase-admin.
//
// Idempotent: old integer PKs become the Firestore doc id, so re-running overwrites
// rather than duplicating. Run:  node scripts/migrate.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DB = process.env.SAVOR_DB || '/Users/ahmed/Documents/Projects/Savor/data/savor.db'
const KEY = process.env.SA_KEY || resolve(ROOT, 'serviceAccountKey.json')

const serviceAccount = JSON.parse(readFileSync(KEY, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()
const { Timestamp } = admin.firestore

const table = (name) => {
  const out = execFileSync('sqlite3', ['-json', DB, `select * from ${name}`], {
    encoding: 'utf8',
  }).trim()
  return out ? JSON.parse(out) : []
}
const ts = (text) => {
  if (!text) return Timestamp.now()
  const d = new Date(String(text).replace(' ', 'T'))
  return isNaN(d.getTime()) ? Timestamp.now() : Timestamp.fromDate(d)
}
const dateOnly = (text) => (text ? String(text).slice(0, 10) : null)
const bool = (v) => Boolean(v)

// Simple batched writer (auto-commits every 400 ops).
let batch = db.batch()
let ops = 0
const pending = []
const set = (path, data) => {
  batch.set(db.doc(path), data)
  if (++ops >= 400) {
    pending.push(batch.commit())
    batch = db.batch()
    ops = 0
  }
}
const flush = async () => {
  if (ops > 0) pending.push(batch.commit())
  await Promise.all(pending)
}

const counts = {}
const mark = (k, n) => (counts[k] = n)

async function main() {
  const cash = table('cashflow')[0] || { salary: 0 }
  set('profile/main', {
    currency: 'SAR',
    salary: cash.salary ?? 0,
    payday: 27,
    split: { save: 70, live: 30 },
    pactStart: '2024-10',
    pactEnd: '2027-10',
    updatedAt: ts(cash.updated_at),
  })

  const income = table('other_income')
  for (const r of income)
    set(`income/${r.id}`, {
      name: r.name,
      amount: r.amount,
      icon: r.icon ?? null,
      isRecurring: bool(r.is_recurring),
      createdAt: ts(r.created_at),
    })
  mark('income', income.length)

  const bills = table('expenses')
  for (const r of bills)
    set(`bills/${r.id}`, {
      name: r.name,
      amount: r.amount,
      category: r.category,
      type: r.type ?? 'monthly',
      isSubscription: bool(r.is_subscription),
      billingDay: r.billing_day ?? null,
      notes: r.notes ?? null,
      icon: r.icon ?? null,
      createdAt: ts(r.created_at),
    })
  mark('bills', bills.length)

  const txns = table('expense_logs')
  for (const r of txns)
    set(`transactions/${r.id}`, {
      name: r.name,
      amount: r.amount,
      category: r.category,
      date: dateOnly(r.date),
      icon: r.icon ?? null,
      notes: r.notes ?? null,
      source: 'app',
      createdAt: ts(r.created_at),
    })
  mark('transactions', txns.length)

  const goals = table('savings_goals')
  for (const r of goals)
    set(`goals/${r.id}`, {
      name: r.name,
      target: r.target,
      allocated: r.allocated ?? 0,
      spent: r.spent ?? 0,
      status: r.status ?? 'active',
      targetDate: r.target_date ?? null,
      icon: r.icon ?? null,
      color: r.color ?? null,
      createdAt: ts(r.created_at),
    })
  mark('goals', goals.length)

  const goalLogs = table('goal_logs')
  for (const r of goalLogs)
    set(`goals/${r.goal_id}/entries/${r.id}`, {
      type: r.type,
      amount: r.amount,
      note: r.note ?? null,
      date: dateOnly(r.date),
    })
  mark('goal entries', goalLogs.length)

  const assets = table('assets')
  for (const r of assets)
    set(`assets/${r.id}`, {
      name: r.name,
      category: r.category ?? 'General',
      goal: r.goal ?? 0,
      allocated: r.allocated ?? 0,
      invested: r.invested ?? 0,
      icon: r.icon ?? null,
      createdAt: ts(r.created_at),
    })
  mark('assets', assets.length)

  const assetLogs = table('asset_logs')
  for (const r of assetLogs)
    set(`assets/${r.asset_id}/entries/${r.id}`, {
      type: r.type,
      amountChange: r.amount_change,
      newBalance: r.new_balance,
      note: r.note ?? null,
      date: dateOnly(r.date),
    })
  mark('asset entries', assetLogs.length)

  // history_snapshots is one row per (month_key, type); pivot to one doc per month.
  const snaps = {}
  for (const r of table('history_snapshots')) {
    const s = (snaps[r.month_key] ??= {
      monthKey: r.month_key,
      netWorth: 0,
      totalIncome: 0,
      totalExpenses: 0,
      savingsRate: 0,
      createdAt: ts(r.created_at),
    })
    if (r.type === 'net_worth') s.netWorth = r.value
    else if (r.type === 'total_income') s.totalIncome = r.value
    else if (r.type === 'total_expenses') s.totalExpenses = r.value
    else if (r.type === 'savings_rate') s.savingsRate = r.value
    if (r.data_json) s.dataJson = r.data_json
  }
  for (const [k, v] of Object.entries(snaps)) set(`snapshots/${k}`, v)
  mark('snapshots', Object.keys(snaps).length)

  const wishlist = table('wishlist')
  for (const r of wishlist)
    set(`wishlist/${r.id}`, {
      name: r.name,
      amount: r.amount,
      category: r.category ?? 'other',
      priority: r.priority ?? 'medium',
      url: r.url ?? null,
      notes: r.notes ?? null,
      status: r.status ?? 'pending',
    })
  mark('wishlist', wishlist.length)

  const upcoming = table('upcoming_expenses')
  for (const r of upcoming)
    set(`upcomingExpenses/${r.id}`, {
      name: r.name,
      amount: r.amount,
      category: r.category ?? 'other',
      dueDate: r.due_date,
      isMandatory: bool(r.is_mandatory),
      isRecurring: bool(r.is_recurring),
      notes: r.notes ?? null,
      status: r.status ?? 'pending',
    })
  mark('upcomingExpenses', upcoming.length)

  const salary = table('salary_history')
  for (const r of salary)
    set(`salaryHistory/${r.id}`, {
      source: r.source ?? 'Main Salary',
      amount: r.amount,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to ?? null,
      notes: r.notes ?? null,
    })
  mark('salaryHistory', salary.length)

  await flush()
  console.log('Migration complete:')
  for (const [k, n] of Object.entries(counts)) console.log(`  ${k}: ${n}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
