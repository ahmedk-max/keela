// Read-only smoke test: proves the bridge can reach Firestore and that the
// summary math runs against real data. Writes nothing. Run: npm run smoke
import { db, loadAll, computeSummary, goalBalance } from './lib.mjs'

const raw = await loadAll()
const s = computeSummary(raw)
const meetings = (await db.collection('meetings').get()).size
const memory = (await db.collection('memory').get()).size

console.log('— Keela bridge smoke test —')
console.log('collections:', {
  transactions: raw.transactions.length, goals: raw.goals.length,
  assets: raw.assets.length, bills: raw.bills.length, meetings, memory,
})
console.log('summary:', s)
console.log('goal balances:', raw.goals.map((g) => `${g.name}: ${goalBalance(g)}/${g.target} [${g.status || 'active'}]`))
process.exit(0)
