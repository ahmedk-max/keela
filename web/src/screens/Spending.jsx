/* Keela — Spending: money out (variable + recurring), pay-cycle aware, with edit/add */
import React from 'react'
import { CatSquare, Tag, Segmented, Empty, Progress, Sheet } from '../ui/primitives'
import { fmt, fmtDate, fmtDay, CATEGORIES } from '../lib/format'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TODAY = iso(new Date())
const YESTERDAY = iso(new Date(Date.now() - 86400000))

function dayLabel(d) {
  if (d === TODAY) return 'Today'
  if (d === YESTERDAY) return 'Yesterday'
  return fmtDate(d)
}

function TxRow({ t, onClick }) {
  return (
    <button className="k-row btn" onClick={onClick}>
      <CatSquare code={t.code} keela={t.source === 'keela'} />
      <div className="k-row-main">
        <span className="k-row-name">
          {t.name}
          {t.source === 'keela' && <span className="k-tag em" style={{ padding: '2px 4px', fontSize: 8 }}>K</span>}
        </span>
        <span className="k-row-sub">{t.cat}{t.note ? ' · ' + t.note : ''}</span>
      </div>
      <div className="k-row-r">
        <span className="k-row-amt">&minus;{fmt(t.amount, t.amount % 1 ? 2 : 0)}</span>
        <span className="k-micro k-num">{t.time}</span>
      </div>
    </button>
  )
}

function TransactionsView({ txns, cf, cycleLabel, daysLeft, nav }) {
  const groups = []
  const map = {}
  txns.forEach((t) => {
    if (!map[t.date]) { map[t.date] = { date: t.date, items: [], total: 0 }; groups.push(map[t.date]) }
    map[t.date].items.push(t); map[t.date].total += t.amount
  })
  const spent = cf.variableSpent
  const budget = cf.variableBudget
  const left = budget - spent
  const pctUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0
  return (
    <div>
      <div className="k-sec" style={{ marginTop: 16 }}>
        <div className="k-sec-head"><span className="k-label">Variable &middot; this cycle</span><span className="k-micro">{cycleLabel}</span></div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="k-num" style={{ fontSize: 22, fontWeight: 600 }}>{fmt(spent)}<span className="k-sar" style={{ marginLeft: 5 }}>SAR</span></span>
          <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>of {fmt(budget)} budget</span>
        </div>
        <Progress pct={pctUsed} color={left < 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-accent)'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span className="k-num" style={{ fontSize: 11, fontWeight: 600, color: left < 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-gain)' }}>
            {left >= 0 ? fmt(left) + ' left' : fmt(-left) + ' over'}
          </span>
          <span className="k-label dim">{pctUsed}% used &middot; {daysLeft} days left</span>
        </div>
      </div>
      {groups.length ? groups.map((g) => (
        <div key={g.date}>
          <div className="k-day">
            <span className="k-label">{dayLabel(g.date)}</span>
            <span className="k-day-tot">&minus;{fmt(g.total)}</span>
          </div>
          {g.items.map((t) => <TxRow key={t.id} t={t} onClick={() => nav.editTx(t)} />)}
        </div>
      )) : <Empty>Nothing spent yet this cycle.</Empty>}
    </div>
  )
}

