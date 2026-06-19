// Dev-only demo mode. Lets the real screens render with realistic mock data so the
// design can be iterated in the browser preview without Google sign-in / Firestore.
//
// Doubly gated: `import.meta.env.DEV` is false in production builds (so this whole
// module's effect is dead-code-eliminated), AND it requires the `?demo` URL flag.
// It is never reachable in the deployed PWA.
import { buildData } from './useKeelaData'

export const DEMO =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('demo')

// A fake Firestore Timestamp for `createdAt` (the adapter calls `.toDate()`).
const ts = (h: number, m: number) => ({ toDate: () => { const d = new Date(); d.setHours(h, m, 0, 0); return d } })

// Dates anchored to "now" so the pay-cycle (27→27) window catches the transactions.
const pad = (n: number) => String(n).padStart(2, '0')
const today = new Date()
const dayISO = (back: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - back)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const raw = {
  profile: {
    salary: 25000, payday: 27, split: { save: 70, live: 30 },
    pactStart: '2024-10', pactEnd: '2027-10', currency: 'SAR',
    categoryBudgets: { Groceries: 1000, Food: 300, Travel: 800 },
  },
  income: [
    { id: 'free', name: 'Freelance', amount: 3000, isRecurring: true },
  ],
  transactions: [
    { id: 't1', name: 'Tamimi Markets', amount: 312, category: 'groceries', date: dayISO(0), createdAt: ts(18, 12), source: 'app', notes: 'weekly shop' },
    { id: 't2', name: 'Barn’s Coffee', amount: 28, category: 'food', date: dayISO(0), createdAt: ts(9, 4), source: 'app' },
    { id: 't3', name: 'Uber', amount: 41, category: 'transport', date: dayISO(1), createdAt: ts(20, 33), source: 'app' },
    { id: 't4', name: 'Jarir Bookstore', amount: 189, category: 'shopping', date: dayISO(1), createdAt: ts(16, 50), source: 'app' },
    { id: 't5', name: 'Pharmacy', amount: 76.5, category: 'health', date: dayISO(2), createdAt: ts(11, 20), source: 'keela', notes: 'logged by Keela' },
    { id: 't6', name: 'Albaik', amount: 64, category: 'food', date: dayISO(3), createdAt: ts(21, 10), source: 'app' },
    { id: 't7', name: 'Petrol', amount: 120, category: 'transport', date: dayISO(4), createdAt: ts(8, 45), source: 'app' },
    { id: 't8', name: 'Danube', amount: 245, category: 'groceries', date: dayISO(5), createdAt: ts(19, 2), source: 'app' },
    { id: 't9', name: 'Haircut', amount: 60, category: 'personal', date: dayISO(7), createdAt: ts(17, 30), source: 'app' },
    { id: 't10', name: 'Lunch — Najd Village', amount: 138, category: 'food', date: dayISO(9), createdAt: ts(14, 15), source: 'app' },
    { id: 't11', name: 'Noon order', amount: 410, category: 'shopping', date: dayISO(12), createdAt: ts(22, 41), source: 'app', notes: 'home stuff' },
    { id: 't12', name: 'Coffee beans', amount: 95, category: 'food', date: dayISO(14), createdAt: ts(10, 8), source: 'app' },
    // current-cycle extras (richer categories)
    { id: 't13', name: 'Singapore trip share', amount: 645, category: 'travel', date: dayISO(18), createdAt: ts(10, 42), source: 'app', notes: '50/50 split with brother' },
    { id: 't14', name: 'Cinema — Vox', amount: 72, category: 'entertainment', date: dayISO(8), createdAt: ts(21, 30), source: 'app' },
    { id: 't15', name: 'Birthday gift', amount: 180, category: 'gifts', date: dayISO(11), createdAt: ts(13, 5), source: 'app' },
    // prior cycle (27 Apr – 26 May) — drives the month-over-month overview
    { id: 'p1', name: 'Tamimi Markets', amount: 286, category: 'groceries', date: dayISO(22), createdAt: ts(18, 0), source: 'app' },
    { id: 'p2', name: 'Uber', amount: 55, category: 'transport', date: dayISO(24), createdAt: ts(9, 0), source: 'app' },
    { id: 'p3', name: 'Jarir Bookstore', amount: 340, category: 'shopping', date: dayISO(27), createdAt: ts(16, 0), source: 'app' },
    { id: 'p4', name: 'Pharmacy', amount: 120, category: 'health', date: dayISO(30), createdAt: ts(11, 0), source: 'app' },
    { id: 'p5', name: 'Dinner — Myazu', amount: 410, category: 'food', date: dayISO(33), createdAt: ts(20, 0), source: 'app' },
    { id: 'p6', name: 'Petrol', amount: 120, category: 'transport', date: dayISO(37), createdAt: ts(8, 0), source: 'app' },
    { id: 'p7', name: 'Noon order', amount: 360, category: 'shopping', date: dayISO(40), createdAt: ts(22, 0), source: 'app' },
    { id: 'p8', name: 'Danube', amount: 240, category: 'groceries', date: dayISO(44), createdAt: ts(19, 0), source: 'app' },
    { id: 'p9', name: 'Concert tickets', amount: 300, category: 'entertainment', date: dayISO(47), createdAt: ts(12, 0), source: 'app' },
  ],
  bills: [
    { id: 'b1', name: 'Rent', amount: 4000, category: 'housing', type: 'monthly', billingDay: 1, isSubscription: false },
    { id: 'b2', name: 'Electricity', amount: 350, category: 'utilities', type: 'monthly', billingDay: 5, isSubscription: false },
    { id: 'b3', name: 'Internet', amount: 300, category: 'bills', type: 'monthly', billingDay: 8, isSubscription: false },
    { id: 'b4', name: 'Mobile', amount: 120, category: 'bills', type: 'monthly', billingDay: 8, isSubscription: false },
    { id: 'b5', name: 'Gym', amount: 250, category: 'health', type: 'monthly', billingDay: 1, isSubscription: false },
    { id: 'b6', name: 'Netflix', amount: 56, category: 'subscriptions', type: 'monthly', billingDay: 12, isSubscription: true },
    { id: 'b7', name: 'Spotify', amount: 22, category: 'subscriptions', type: 'monthly', billingDay: 3, isSubscription: true },
    { id: 'b8', name: 'iCloud+', amount: 12, category: 'subscriptions', type: 'monthly', billingDay: 15, isSubscription: true },
    { id: 'b9', name: 'Car insurance', amount: 1800, category: 'bills', type: 'yearly', billingDay: null, isSubscription: false },
    { id: 'b10', name: 'Domain', amount: 60, category: 'bills', type: 'yearly', billingDay: null, isSubscription: false },
  ],
  goals: [
    { id: 'g1', name: 'Emergency Fund', target: 50000, allocated: 38000, spent: 0, status: 'active', color: 'var(--qahwa-accent)', targetDate: '2026-12', note: 'Six months of runway. Keep feeding it before anything fun.' },
    { id: 'g2', name: 'New Car', target: 80000, allocated: 24000, spent: 0, status: 'active', color: 'var(--qahwa-brewed)', targetDate: '2027-06', note: '' },
    { id: 'g3', name: 'Japan Trip', target: 15000, allocated: 15000, spent: 8200, status: 'completed', color: 'var(--qahwa-espresso)', targetDate: '2026-04', note: 'Funded and underway — drawing it down.' },
    { id: 'g4', name: 'MacBook Pro', target: 9000, allocated: 9000, spent: 0, status: 'completed', color: 'var(--qahwa-latte)', targetDate: '2026-03', note: '' },
    { id: 'g5', name: 'Wedding', target: 120000, allocated: 12000, spent: 0, status: 'paused', color: 'var(--qahwa-flat)', targetDate: '2027-10', note: 'On hold until the car is done.' },
  ],
  assets: [
    { id: 'a1', name: 'US Stocks (VOO)', category: 'investment', invested: 30000, allocated: 41800, color: 'var(--qahwa-brewed)', goal: 60000 },
    { id: 'a2', name: 'Gold', category: 'commodity', invested: 12000, allocated: 14200, color: 'var(--qahwa-latte)' },
    { id: 'a3', name: 'Crypto', category: 'crypto', invested: 8000, allocated: 6500, color: 'var(--qahwa-espresso)' },
    { id: 'a4', name: 'Cash Reserve', category: 'cash', invested: 20000, allocated: 20000, color: 'var(--qahwa-flat)' },
  ],
  wishlist: [
    { id: 'w1', name: 'Sony WH-1000XM5', amount: 1499 },
    { id: 'w2', name: 'Standing desk', amount: 2200 },
  ],
  upcoming: [
    { id: 'u1', name: 'Car registration', amount: 350, dueDate: dayISO(-9) },
    { id: 'u2', name: 'Flight to Riyadh', amount: 680, dueDate: dayISO(-21) },
  ],
  snapshots: [
    { monthKey: '2025-11', netWorth: 131500, totalIncome: 28000, totalExpenses: 7100, savingsRate: 71 },
    { monthKey: '2025-12', netWorth: 138400, totalIncome: 31000, totalExpenses: 7600, savingsRate: 70 },
    { monthKey: '2026-01', netWorth: 144100, totalIncome: 28000, totalExpenses: 7300, savingsRate: 72 },
    { monthKey: '2026-02', netWorth: 150900, totalIncome: 28000, totalExpenses: 7000, savingsRate: 74 },
    { monthKey: '2026-03', netWorth: 155200, totalIncome: 28000, totalExpenses: 8200, savingsRate: 69 },
    { monthKey: '2026-04', netWorth: 161800, totalIncome: 28000, totalExpenses: 7400, savingsRate: 72 },
    { monthKey: '2026-05', netWorth: 167500, totalIncome: 28000, totalExpenses: 7100, savingsRate: 73 },
    { monthKey: '2026-06', netWorth: 172300, totalIncome: 28000, totalExpenses: 7250, savingsRate: 73 },
  ],
  meetings: [
    {
      id: 'm1', date: dayISO(2), title: 'You’re ahead of the pact this cycle',
      summary: 'Variable spend is tracking under budget and your savings rate is 73% — three points above the 70% pact. Nothing to correct; keep the rhythm.',
      body: '## Where we stand\n\nThis cycle you’ve kept **73%** — above the 70 pact line. Variable spending is calm: groceries and food are the bulk, no outliers.\n\n- Income held at **28,000** SAR\n- Fixed + subs steady at **5,110**\n- Variable so far **~2,400**, well under the 3,290 budget\n\n> Stay the course. If anything, the New Car bucket could take the surplus.\n\n## One nudge\n\nThe Wedding bucket is paused. When the car lands, redirect that contribution rather than letting it leak into variable.',
    },
    {
      id: 'm2', date: dayISO(11), title: 'Gold offset the crypto dip',
      summary: 'Portfolio is up overall. Gold gained while crypto slipped; net worth crossed 113k. No action needed.',
      body: '## Portfolio note\n\nNet worth crossed **113,700**. The crypto position is down ~19% on cost, but gold (+18%) and stocks (+39%) more than cover it.\n\nNothing to rebalance yet — the allocation is still within your comfort band.',
    },
    {
      id: 'm3', date: dayISO(24), title: 'Japan trip is funded',
      summary: 'The Japan bucket hit its 15,000 target. Marked complete — you’re now drawing it down as you spend.',
      body: '## Funded\n\nThe **Japan Trip** bucket reached 15,000 SAR. I’ve marked it complete; spends now draw it down rather than counting against variable budget.\n\nEnjoy it — this one was three years coming.',
    },
  ],
  memory: [
    { id: 'mem1', section: 'Patterns', private: false, body: 'Spends most on **groceries** and **food** — together ~60% of variable. Weekends skew higher. Rarely impulse-buys; the Noon orders are planned home purchases.' },
    { id: 'mem2', section: 'The pact', private: false, body: 'Holding the 70/30 since Oct 2024. Has never dropped below 68% in a cycle. Treats the Emergency Fund as untouchable.' },
    { id: 'mem3', section: 'State of mind', private: true, body: 'private counsel — never rendered' },
  ],
  entries: [
    { path: 'goals/g1/entries/e1', type: 'deposit', amount: 2000, date: dayISO(5), note: 'monthly top-up' },
    { path: 'goals/g1/entries/e2', type: 'deposit', amount: 2000, date: dayISO(35), note: '' },
    { path: 'goals/g3/entries/e3', type: 'deposit', amount: 15000, date: dayISO(80), note: 'fully funded' },
    { path: 'goals/g3/entries/e4', type: 'spend', amount: 5200, date: dayISO(20), note: 'flights + hotel' },
    { path: 'goals/g3/entries/e5', type: 'spend', amount: 3000, date: dayISO(6), note: 'JR pass + spending' },
    { path: 'goals/g2/entries/e6', type: 'deposit', amount: 4000, date: dayISO(8), note: '' },
    { path: 'assets/a1/entries/e7', type: 'initial', newBalance: 30000, date: dayISO(200), note: 'opening' },
    { path: 'assets/a1/entries/e8', type: 'update', newBalance: 41800, date: dayISO(3), note: 'quarterly mark' },
    { path: 'assets/a3/entries/e9', type: 'update', newBalance: 6500, date: dayISO(3), note: 'dip' },
  ],
}

// Cast to the adapter's return type: this is only ever read when DEMO is true
// (see useKeelaData), so consumers can treat it as non-null.
export const demoData = (DEMO ? buildData(raw) : null) as ReturnType<typeof buildData>
