// Local, read-only proof that the REST + WebCrypto-JWT layer reaches Firestore
// and produces the same summary as the admin-SDK bridge. Run from this dir:
//   node verify.mjs
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeFirestore } from './firestore.mjs'
import { computeSummary, goalBalance } from '../shared.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const sa = JSON.parse(readFileSync(resolve(HERE, '../../serviceAccountKey.json'), 'utf8'))
const fs = makeFirestore({ clientEmail: sa.client_email, privateKey: sa.private_key, projectId: sa.project_id })

const raw = await fs.loadAll()
const s = computeSummary(raw)
console.log('— remote (REST) verify —')
console.log('project:', sa.project_id)
console.log('counts:', {
  transactions: raw.transactions.length, goals: raw.goals.length,
  assets: raw.assets.length, bills: raw.bills.length,
})
console.log('summary:', s)
console.log('goals:', raw.goals.map((g) => `${g.name}: ${goalBalance(g)}/${g.target} [${g.status || 'active'}]`))
