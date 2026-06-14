// Formatting + small helpers ported from the design's data.jsx. Numbers use a
// real minus sign (U+2212) for negatives, matching the Qahwa design.

export const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

export function fmt(n: number, dp = 0): string {
  const neg = n < 0
  n = Math.abs(n)
  const s = n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  return (neg ? '−' : '') + s
}

export function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`
}

export const fmtDay = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTH_ABBR[m - 1]}`
}

export const CATEGORIES = [
  'Food', 'Groceries', 'Transport', 'Shopping', 'Health', 'Personal', 'Bills', 'Other',
]

// Two-letter category codes for the little square tiles.
export const CAT_CODE: Record<string, string> = {
  Food: 'FD', Groceries: 'GR', Transport: 'TR', Shopping: 'SH', Health: 'HL',
  Personal: 'PR', Bills: 'BL', Other: 'OT', Housing: 'HS', Utilities: 'UT',
  Subscriptions: 'SB',
}

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export const catCode = (category: string) => {
  const c = cap(category || 'Other')
  return CAT_CODE[c] || (category || 'OT').slice(0, 2).toUpperCase()
}

// Current month key, e.g. "2026-06" — drives "this month" computations.
export const NOW_MONTH = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()
