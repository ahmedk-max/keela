// Deploy firestore.rules using the Admin SDK's Security Rules API (no firebase
// login needed). Run: node scripts/deploy-rules.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import admin from 'firebase-admin'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sa = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccountKey.json'), 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(sa) })

const source = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8')
const ruleset = await admin.securityRules().releaseFirestoreRulesetFromSource(source)
console.log('Firestore rules deployed. Ruleset:', ruleset.name)
process.exit(0)
