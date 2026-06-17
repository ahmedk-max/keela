// Keela's tool surface, backed by the Firestore REST client. Same 11 tools as
// the local stdio bridge (bridge/keela-mcp.mjs); only the data layer differs.
// registerTools(server, fs) — fs is a makeFirestore(...) client.
import { z } from 'zod'
import { computeSummary, goalBalance, isoDate, memSlug } from '../shared.mjs'

const json = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })
const text = (s) => ({ content: [{ type: 'text', text: s }] })
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')

export function registerTools(server, fs) {
  /* ---- read ---- */

  server.registerTool('get_summary', {
    title: 'Financial summary',
    description:
      'The current money picture: this pay-cycle cashflow (income, fixed, subs, variable spent + left), ' +
      'savings rate vs the 70/30 pact, net worth (investments + savings buckets), and pact progress. ' +
      'Call this first for any "how am I doing" question. A "month" is the payday cycle (27→27), not calendar.',
    inputSchema: {},
  }, async () => json(computeSummary(await fs.loadAll())))

  server.registerTool('recent_transactions', {
    title: 'Recent transactions',
    description: 'Most recent variable spending (the transactions collection), newest first.',
    inputSchema: { limit: z.number().int().min(1).max(100).default(15).describe('How many to return') },
  }, async ({ limit }) => {
    const all = (await fs.listColl('transactions')).sort((a, b) =>
      byDateDesc(a, b) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    return json(all.slice(0, limit).map((t) => ({
      id: t.id, name: t.name, amount: t.amount, category: t.category, date: t.date,
      source: t.source || 'app', notes: t.notes || '',
    })))
  })

  server.registerTool('list_goals', {
    title: 'List savings goals',
    description: 'All savings buckets with their balance (allocated − spent), target, status, and target date.',
    inputSchema: {},
  }, async () => {
    const goals = await fs.listColl('goals')
    return json(goals.map((g) => ({
      id: g.id, name: g.name, status: g.status || 'active',
      balance: goalBalance(g), allocated: g.allocated || 0, spent: g.spent || 0,
      target: g.target, targetDate: g.targetDate || null,
    })))
  })

  server.registerTool('check_affordability', {
    title: 'Check affordability',
    description:
      'Given a one-off amount, says whether it fits the remaining variable budget for THIS pay cycle, ' +
      'and what it would do to the cycle savings rate. Use before agreeing to a discretionary purchase.',
    inputSchema: { amount: z.number().positive().describe('SAR amount to test') },
  }, async ({ amount }) => {
    const s = computeSummary(await fs.loadAll())
    const variableLeftAfter = s.variableLeft - amount
    const savedAfter = s.saved - amount
    const rateAfter = s.income > 0 ? Math.round((savedAfter / s.income) * 100) : 0
    return json({
      amount, variableLeftNow: s.variableLeft, variableLeftAfter,
      fitsThisCycle: variableLeftAfter >= 0,
      savingsRateNow: s.savingsRate, savingsRateAfter: rateAfter,
      pactTarget: s.pactTarget, breaksPact: rateAfter < s.pactTarget,
      verdict: variableLeftAfter >= 0
        ? (rateAfter >= s.pactTarget ? 'affordable, pact held' : 'affordable but dips below the pact')
        : 'over the variable budget for this cycle',
    })
  })

  server.registerTool('recent_meetings', {
    title: 'Recent session notes',
    description: "Keela's recent meeting/session notes (the meetings collection), newest first.",
    inputSchema: { limit: z.number().int().min(1).max(50).default(8).describe('How many to return') },
  }, async ({ limit }) => {
    const all = (await fs.listColl('meetings')).sort(byDateDesc)
    return json(all.slice(0, limit).map((m) => ({ id: m.id, date: m.date, title: m.title || '', summary: m.summary || '' })))
  })

  server.registerTool('read_memory', {
    title: 'Read memory',
    description:
      "Keela's memory sections. Private memory (State of Mind / counsel) is EXCLUDED by default and is " +
      'never shown in the PWA — pass include_private:true only when Keela herself needs her own interior notes.',
    inputSchema: {
      include_private: z.boolean().default(false).describe('Include private (State of Mind / counsel) memory'),
      scope: z.enum(['hot', 'archive', 'all']).default('hot').describe('Which memory tier to read'),
    },
  }, async ({ include_private, scope }) => {
    let mem = await fs.listColl('memory')
    if (!include_private) mem = mem.filter((m) => !m.private)
    if (scope !== 'all') mem = mem.filter((m) => (m.scope || 'hot') === scope)
    return json(mem.map((m) => ({ id: m.id, scope: m.scope || 'hot', section: m.section, private: !!m.private, body: m.body })))
  })

  /* ---- write ---- */

  server.registerTool('add_transaction', {
    title: 'Add a transaction',
    description: 'Record a variable expense. Tagged source:"keela" so it is distinguishable from app entry.',
    inputSchema: {
      name: z.string().min(1).describe('What it was, e.g. "Coffee at Half Million"'),
      amount: z.number().positive().describe('SAR amount'),
      category: z.string().default('Other').describe('Category, e.g. Food, Groceries, Transport'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD, defaults to today'),
      notes: z.string().optional(),
    },
  }, async ({ name, amount, category, date, notes }) => {
    const id = await fs.createDoc('transactions', {
      name, amount, category: category || 'Other', date: date || isoDate(),
      notes: notes || '', source: 'keela', createdAt: new Date(),
    })
    return text(`Logged ${amount} SAR · ${name} (${category || 'Other'}) on ${date || isoDate()}. id=${id}`)
  })

  server.registerTool('goal_deposit', {
    title: 'Deposit into a goal',
    description: 'Add money to a savings bucket: increments its allocated balance and records a deposit entry.',
    inputSchema: {
      goal_id: z.string().describe('Goal document id (from list_goals)'),
      amount: z.number().positive().describe('SAR to deposit'),
      note: z.string().optional(),
    },
  }, async ({ goal_id, amount, note }) => {
    if (!(await fs.getDoc(`goals/${goal_id}`))) return text(`No goal with id ${goal_id}. Use list_goals.`)
    await fs.increment(`goals/${goal_id}`, 'allocated', amount)
    await fs.addSub(`goals/${goal_id}`, 'entries', { type: 'deposit', amount, note: note || '', date: isoDate() })
    return text(`Deposited ${amount} SAR into ${goal_id}.`)
  })

  server.registerTool('goal_withdraw', {
    title: 'Withdraw / spend from a goal',
    description: 'Spend from a funded bucket: increments its spent total and records a withdrawal entry.',
    inputSchema: {
      goal_id: z.string().describe('Goal document id (from list_goals)'),
      amount: z.number().positive().describe('SAR to withdraw'),
      note: z.string().optional(),
    },
  }, async ({ goal_id, amount, note }) => {
    if (!(await fs.getDoc(`goals/${goal_id}`))) return text(`No goal with id ${goal_id}. Use list_goals.`)
    await fs.increment(`goals/${goal_id}`, 'spent', amount)
    await fs.addSub(`goals/${goal_id}`, 'entries', { type: 'withdrawal', amount, note: note || '', date: isoDate() })
    return text(`Withdrew ${amount} SAR from ${goal_id}.`)
  })

  server.registerTool('log_meeting', {
    title: 'Write a session note',
    description:
      'Record a session note that surfaces in the PWA "Session notes" tab. ' +
      'Doc id is the date (YYYY-MM-DD); writing the same date again overwrites it.',
    inputSchema: {
      title: z.string().min(1).describe('Short title for the note'),
      summary: z.string().min(1).describe('One- or two-line gist (shown in the list)'),
      body: z.string().min(1).describe('Full note, markdown'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD, defaults to today'),
    },
  }, async ({ title, summary, body, date }) => {
    const id = date || isoDate()
    await fs.setDoc(`meetings/${id}`, { date: id, title, summary, body, createdAt: new Date(id + 'T12:00:00') })
    return text(`Saved session note "${title}" (${id}).`)
  })

  server.registerTool('update_memory', {
    title: 'Write / update memory',
    description:
      "Upsert one of Keela's memory sections. private:true marks State-of-Mind/counsel content that the " +
      'PWA must never render. Doc id is derived from the section name, so re-using a section updates it.',
    inputSchema: {
      section: z.string().min(1).describe('Section name, e.g. "Patterns" or "The pact"'),
      body: z.string().min(1).describe('The memory content, markdown'),
      scope: z.enum(['hot', 'archive']).default('hot').describe('hot = active memory, archive = cold storage'),
      private: z.boolean().default(false).describe('true = never rendered in the PWA'),
    },
  }, async ({ section, body, scope, private: isPrivate }) => {
    const id = `${scope === 'archive' ? 'arc' : 'hot'}-${memSlug(section)}`
    await fs.setDoc(`memory/${id}`, { scope, section, body, private: !!isPrivate, updatedAt: new Date() })
    return text(`Updated memory "${section}" (${scope}${isPrivate ? ', private' : ''}). id=${id}`)
  })
}
