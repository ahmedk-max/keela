/* Keela — Spending extras: month-over-month stats derivation + the add/edit
   sheets (transaction, recurring bill, upcoming, wishlist, per-category budget).
   "Warm" soft-rounded language; inline-styled from `th`, mirrors home-extras.jsx. */
import React from 'react'
import { useTheme, tint } from '../lib/theme'
import { fmt } from '../lib/format'
import { CAT, getCat } from '../lib/icons'
import { Sheet, Field, SheetSave, SheetDelete, Segmented } from '../ui/primitives'

const CATEGORIES = [
  'Food', 'Groceries', 'Transport', 'Shopping', 'Travel', 'Entertainment',
  'Health', 'Personal', 'Gifts', 'Bills', 'Other',
]

/* ---------- date helpers (ISO YYYY-MM-DD) ---------- */
const D = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const addMonths = (iso, n) => { const dt = D(iso); dt.setMonth(dt.getMonth() + n); return isoOf(dt) }
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000)
const TODAY = isoOf(new Date())

function cumulative(txns, startIso, len) {
  const arr = new Array(len).fill(0)
  for (const t of txns) {
    const i = daysBetween(startIso, t.date)
    if (i >= 0 && i < len) arr[i] += t.amount
  }
  for (let i = 1; i < len; i++) arr[i] += arr[i - 1]
  return arr
}

/* Month-over-month spending stats. Colours stay as hex from CAT so the donut /
   category bars read identically in light + dark (CAT hues are mid-tone). */
export function spendStats(data) {
  const { txns, cashflow } = data
  const { cycleStart, cycleEnd, variableBudget } = cashflow
  const prevStart = addMonths(cycleStart, -1)
  const len = Math.max(1, daysBetween(cycleStart, cycleEnd))
  const prevLen = Math.max(1, daysBetween(prevStart, cycleStart))

  const cur = txns.filter((t) => t.date >= cycleStart && t.date < cycleEnd)
  const prev = txns.filter((t) => t.date >= prevStart && t.date < cycleStart)

  const curTotal = Math.round(cur.reduce((s, t) => s + t.amount, 0))
  const prevTotal = Math.round(prev.reduce((s, t) => s + t.amount, 0))

  const elapsed = Math.min(len, Math.max(1, daysBetween(cycleStart, TODAY) + 1))

  const curCum = cumulative(cur, cycleStart, len)
  const prevCum = cumulative(prev, prevStart, Math.max(len, prevLen))

  // per-day (non-cumulative) spend for the current cycle — drives the bars
  const curDaily = new Array(len).fill(0)
  for (const t of cur) {
    const i = daysBetween(cycleStart, t.date)
    if (i >= 0 && i < len) curDaily[i] += t.amount
  }
  const prevAtNow = prevCum[Math.min(elapsed - 1, prevCum.length - 1)] || 0
  const paceVal = (curCum[elapsed - 1] || 0) - prevAtNow // + = spending faster than last cycle

  const dailyAvg = curTotal / elapsed
  const projected = Math.round(dailyAvg * len)

  // category breakdown (current cycle), top 5 + Other; carry icon for the donut badges
  const map = {}
  for (const t of cur) map[t.cat] = (map[t.cat] || 0) + t.amount
  const meta = (name) => getCat(name) || CAT.Other
  let cats = Object.entries(map)
    .map(([cat, amount]) => ({ cat, amount: Math.round(amount), color: meta(cat).color, icon: meta(cat).icon }))
    .sort((a, b) => b.amount - a.amount)
  if (cats.length > 6) {
    const rest = cats.slice(5).reduce((s, c) => s + c.amount, 0)
    cats = [...cats.slice(0, 5), { cat: 'Other', amount: rest, color: CAT.Other.color, icon: CAT.Other.icon }]
  }

  return {
    curTotal, prevTotal, budget: variableBudget, len, elapsed, cycleStart, cycleEnd,
    curCum, prevCum, curDaily: curDaily.map(Math.round), prevAtNow, paceVal, dailyAvg, projected, cats,
    daysLeft: Math.max(0, len - elapsed),
  }
}

