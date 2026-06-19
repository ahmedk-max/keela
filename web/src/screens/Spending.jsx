/* Keela — Spending: money out (variable + recurring), pay-cycle aware, with edit/add */
import React from 'react'
import { CatSquare, Badge, Tag, Segmented, Empty, Progress, Sheet, CountUp, KeelaWhisper, SwipeRow, Icons } from '../ui/primitives'
import { fmt, fmtDate, fmtDay, CATEGORIES, MONTH_ABBR } from '../lib/format'
import { CAT, MISC, UPCOMING_COLOR, subLogo, getCat } from '../lib/icons'
import { spendStats, DailySpendChart, CategoryBars } from './spending-extras'
import { whispers } from '../lib/whispers'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TODAY = iso(new Date())
const YESTERDAY = iso(new Date(Date.now() - 86400000))

function dayLabel(d) {
  if (d === TODAY) return 'Today'
  if (d === YESTERDAY) return 'Yesterday'
  return fmtDate(d)
}

function TxRow({ t, onClick, onDelete }) {
  return (
    <SwipeRow actions={[
      { label: 'Edit', icon: Icons.edit, onClick },
      { label: 'Delete', kind: 'del', icon: Icons.trash, onClick: onDelete },
    ]}>
      <button className="k-row btn" onClick={onClick}>
        <CatSquare cat={t.cat} code={t.code} keela={t.source === 'keela'} />
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
    </SwipeRow>
  )
}

function TransactionsView({ txns, stats, cycleLabel, daysLeft, nav, whisper, budgets, onCatBudget }) {
  const groups = []
  const map = {}
  txns.forEach((t) => {
    if (!map[t.date]) { map[t.date] = { date: t.date, items: [], total: 0 }; groups.push(map[t.date]) }
    map[t.date].items.push(t); map[t.date].total += t.amount
  })
  const { curTotal, prevTotal, budget, dailyAvg, projected, paceVal, prevAtNow, cats } = stats
  const left = budget - curTotal
  const pctUsed = budget > 0 ? Math.round((curTotal / budget) * 100) : 0
  const overProjected = projected > budget && budget > 0
  const pacePct = prevAtNow ? Math.round((paceVal / prevAtNow) * 100) : null
  const up = paceVal > 0 // spending faster than last cycle = bad

  return (
    <div>
      {/* OVERVIEW — spent vs budget */}
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-sec-head"><span className="k-label">Variable &middot; this cycle</span><span className="k-micro">{cycleLabel}</span></div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
          <span className="k-num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}><CountUp value={curTotal} /><span className="k-sar" style={{ marginLeft: 6 }}>SAR</span></span>
          <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>of {fmt(budget)} budget</span>
        </div>
        <Progress pct={pctUsed} color={left < 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-accent)'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
          <span className="k-num" style={{ fontSize: 11, fontWeight: 600, color: left < 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-gain)' }}>
            {left >= 0 ? fmt(left) + ' left' : fmt(-left) + ' over'}
          </span>
          <span className="k-label dim">{pctUsed}% used &middot; {daysLeft} days left</span>
        </div>
      </div>

      {/* KEELA WHISPER */}
      {whisper && (
        <div className="k-sec" style={{ marginTop: 16 }}><KeelaWhisper>{whisper}</KeelaWhisper></div>
      )}

      {/* METRICS */}
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-figs" style={{ marginTop: 0 }}>
          <div className="k-fig"><span className="k-fig-val">{fmt(Math.round(dailyAvg))}<span className="k-sar" style={{ marginLeft: 4 }}>/d</span></span><span className="k-label dim">Avg / day</span></div>
          <div className="k-fig"><span className="k-fig-val" style={{ color: overProjected ? 'var(--qahwa-loss)' : 'var(--qahwa-fg-1)' }}>{fmt(projected)}</span><span className="k-label dim">Projected</span></div>
          <div className="k-fig"><span className="k-fig-val">{fmt(prevTotal)}</span><span className="k-label dim">Last cycle</span></div>
        </div>
      </div>

      {/* DAILY SPEND COLUMNS */}
      <div className="k-sec" style={{ marginTop: 30 }}>
        <div className="k-sec-head">
          <span className="k-label">Daily spend &middot; this cycle</span>
          {pacePct != null && (
            <span className={'k-num ' + (up ? 'k-loss' : 'k-gain')} style={{ fontSize: 11, fontWeight: 600 }}>
              {up ? '▲' : '▼'} {Math.abs(pacePct)}% vs last
            </span>
          )}
        </div>
        <DailySpendChart daily={stats.curDaily} avg={stats.dailyAvg} elapsed={stats.elapsed} cycleStart={stats.cycleStart} />
        <div className="k-chartleg" style={{ justifyContent: 'space-between' }}>
          <span className="k-micro k-num">{fmtDay(stats.cycleStart)}</span>
          <span><i className="k-chartleg-sw bud" />Avg {fmt(Math.round(dailyAvg))}/day</span>
          <span className="k-micro k-num">{fmtDay(stats.cycleEnd)}</span>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN */}
      {cats.length > 0 && (
        <div className="k-sec" style={{ marginTop: 30 }}>
          <div className="k-sec-head"><span className="k-label">Where it went</span><span className="k-micro">tap to set a budget</span></div>
          <CategoryBars cats={cats} total={curTotal} budgets={budgets} onEdit={onCatBudget} />
        </div>
      )}

      {/* LOG */}
      <div className="k-sec div" style={{ paddingBottom: 0 }}>
        <div className="k-sec-head" style={{ marginBottom: 0 }}><span className="k-label">Log</span><span className="k-micro">{txns.length} entries</span></div>
      </div>
      {groups.length ? groups.map((g) => (
        <div key={g.date}>
          <div className="k-day">
            <span className="k-label">{dayLabel(g.date)}</span>
            <span className="k-day-tot">&minus;{fmt(g.total)}</span>
          </div>
          {g.items.map((t) => <TxRow key={t.id} t={t} onClick={() => nav.editTx(t)} onDelete={() => nav.deleteTx(t.id)} />)}
        </div>
      )) : <Empty>Nothing spent yet this cycle.</Empty>}
    </div>
  )
}