function RecurringView({ bills, nav }) {
  const monthly = bills.filter((b) => b.type === 'monthly')
  const yearly = bills.filter((b) => b.type === 'yearly')
  const subs = monthly.filter((b) => b.sub)
  const fixed = monthly.filter((b) => !b.sub)
  const monthTotal = monthly.reduce((s, b) => s + b.amount, 0)
  const yearTotal = yearly.reduce((s, b) => s + b.amount, 0)
  const Row = ({ b }) => (
    <button className="k-row btn" onClick={() => nav.editBill(b)}>
      <CatSquare code={b.code} />
      <div className="k-row-main">
        <span className="k-row-name">{b.name}{b.sub && <Tag kind="mute">Sub</Tag>}</span>
        <span className="k-row-sub">{b.cat} &middot; {b.type === 'yearly' ? 'Yearly' : b.day ? 'Due ' + b.day : 'Monthly'}</span>
      </div>
      <div className="k-row-r">
        <span className="k-row-amt">{fmt(b.amount, b.amount % 1 ? 2 : 0)}</span>
        <span className="k-micro">{b.type === 'yearly' ? '/yr' : '/mo'}</span>
      </div>
    </button>
  )
  return (
    <div>
      <div className="k-sec" style={{ marginTop: 16 }}>
        <div className="k-stats">
          <div className="k-stat"><span className="k-label dim">Monthly fixed</span><span className="k-stat-val">{fmt(monthTotal, 0)}</span></div>
          <div className="k-stat"><span className="k-label dim">Yearly</span><span className="k-stat-val">{fmt(yearTotal)}</span></div>
        </div>
      </div>
      {fixed.length > 0 && <div className="k-day"><span className="k-label">Bills</span><span className="k-day-tot">{fixed.length}</span></div>}
      {fixed.map((b) => <Row key={b.id} b={b} />)}
      {subs.length > 0 && <div className="k-day"><span className="k-label">Subscriptions</span><span className="k-day-tot">{fmt(subs.reduce((s, b) => s + b.amount, 0), 2)}/mo</span></div>}
      {subs.map((b) => <Row key={b.id} b={b} />)}
      {yearly.length > 0 && <div className="k-day"><span className="k-label">Yearly</span><span className="k-day-tot">{yearly.length}</span></div>}
      {yearly.map((b) => <Row key={b.id} b={b} />)}
      {!bills.length && <Empty>No recurring bills yet. Tap ADD to log one.</Empty>}
    </div>
  )
}

function UpcomingView({ upcoming, wishlist, nav }) {
  return (
    <div>
      {upcoming.length > 0 && <div className="k-day" style={{ marginTop: 0 }}><span className="k-label">Upcoming expenses</span></div>}
      {upcoming.map((u) => (
        <button className="k-row btn" key={u.id} onClick={() => nav.editUpcoming(u)}>
          <span className="k-sq">{fmtDay(u.date).split(' ')[0]}</span>
          <div className="k-row-main">
            <span className="k-row-name">{u.name}</span>
            <span className="k-row-sub">{fmtDate(u.date)}</span>
          </div>
          <div className="k-row-r"><span className="k-row-amt">{fmt(u.amount)}</span></div>
        </button>
      ))}
      {wishlist.length > 0 && <div className="k-day"><span className="k-label">Wishlist &middot; someday</span></div>}
      {wishlist.map((w) => (
        <div className="k-row" key={w.id}>
          <span className="k-sq" style={{ color: 'var(--qahwa-fg-3)', borderStyle: 'dashed' }}>&middot;</span>
          <div className="k-row-main"><span className="k-row-name" style={{ color: 'var(--qahwa-fg-2)' }}>{w.name}</span></div>
          <div className="k-row-r"><span className="k-row-amt" style={{ color: 'var(--qahwa-fg-3)' }}>{fmt(w.amount)}</span></div>
        </div>
      ))}
      {!upcoming.length && !wishlist.length && <Empty>Nothing on the horizon. Tap ADD to plan one.</Empty>}
    </div>
  )
}

export function Spending({ data, nav, sub, setSub }) {
  const { bills, upcoming, wishlist, cashflow, cycleTxns } = data
  const cycleLabel = `${fmtDay(cashflow.cycleStart)} – ${fmtDay(cashflow.cycleEnd)}`
  const daysLeft = Math.max(0, Math.ceil((new Date(cashflow.cycleEnd) - new Date()) / 86400000))
  const onAdd = () => (sub === 'rec' ? nav.addBill() : sub === 'up' ? nav.addUpcoming() : nav.addTx())
  return (
    <div className="k-screen">
      <div className="k-phead">
        <div><div className="k-htitle">Spending</div></div>
        <button className="k-btn sm accent" onClick={onAdd}><span style={{ fontSize: 14, lineHeight: 0 }}>+</span> ADD</button>
      </div>
      <div className="k-sec" style={{ marginTop: 4 }}>
        <Segmented items={[{ v: 'tx', label: 'Transactions' }, { v: 'rec', label: 'Recurring' }, { v: 'up', label: 'Upcoming' }]}
          value={sub} onChange={setSub} />
      </div>
      <div key={sub}>
        {sub === 'tx' && <TransactionsView txns={cycleTxns} cf={cashflow} cycleLabel={cycleLabel} daysLeft={daysLeft} nav={nav} />}
        {sub === 'rec' && <RecurringView bills={bills} nav={nav} />}
        {sub === 'up' && <UpcomingView upcoming={upcoming} wishlist={wishlist} nav={nav} />}
      </div>
    </div>
  )
}

