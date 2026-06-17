// Keela bridge — Firestore access + the same money math the PWA uses.
// Single source of truth is Firestore; this mirrors web/src/data/useKeelaData.js
// so terminal Keela and the app agree on every number.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

// The pure money math is shared verbatim with the remote Worker so numbers
// can never drift between terminal Keela and phone Keela.
export { isoDate, isoMonth, goalBalance, cycleWindow, computeSummary, memSlug } from './shared.mjs'

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