/* ---------- Subscriptions & bills renewal calendar ----------
   Computes each monthly item's next renewal from its billing day, plots them on a
   30-day timeline, then lists them chronologically with a calendar date tile. */
function RenewalCalendar({ bills, nav }) {
  const DAY = 86400000
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const nextRenewal = (day) => {
    const mk = (yy, mm) => { const last = new Date(yy, mm + 1, 0).getDate(); return new Date(yy, mm, Math.min(day, last)) }
    let n = mk(today.getFullYear(), today.getMonth())
    if (n < today) n = mk(today.getFullYear(), today.getMonth() + 1)
    return n
  }
  const items = bills
    .filter((b) => b.type === 'monthly' && b.day)
    .map((b) => { const date = nextRenewal(b.day); return { ...b, date, days: Math.round((date - today) / DAY) } })
    .filter((i) => i.days <= 31)
    .sort((a, b) => a.days - b.days)
  if (!items.length) return null
  const total = items.reduce((s, i) => s + i.amount, 0)
  const rel = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n}d`)
  return (
    <div className="k-sec" style={{ marginTop: 30 }}>
      <div className="k-sec-head">
        <span className="k-label">Renewals &middot; next 30 days</span>
        <span className="k-num" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(total)}<span className="k-sar" style={{ marginLeft: 4 }}>SAR</span></span>
      </div>
      <div className="k-renew-track">
        {items.map((i) => (
          <span key={i.id} className="k-renew-pip" title={`${i.name} · ${rel(i.days)}`}
            style={{ left: Math.min(100, (i.days / 30) * 100) + '%', background: i.sub ? 'var(--qahwa-accent)' : 'var(--qahwa-loss)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 }}>
        <span className="k-micro">today</span>
        <span className="k-micro">in 30 days</span>
      </div>
      {items.map((i) => (
        <button className="k-row btn" key={i.id} onClick={() => nav.editBill(i)}>
          <span className="k-caltile"><b>{i.date.getDate()}</b><span>{MONTH_ABBR[i.date.getMonth()]}</span></span>
          <div className="k-row-main">
            <span className="k-row-name">{i.name}{i.sub && <Tag kind="mute">Sub</Tag>}</span>
            <span className="k-row-sub">{rel(i.days)} &middot; {i.cat}</span>
          </div>
          <div className="k-row-r">
            <span className="k-row-amt">{fmt(i.amount, i.amount % 1 ? 2 : 0)}</span>
            <span className="k-micro">/mo</span>
          </div>
        </button>
      ))}
    </div>
  )
}

function RecurringView({ bills, cf, nav }) {
  const monthly = bills.filter((b) => b.type === 'monthly')
  const yearly = bills.filter((b) => b.type === 'yearly')
  const subs = monthly.filter((b) => b.sub)
  const fixed = monthly.filter((b) => !b.sub)
  const fixedTotal = fixed.reduce((s, b) => s + b.amount, 0)
  const subsTotal = subs.reduce((s, b) => s + b.amount, 0)
  const monthTotal = monthly.reduce((s, b) => s + b.amount, 0)
  const yearTotal = yearly.reduce((s, b) => s + b.amount, 0)
  const annualized = monthTotal * 12 + yearTotal
  const incomePct = cf?.income ? Math.round((monthTotal / cf.income) * 100) : null
  const Row = ({ b }) => {
    const logo = b.sub ? subLogo(b.name) : null
    return (
    <SwipeRow actions={[
      { label: 'Edit', icon: Icons.edit, onClick: () => nav.editBill(b) },
      { label: 'Delete', kind: 'del', icon: Icons.trash, onClick: () => nav.deleteBill(b.id) },
    ]}>
      <button className="k-row btn" onClick={() => nav.editBill(b)}>
        {b.sub
          ? <Badge icon={logo ? logo.icon : CAT.Subscriptions.icon} color={logo ? logo.color : CAT.Subscriptions.color} />
          : <CatSquare cat={b.cat} code={b.code} />}
        <div className="k-row-main">
          <span className="k-row-name">{b.name}{b.sub && <Tag kind="mute">Sub</Tag>}</span>
          <span className="k-row-sub">{b.cat} &middot; {b.type === 'yearly' ? 'Yearly' : b.day ? 'Due ' + b.day : 'Monthly'}</span>
        </div>
        <div className="k-row-r">
          <span className="k-row-amt">{fmt(b.amount, b.amount % 1 ? 2 : 0)}</span>
          <span className="k-micro">{b.type === 'yearly' ? '/yr' : '/mo'}</span>
        </div>
      </button>
    </SwipeRow>
    )
  }
  const leg = (c, label, val) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
      <span className="k-swatch" style={{ width: 9, height: 9, background: c }} />
      <span className="k-micro" style={{ color: 'var(--qahwa-fg-2)' }}>{label}</span>
      <span className="k-num" style={{ fontSize: 11, fontWeight: 600 }}>{fmt(val)}</span>
    </span>
  )
  return (
    <div>
      {/* OVERVIEW — monthly commitment */}
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-sec-head"><span className="k-label">Recurring &middot; monthly commitment</span></div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 }}>
          <span className="k-num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmt(monthTotal)}<span className="k-sar" style={{ marginLeft: 6 }}>/mo</span></span>
          <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>{fmt(annualized)} / yr</span>
        </div>
        {monthTotal > 0 && (
          <>
            <div className="k-flowbar">
              {fixedTotal > 0 && <div className="k-flowbar-seg" style={{ width: (fixedTotal / monthTotal * 100) + '%', background: 'var(--qahwa-loss)' }} />}
              {subsTotal > 0 && <div className="k-flowbar-seg" style={{ width: (subsTotal / monthTotal * 100) + '%', background: 'var(--qahwa-accent)' }} />}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 14 }}>
              {leg('var(--qahwa-loss)', 'Fixed', fixedTotal)}
              {leg('var(--qahwa-accent)', 'Subscriptions', subsTotal)}
            </div>
          </>
        )}
      </div>

      {/* METRICS */}
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-figs" style={{ marginTop: 0 }}>
          <div className="k-fig"><span className="k-fig-val">{fixed.length}</span><span className="k-label dim">Bills</span></div>
          <div className="k-fig"><span className="k-fig-val">{subs.length}</span><span className="k-label dim">Subscriptions</span></div>
          <div className="k-fig"><span className="k-fig-val">{incomePct != null ? incomePct + '%' : '—'}</span><span className="k-label dim">Of income</span></div>
        </div>
      </div>

      {/* RENEWAL CALENDAR — when each subscription / bill comes due */}
      <RenewalCalendar bills={bills} nav={nav} />

      <div className="k-sec div" style={{ paddingBottom: 0 }}>
        <div className="k-sec-head" style={{ marginBottom: 0 }}><span className="k-label">All recurring</span><span className="k-micro">{bills.length}</span></div>
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

function UpcomingView({ upcoming, wishlist, cf, nav }) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const daysTo = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - now) / 86400000) }
  const rel = (iso) => { const d = daysTo(iso); return d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d}d` }
  const total = upcoming.reduce((s, u) => s + u.amount, 0)
  const next = upcoming[0]
  const dueThisCycle = upcoming.filter((u) => u.date < cf.cycleEnd).reduce((s, u) => s + u.amount, 0)
  const wishTotal = wishlist.reduce((s, w) => s + w.amount, 0)
  return (
    <div>
      {upcoming.length > 0 && (
        <>
          {/* OVERVIEW */}
          <div className="k-sec" style={{ marginTop: 18 }}>
            <div className="k-sec-head"><span className="k-label">Upcoming &middot; planned outflows</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="k-num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmt(total)}<span className="k-sar" style={{ marginLeft: 6 }}>SAR</span></span>
              <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>{upcoming.length} planned</span>
            </div>
          </div>
          {/* METRICS */}
          <div className="k-sec" style={{ marginTop: 18 }}>
            <div className="k-figs" style={{ marginTop: 0 }}>
              <div className="k-fig"><span className="k-fig-val" style={{ color: 'var(--qahwa-accent)' }}>{next ? rel(next.date) : '—'}</span><span className="k-label dim">Next due</span></div>
              <div className="k-fig"><span className="k-fig-val">{fmt(dueThisCycle)}</span><span className="k-label dim">This cycle</span></div>
              <div className="k-fig"><span className="k-fig-val">{fmt(wishTotal)}</span><span className="k-label dim">Wishlist</span></div>
            </div>
          </div>
          <div className="k-sec div" style={{ paddingBottom: 0 }}>
            <div className="k-sec-head" style={{ marginBottom: 0 }}><span className="k-label">Scheduled</span><span className="k-micro">{upcoming.length}</span></div>
          </div>
        </>
      )}
      {upcoming.map((u) => (
        <SwipeRow key={u.id} actions={[
          { label: 'Edit', icon: Icons.edit, onClick: () => nav.editUpcoming(u) },
          { label: 'Delete', kind: 'del', icon: Icons.trash, onClick: () => nav.deleteUpcoming(u.id) },
        ]}>
          <button className="k-row btn" onClick={() => nav.editUpcoming(u)}>
            <Badge icon={MISC.calendar} color={UPCOMING_COLOR} />
            <div className="k-row-main">
              <span className="k-row-name">{u.name}</span>
              <span className="k-row-sub">{fmtDate(u.date)} &middot; {rel(u.date)}</span>
            </div>
            <div className="k-row-r"><span className="k-row-amt">{fmt(u.amount)}</span></div>
          </button>
        </SwipeRow>
      ))}
      {upcoming.length === 0 && (
        <div className="k-sec" style={{ marginTop: 18 }}><Empty>Nothing scheduled. Tap ADD to plan an upcoming expense.</Empty></div>
      )}
      <div className="k-day">
        <span className="k-label">Wishlist &middot; someday</span>
        <button className="k-addlink" onClick={() => nav.addWishlist()}>+ Add</button>
      </div>
      {wishlist.map((w) => (
        <SwipeRow key={w.id} actions={[
          { label: 'Edit', icon: Icons.edit, onClick: () => nav.editWishlist(w) },
          { label: 'Delete', kind: 'del', icon: Icons.trash, onClick: () => nav.deleteWish(w.id) },
        ]}>
          <button className="k-row btn" onClick={() => nav.editWishlist(w)}>
            <Badge icon={MISC.star} dashed />
            <div className="k-row-main"><span className="k-row-name" style={{ color: 'var(--qahwa-fg-2)' }}>{w.name}</span></div>
            <div className="k-row-r"><span className="k-row-amt" style={{ color: 'var(--qahwa-fg-3)' }}>{fmt(w.amount)}</span></div>
          </button>
        </SwipeRow>
      ))}
      {wishlist.length === 0 && (
        <div className="k-row"><span className="k-micro" style={{ fontStyle: 'italic', color: 'var(--qahwa-fg-3)' }}>Nothing saved yet &mdash; tap &ldquo;+ Add&rdquo;.</span></div>
      )}
    </div>
  )
}

