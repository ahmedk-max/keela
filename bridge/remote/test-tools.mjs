// Verify the REST-backed tool surface in-process (no Workers runtime needed):
// connect an MCP client+server over an in-memory transport, exercise the READ
// tools against live Firestore, and round-trip a WRITE on a throwaway doc so
// real finance data is never touched. Run: node test-tools.mjs
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { makeFirestore } from './firestore.mjs'
import { registerTools } from './tools.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const sa = JSON.parse(readFileSync(resolve(HERE, '../../serviceAccountKey.json'), 'utf8'))
const fs = makeFirestore({ clientEmail: sa.client_email, privateKey: sa.private_key, projectId: sa.project_id })

const server = new McpServer({ name: 'keela-remote', version: '1.0.0' })
registerTools(server, fs)
const [c, s] = InMemoryTransport.createLinkedPair()
const client = new Client({ name: 'test', version: '1.0.0' })
await Promise.all([server.connect(s), client.connect(c)])

const { tools } = await client.listTools()
console.log(`tools (${tools.length}): ${tools.map((t) => t.name).join(', ')}`)

const call = async (name, args = {}) => JSON.parse((await client.callTool({ name, arguments: args })).content[0].text)
console.log('\nget_summary.savingsRate:', (await call('get_summary')).savingsRate)
console.log('list_goals count:', (await call('list_goals')).length)
console.log('check_affordability(1200).verdict:', (await call('check_affordability', { amount: 1200 })).verdict)
console.log('read_memory(hot) count:', (await call('read_memory')).length)

// --- write round-trip on a throwaway doc (exercises encode/increment/decode/delete) ---
console.log('\n— write path round-trip on _bridgecheck —')
const id = await fs.createDoc('_bridgecheck', { n: 10, label: 'rt', when: new Date() })
await fs.increment(`_bridgecheck/${id}`, 'n', 5)
const back = await fs.getDoc(`_bridgecheck/${id}`)
console.log('after create{n:10}+increment(5):', back.n, back.n === 15 ? 'OK' : 'MISMATCH')
await fs.del(`_bridgecheck/${id}`)
console.log('deleted:', (await fs.getDoc(`_bridgecheck/${id}`)) === null ? 'OK' : 'STILL THERE')

await client.close()
process.exit(0)