/* ---------- field helpers ---------- */
function AmountField({ value, onChange }) {
  return (
    <div className="k-field" style={{ marginTop: 14 }}>
      <span className="k-label dim">Amount &middot; SAR</span>
      <input className="k-input k-amount-in" inputMode="decimal" placeholder="0" value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
    </div>
  )
}
const DeleteBtn = ({ onClick }) => (
  <button className="k-btn ghost full" style={{ marginTop: 10, color: 'var(--qahwa-loss)', borderColor: 'var(--qahwa-loss)' }} onClick={onClick}>
    DELETE
  </button>
)

/* ---------- transaction add/edit ---------- */
export function TxSheet({ tx, onClose, onSave, onDelete }) {
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
          <div className="k-field"><span className="k-label dim">Name</span>
            <input className="k-input" placeholder="e.g. Tamimi Markets" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="k-field"><span className="k-label dim">Category</span>
            <div className="k-chips">{CATEGORIES.map((c) => <div key={c} className={'k-chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</div>)}</div></div>
          <div className="k-field"><span className="k-label dim">Date</span>
            <input className="k-input k-num" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="k-field"><span className="k-label dim">Note &middot; optional</span>
            <input className="k-input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button className="k-btn accent full" style={{ marginTop: 22, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(payload()); close() } }}>
            {tx ? 'SAVE CHANGES' : 'SAVE TO LEDGER'}
          </button>
          {tx && <DeleteBtn onClick={() => { onDelete(tx.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}

/* ---------- recurring bill/sub add/edit ---------- */
export function BillSheet({ bill, onClose, onSave, onDelete }) {
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
          <div className="k-field"><span className="k-label dim">Name</span>
            <input className="k-input" placeholder="e.g. Netflix" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="k-field"><span className="k-label dim">Category</span>
            <input className="k-input" placeholder="e.g. Utilities" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="k-field"><span className="k-label dim">Frequency</span>
            <Segmented items={[{ v: 'monthly', label: 'Monthly' }, { v: 'yearly', label: 'Yearly' }]} value={type} onChange={setType} /></div>
          <div className="k-field"><span className="k-label dim">Billing day</span>
            <input className="k-input k-num" inputMode="numeric" placeholder="—" value={day} onChange={(e) => setDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} /></div>
          <label className="k-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={sub} onChange={(e) => setSub(e.target.checked)} style={{ accentColor: 'var(--qahwa-accent)', width: 18, height: 18 }} />
            <span className="k-label dim" style={{ textTransform: 'none', letterSpacing: 0 }}>This is a subscription</span>
          </label>
          <button className="k-btn accent full" style={{ marginTop: 22, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(payload()); close() } }}>
            {bill ? 'SAVE CHANGES' : 'ADD RECURRING'}
          </button>
          {bill && <DeleteBtn onClick={() => { onDelete(bill.id); close() }} />}
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
          <div className="k-field"><span className="k-label dim">Name</span>
            <input className="k-input" placeholder="e.g. Car registration" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="k-field"><span className="k-label dim">Due date</span>
            <input className="k-input k-num" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <button className="k-btn accent full" style={{ marginTop: 22, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(payload()); close() } }}>
            {item ? 'SAVE CHANGES' : 'ADD UPCOMING'}
          </button>
          {item && <DeleteBtn onClick={() => { onDelete(item.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}