export function Spending({ data, nav, sub, setSub }) {
  const { bills, upcoming, wishlist, cashflow, cycleTxns } = data
  const cycleLabel = `${fmtDay(cashflow.cycleStart)} – ${fmtDay(cashflow.cycleEnd)}`
  const daysLeft = Math.max(0, Math.ceil((new Date(cashflow.cycleEnd) - new Date()) / 86400000))
  const stats = spendStats(data)
  const hints = whispers(data)
  const spendHint = hints[1] || hints[0] // vary from Home (which shows hints[0])
  const budgets = data.profile.categoryBudgets || {}
  const onAdd = () => (sub === 'rec' ? nav.addBill() : sub === 'up' ? nav.addUpcoming() : nav.addTx())
  return (
    <div className="k-screen">
      <div className="k-phead">
        <div><div className="k-htitle">Spending</div></div>
        <button className="k-btn sm accent" onClick={onAdd}><span style={{ fontSize: 14, lineHeight: 0 }}>+</span> ADD</button>
      </div>
      <div className="k-sec" style={{ marginTop: 14 }}>
        <Segmented items={[{ v: 'tx', label: 'Transactions' }, { v: 'rec', label: 'Recurring' }, { v: 'up', label: 'Upcoming' }]}
          value={sub} onChange={setSub} />
      </div>
      <div key={sub}>
        {sub === 'tx' && <TransactionsView txns={cycleTxns} stats={stats} cycleLabel={cycleLabel} daysLeft={daysLeft} nav={nav} whisper={spendHint} budgets={budgets} onCatBudget={nav.editCatBudget} />}
        {sub === 'rec' && <RecurringView bills={bills} cf={cashflow} nav={nav} />}
        {sub === 'up' && <UpcomingView upcoming={upcoming} wishlist={wishlist} cf={cashflow} nav={nav} />}
      </div>
    </div>
  )
}

