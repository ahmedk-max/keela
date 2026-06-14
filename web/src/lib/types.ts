import type { Timestamp } from 'firebase/firestore'

// Firestore entities — mirrors docs/DATA_MODEL.md. Currency is SAR; dates are
// ISO strings ("YYYY-MM-DD"); timestamps are Firestore Timestamp.

export interface Profile {
  currency: string
  salary: number
  payday: number
  split: { save: number; live: number }
  pactStart: string
  pactEnd: string
  updatedAt: Timestamp
}

export interface Income {
  id: string
  name: string
  amount: number
  icon?: string
  isRecurring: boolean
  createdAt: Timestamp
}

export interface Bill {
  id: string
  name: string
  amount: number
  category: string
  type: 'monthly' | 'yearly'
  isSubscription: boolean
  billingDay: number | null
  notes?: string
  icon?: string
  createdAt: Timestamp
}

export interface Transaction {
  id: string
  name: string
  amount: number
  category: string
  date: string
  icon?: string
  notes?: string
  source: 'app' | 'keela' | 'nl'
  createdAt: Timestamp
}

export interface Goal {
  id: string
  name: string
  target: number
  allocated: number
  spent: number
  status: 'active' | 'completed' | 'paused'
  targetDate?: string
  icon?: string
  color?: string
  createdAt: Timestamp
}

export interface GoalEntry {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  note?: string
  date: string
}

export interface Asset {
  id: string
  name: string
  category: string
  goal?: string
  allocated: number
  invested: number
  icon?: string
  createdAt: Timestamp
}

export interface AssetEntry {
  id: string
  type: 'initial' | 'deposit' | 'withdrawal' | 'update' | 'rebalance'
  amountChange: number
  newBalance: number
  note?: string
  date: string
}

export interface Meeting {
  id: string
  date: string
  summary: string
  body: string
  refs?: string[]
  createdAt: Timestamp
}

export interface Memory {
  id: string
  scope: 'hot' | 'archive'
  section: string
  body: string
  // true = State of Mind / counsel — the PWA must NEVER render these.
  private: boolean
  updatedAt: Timestamp
}

export interface Snapshot {
  id: string
  monthKey: string
  netWorth: number
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  dataJson?: string
  createdAt: Timestamp
}
