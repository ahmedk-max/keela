// Import Keela's meetings + memory from the Obsidian vault into Firestore.
//   meetings/*  <- Personal/Finance/Meetings/*.md
//   memory/*    <- Souls/memory/_keela-memory.md (hot) + _keela-archive.md (archive)
//   private     <- "State of Mind" section + Souls/counsel/thread.md (private:true, never rendered)
// Run: node scripts/import-keela.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VAULT = process.env.VAULT || '/Users/ahmed/Library/Mobile Documents/iCloud~md~obsidian/Documents'
const sa = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccountKey.json'), 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(sa) })
const db = admin.firestore()
const { Timestamp } = admin.firestore

const clean = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '') // strip HTML comments
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[a|b]] -> b
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[x]] -> x
    .replace(/\n{3,}/g, '\n\n')
    .trim()

let batch = db.batch()
let ops = 0
const commits = []
const set = (path, data) => {
  batch.set(db.doc(path), data)
  if (++ops >= 400) { commits.push(batch.commit()); batch = db.batch(); ops = 0 }
}

// ---- meetings ----
const MEET_DIR = resolve(VAULT, 'Personal/Finance/Meetings')
const meetFiles = readdirSync(MEET_DIR).filter((f) => f.endsWith('.md'))
for (const f of meetFiles) {
  const id = f.replace(/\.md$/, '')
  const date = (id.match(/^\d{4}-\d{2}-\d{2}/) || [id])[0]
  const raw = readFileSync(resolve(MEET_DIR, f), 'utf8')
  const lines = raw.split('\n')
  const h1 = lines.find((l) => l.startsWith('# ')) || ''
  let title = h1.replace(/^#\s+/, '').trim()
  if (title.includes('—')) title = title.split('—').slice(1).join('—').trim()
  else title = title.replace(/^\d{4}-\d{2}-\d{2}\s*/, '').trim()
  if (!title) title = date

  let summary = ''
  const wwd = raw.indexOf('## What We Did')
  if (wwd >= 0) {
    const after = raw.slice(wwd + 14).split('\n').map((s) => s.trim())
    summary = clean(after.find((s) => s && !s.startsWith('#') && s !== '---') || '')
  }
  if (!summary) {
    summary = clean((lines.find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('**') && l.trim() !== '---') || ''))
  }
  if (summary.length > 220) summary = summary.slice(0, 217) + '…'

  const body = clean(raw.replace(/^#\s+.+\n/, '')) // drop the H1 (title shown separately)
  set(`meetings/${id}`, {
    date, title, summary, body,
    createdAt: Timestamp.fromDate(new Date(date + 'T12:00:00')),
  })
}

// ---- memory ----
function importMemory(file, scope, prefix) {
  let raw
  try { raw = readFileSync(file, 'utf8') } catch { return 0 }
  const parts = raw.split(/\n(?=## )/)
  let i = 0
  for (const part of parts) {
    const m = part.match(/^##\s+(.+)/)
    if (!m) continue // skip the H1 preamble
    const section = m[1].trim()
    const body = clean(part.replace(/^##\s+.+\n?/, ''))
    if (!body) continue
    const isPrivate = /state of mind/i.test(section)
    const slug = section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
    set(`memory/${prefix}-${String(i).padStart(2, '0')}-${slug}`, {
      scope, section, body, private: isPrivate, updatedAt: Timestamp.now(),
    })
    i++
  }
  return i
}
const hotN = importMemory(resolve(VAULT, 'Souls/memory/_keela-memory.md'), 'hot', 'hot')
const arcN = importMemory(resolve(VAULT, 'Souls/memory/_keela-archive.md'), 'archive', 'arc')

// ---- counsel thread (private) ----
let counselN = 0
try {
  const counsel = readFileSync(resolve(VAULT, 'Souls/counsel/thread.md'), 'utf8')
  set('memory/private-counsel', {
    scope: 'hot', section: 'Counsel thread', body: clean(counsel), private: true, updatedAt: Timestamp.now(),
  })
  counselN = 1
} catch {}

if (ops) commits.push(batch.commit())
await Promise.all(commits)
console.log(`Imported: ${meetFiles.length} meetings, ${hotN} hot memory, ${arcN} archive, ${counselN} counsel (private).`)
process.exit(0)