/* ---------- field helpers ---------- */
function AmountField({ value, onChange }) {
  return (
    <div className="k-field" style={{ marginTop: 14 }}>
      <span className="k-label dim">Amount</span>
      <div className="k-amountrow">
        <input className="k-input k-amount-in" inputMode="decimal" placeholder="0" value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))} data-autofocus />
        <span className="k-amountcur">SAR</span>
      </div>
    </div>
  )
}

/* colourful icon category picker */
function CategoryPicker({ value, onChange }) {
  return (
    <div className="k-catpick">
      {CATEGORIES.map((c) => {
        const meta = CAT[c]
        return (
          <button key={c} type="button" className={'k-catchip' + (value === c ? ' on' : '')}
            style={{ '--c': meta ? meta.color : 'var(--qahwa-fg-3)' }} onClick={() => onChange(c)}>
            {meta && <span className="k-catchip-ic">{meta.icon}</span>}
            {c}
          </button>
        )
      })}
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
            <CategoryPicker value={cat} onChange={setCat} /></div>
          <div className="k-field"><span className="k-label dim">Date</span>
            <input className="k-input k-num" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="k-field"><span className="k-label dim">Note &middot; optional</span>
            <input className="k-input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
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
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
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
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(payload()); close() } }}>
            {item ? 'SAVE CHANGES' : 'ADD UPCOMING'}
          </button>
          {item && <DeleteBtn onClick={() => { onDelete(item.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}

/* ---------- per-category budget set/clear ---------- */
export function CategoryBudgetSheet({ cat, cap, onClose, onSave }) {
  const [amount, setAmount] = React.useState(cap ? String(cap) : '')
  const meta = getCat(cat)
  const num = Math.round((parseFloat(amount) || 0) * 100) / 100
  return (
    <Sheet title={`Budget · ${cat}`} onClose={onClose}>
      {(close) => (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {meta && <span className="k-catbar-ic" style={{ '--c': meta.color, width: 30, height: 30 }}>{meta.icon}</span>}
            <span className="k-label dim" style={{ textTransform: 'none', letterSpacing: 0, flex: 1, minWidth: 0 }}>
              A monthly cap for {cat}. &ldquo;Where it went&rdquo; turns red once you cross it.
            </span>
          </div>
          <AmountField value={amount} onChange={setAmount} />
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: num > 0 ? 1 : 0.4, pointerEvents: num > 0 ? 'auto' : 'none' }}
            onClick={() => { if (num > 0) { onSave(cat, num); close() } }}>
            {cap ? 'UPDATE BUDGET' : 'SET BUDGET'}
          </button>
          {cap > 0 && (
            <button className="k-btn ghost full" style={{ marginTop: 10, color: 'var(--qahwa-loss)', borderColor: 'var(--qahwa-loss)' }}
              onClick={() => { onSave(cat, 0); close() }}>
              CLEAR BUDGET
            </button>
          )}
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
          <div className="k-field"><span className="k-label dim">Name</span>
            <input className="k-input" placeholder="e.g. Sony WH-1000XM5" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(payload()); close() } }}>
            {item ? 'SAVE CHANGES' : 'ADD TO WISHLIST'}
          </button>
          {item && <DeleteBtn onClick={() => { onDelete(item.id); close() }} />}
        </>
      )}
    </Sheet>
  )
}
