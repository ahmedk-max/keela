// Portable Firestore client over the REST API — runs on Cloudflare Workers
// (and in Node, for local verification). firebase-admin can't run on the edge
// (gRPC + Node APIs), so we mint an OAuth token by signing a service-account
// JWT with WebCrypto (RS256) and talk to the Firestore REST endpoint.
//
// makeFirestore({ clientEmail, privateKey, projectId }) -> data methods.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/datastore'
const enc = new TextEncoder()

// ---- base64 / base64url ----
const bytesToB64 = (bytes) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const b64url = (bytes) => bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64urlStr = (str) => b64url(enc.encode(str))

// ---- Firestore typed-value <-> plain JS ----
function decodeValue(v) {
  if (v == null) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('referenceValue' in v) return v.referenceValue
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {})
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue)
  return null
}
const decodeFields = (fields) => {
  const o = {}
  for (const k in fields) o[k] = decodeValue(fields[k])
  return o
}
function encodeValue(x) {
  if (x === null || x === undefined) return { nullValue: null }
  if (x instanceof Date) return { timestampValue: x.toISOString() }
  if (typeof x === 'string') return { stringValue: x }
  if (typeof x === 'boolean') return { booleanValue: x }
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x }
  if (Array.isArray(x)) return { arrayValue: { values: x.map(encodeValue) } }
  if (typeof x === 'object') return { mapValue: { fields: encodeFields(x) } }
  return { nullValue: null }
}
const encodeFields = (obj) => {
  const f = {}
  for (const k in obj) if (obj[k] !== undefined) f[k] = encodeValue(obj[k])
  return f
}
const idOf = (name) => name.split('/').pop()

export function makeFirestore({ clientEmail, privateKey, projectId }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const docName = (path) => `projects/${projectId}/databases/(default)/documents/${path}`
  let cached = null // { token, exp }
  let keyPromise = null

  const importKey = () => {
    if (keyPromise) return keyPromise
    const pem = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '')
    keyPromise = crypto.subtle.importKey(
      'pkcs8', b64ToBytes(pem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
    )
    return keyPromise
  }

  async function getToken() {
    const now = Math.floor(Date.now() / 1000)
    if (cached && cached.exp - 60 > now) return cached.token
    const header = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claim = b64urlStr(JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))
    const input = `${header}.${claim}`
    const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, await importKey(), enc.encode(input))
    const jwt = `${input}.${b64url(new Uint8Array(sig))}`
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
    const j = await res.json()
    cached = { token: j.access_token, exp: now + (j.expires_in || 3600) }
    return cached.token
  }

  async function api(path, init = {}) {
    const token = await getToken()
    const res = await fetch(path.startsWith('http') ? path : base + path, {
      ...init,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`firestore ${res.status}: ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }

  // Get one document, or null if missing.
  async function getDoc(docPath) {
    const d = await api(`/${docPath}`)
    return d ? { id: idOf(d.name), ...decodeFields(d.fields || {}) } : null
  }

  // List an entire collection (pages through; data is tiny).
  async function listColl(collection) {
    const out = []
    let pageToken = ''
    do {
      const q = `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
      const page = await api(`/${collection}${q}`)
      for (const d of page?.documents || []) out.push({ id: idOf(d.name), ...decodeFields(d.fields || {}) })
      pageToken = page?.nextPageToken || ''
    } while (pageToken)
    return out
  }

  // Create a doc with an auto id; returns its id.
  async function createDoc(collection, obj) {
    const d = await api(`/${collection}`, { method: 'POST', body: JSON.stringify({ fields: encodeFields(obj) }) })
    return idOf(d.name)
  }

  // Set a doc by id (full replace of the provided fields).
  async function setDoc(docPath, obj) {
    await api(`/${docPath}`, { method: 'PATCH', body: JSON.stringify({ fields: encodeFields(obj) }) })
  }

  // Atomic numeric increment via the commit endpoint's field transform.
  async function increment(docPath, field, amount) {
    await api(`:commit`, {
      method: 'POST',
      body: JSON.stringify({
        writes: [{
          transform: {
            document: docName(docPath),
            fieldTransforms: [{ fieldPath: field, increment: { doubleValue: amount } }],
          },
        }],
      }),
    })
  }

  const addSub = (parentPath, sub, obj) => createDoc(`${parentPath}/${sub}`, obj)

  // Delete a doc (used by the write round-trip self-test).
  const del = (docPath) => api(`/${docPath}`, { method: 'DELETE' })

  // Everything a summary needs (mirrors bridge/lib.mjs loadAll).
  async function loadAll() {
    const [profile, transactions, bills, goals, assets, income] = await Promise.all([
      getDoc('profile/main'),
      listColl('transactions'), listColl('bills'), listColl('goals'),
      listColl('assets'), listColl('income'),
    ])
    return { profile: profile || {}, transactions, bills, goals, assets, income }
  }

  return { getDoc, listColl, createDoc, setDoc, increment, addSub, del, loadAll }
}