/* ---------- shared sheet bits ---------- */
const lbl = (th) => ({ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3 })

/* big amount field with the under-rule + SAR suffix (matches prototype 763) */
function AmountField({ value, onChange }) {
  const th = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: `2px solid ${th.line}`, padding: '6px 0', marginTop: 12 }}>
      <input
        value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        inputMode="decimal" placeholder="0"
        style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', fontSize: 26, fontWeight: 800, color: th.ink, outline: 'none', fontFamily: 'inherit', width: '100%' }}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: th.ink3 }}>SAR</span>
    </div>
  )
}

/* colourful rounded-chip category picker (accent-tinted when selected) */
function CategoryPicker({ value, onChange }) {
  const th = useTheme()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {CATEGORIES.map((c) => {
        const meta = CAT[c]
        const on = value === c
        const col = meta ? meta.color : th.ink3
        return (
          <button key={c} type="button" onClick={() => onChange(c)} style={{
            display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: 'inherit',
            border: `1.5px solid ${on ? col : th.line}`, borderRadius: 999,
            padding: '5px 11px 5px 8px', background: on ? tint(col, 14) : th.card2,
            fontSize: 11.5, fontWeight: 600, color: on ? col : th.ink2,
          }}>
            {meta && <span style={{ width: 13, height: 13, display: 'flex', color: col }}>{meta.icon}</span>}
            {c}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- transaction add/edit ---------- */
export function TxSheet({ tx, onClose, onSave, onDelete }) {
  const th = useTheme()
  const [amount, setAmount] = React.useState(tx ? String(tx.amount) : '')
  const [name, setName] = React.useState(tx ? tx.name : '')
  const [cat, setCat] = React.useState(tx ? tx.cat : 'Food')
  const [date, setDate] = React.useState(tx ? tx.date : TODAY)
  const [note, setNote] = React.useState(tx ? tx.note || '' : '')
  const valid = amount && parseFloat(amount) > 0 && name.trim()
  const payload = () => ({ name: name.trim(), amount: Math.round(parseFloat(amount) * 100) / 100, cat, date, note: note.trim() })
  return (
    <Sheet title={tx ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="What for? e.g. Tamimi Markets" />
          <CategoryPicker value={cat} onChange={setCat} />
          <Field value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
          <SheetSave onClick={() => { if (valid) { onSave(payload()); close() } }} style={{ opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>
            {tx ? 'Save changes' : 'Save to ledger'}
          </SheetSave>
          {tx && <SheetDelete onClick={() => { onDelete(tx.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}

/* ---------- recurring bill / sub add/edit ---------- */
export function BillSheet({ bill, onClose, onSave, onDelete }) {
  const th = useTheme()
  const [name, setName] = React.useState(bill ? bill.name : '')
  const [amount, setAmount] = React.useState(bill ? String(bill.amount) : '')
  const [category, setCategory] = React.useState(bill ? bill.cat : 'Bills')
  const [type, setType] = React.useState(bill ? bill.type : 'monthly')
  const [sub, setSub] = React.useState(bill ? !!bill.sub : false)
  const [day, setDay] = React.useState(bill && bill.day ? String(bill.day) : '')
  const valid = name.trim() && parseFloat(amount) > 0
  const payload = () => ({ name: name.trim(), amount: Math.round(parseFloat(amount) * 100) / 100, category, type, sub, billingDay: day ? parseInt(day, 10) : null })
  return (
    <Sheet title={bill ? 'Edit recurring' : 'Add recurring'} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="Name · e.g. Netflix" />
          <Field value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category · e.g. Utilities" />
          <Segmented style={{ marginTop: 10 }} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} value={type} onChange={setType} />
          <Field value={day} onChange={(e) => setDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} inputMode="numeric" placeholder="Billing day (optional)" />
          {/* subscription toggle */}
          <button onClick={() => setSub((s) => !s)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            border: 'none', background: 'none', padding: '12px 2px', marginTop: 6, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: th.ink2 }}>This is a subscription</span>
            <span style={{ position: 'relative', width: 42, height: 24, borderRadius: 999, background: sub ? th.accent : th.line, transition: 'background .2s', flex: 'none' }}>
              <span style={{ position: 'absolute', top: 3, left: sub ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
            </span>
          </button>
          <SheetSave onClick={() => { if (valid) { onSave(payload()); close() } }} style={{ marginTop: 10, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>
            {bill ? 'Save changes' : 'Add recurring'}
          </SheetSave>
          {bill && <SheetDelete onClick={() => { onDelete(bill.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}

/* ---------- upcoming expense add/edit ---------- */
export function UpcomingSheet({ item, onClose, onSave, onDelete }) {
  const [name, setName] = React.useState(item ? item.name : '')
  const [amount, setAmount] = React.useState(item ? String(item.amount) : '')
  const [dueDate, setDueDate] = React.useState(item ? item.date : TODAY)
  const valid = name.trim() && parseFloat(amount) > 0 && dueDate
  const payload = () => ({ name: name.trim(), amount: Math.round(parseFloat(amount) * 100) / 100, dueDate, category: 'other' })
  return (
    <Sheet title={item ? 'Edit upcoming' : 'Add upcoming'} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="Name · e.g. Car registration" />
          <Field value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" />
          <SheetSave onClick={() => { if (valid) { onSave(payload()); close() } }} style={{ opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>
            {item ? 'Save changes' : 'Add upcoming'}
          </SheetSave>
          {item && <SheetDelete onClick={() => { onDelete(item.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}

/* ---------- wishlist add/edit ---------- */
export function WishlistSheet({ item, onClose, onSave, onDelete }) {
  const [name, setName] = React.useState(item ? item.name : '')
  const [amount, setAmount] = React.useState(item ? String(item.amount) : '')
  const valid = name.trim() && parseFloat(amount) > 0
  const payload = () => ({ name: name.trim(), amount: Math.round(parseFloat(amount) * 100) / 100 })
  return (
    <Sheet title={item ? 'Edit wish' : 'Add to wishlist'} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="Name · e.g. Sony WH-1000XM5" />
          <SheetSave onClick={() => { if (valid) { onSave(payload()); close() } }} style={{ opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>
            {item ? 'Save changes' : 'Add to wishlist'}
          </SheetSave>
          {item && <SheetDelete onClick={() => { onDelete(item.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}

/* ---------- per-category budget set/clear ---------- */
export function CategoryBudgetSheet({ cat, cap, onClose, onSave }) {
  const th = useTheme()
  const [amount, setAmount] = React.useState(cap ? String(cap) : '')
  const meta = getCat(cat)
  const num = Math.round((parseFloat(amount) || 0) * 100) / 100
  return (
    <Sheet title={`Budget · ${cat}`} onClose={onClose}>
      {(close) => (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {meta && (
              <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(meta.color, 13), color: meta.color }}>
                <span style={{ width: 18, height: 18, display: 'flex' }}>{meta.icon}</span>
              </span>
            )}
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: th.ink2, flex: 1, minWidth: 0 }}>
              A monthly cap for {cat}. &ldquo;Where it went&rdquo; turns red once you cross it.
            </span>
          </div>
          <AmountField value={amount} onChange={setAmount} />
          <SheetSave onClick={() => { if (num > 0) { onSave(cat, num); close() } }} style={{ opacity: num > 0 ? 1 : 0.4, pointerEvents: num > 0 ? 'auto' : 'none' }}>
            {cap ? 'Update budget' : 'Set budget'}
          </SheetSave>
          {cap > 0 && <SheetDelete onClick={() => { onSave(cat, 0); close() }}>Clear budget</SheetDelete>}
        </>
      )}
    </Sheet>
  )
}
