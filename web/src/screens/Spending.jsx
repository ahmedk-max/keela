/* Keela — Spending: money out (variable + recurring + upcoming), pay-cycle aware.
   "Warm" soft-rounded reskin: donut + mini-rings + daily bars + category list +
   grouped log. Swipe-to-edit/delete preserved (local SwipeRow), category budgets,
   subscription logos and the renewal calendar all carried over from the old look. */
import React from 'react'
import { useTheme, tint } from '../lib/theme'
import { fmt, fmtDate, fmtDay, MONTH_ABBR } from '../lib/format'
import { CAT, MISC, UPCOMING_COLOR, subLogo, getCat } from '../lib/icons'
import {
  Segmented, Donut, Ring, Bars, Progress, CatTile, CountUp, KeelaWhisper, Empty, Icons,
} from '../ui/primitives'
import { spendStats } from './spending-extras'
import { whispers } from '../lib/whispers'

const DAY = 86400000
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TODAY = iso(new Date())
const YESTERDAY = iso(new Date(Date.now() - DAY))

function dayLabel(d) {
  if (d === TODAY) return 'Today'
  if (d === YESTERDAY) return 'Yesterday'
  return fmtDate(d)
}

/* ---------- Swipe-to-act row ----------
   Tap fires the primary action (edit); a horizontal drag reveals Edit + Delete
   buttons underneath. Vertical scroll is preserved (we only hijack once a mostly-
   horizontal drag is detected). Re-skinned to the rounded warm look. */
function SwipeRow({ onEdit, onDelete, children }) {
  const th = useTheme()
  const [dx, setDx] = React.useState(0)
  const open = React.useRef(false)
  const start = React.useRef(null)
  const drag = React.useRef(false)
  const REVEAL = 132

  const onDown = (e) => {
    const p = e.touches ? e.touches[0] : e
    start.current = { x: p.clientX, y: p.clientY, base: open.current ? -REVEAL : 0 }
    drag.current = false
  }
  const onMove = (e) => {
    if (!start.current) return
    const p = e.touches ? e.touches[0] : e
    const mx = p.clientX - start.current.x
    const my = p.clientY - start.current.y
    if (!drag.current) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      if (Math.abs(mx) <= Math.abs(my)) { start.current = null; return } // vertical → let it scroll
      drag.current = true
    }
    const next = Math.min(0, Math.max(-REVEAL, start.current.base + mx))
    setDx(next)
  }
  const onUp = () => {
    if (!start.current) return
    const snap = dx < -REVEAL / 2
    open.current = snap
    setDx(snap ? -REVEAL : 0)
    start.current = null
  }
  const reset = () => { open.current = false; setDx(0) }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* action layer */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingRight: 2 }}>
        <button onClick={() => { reset(); onEdit && onEdit() }} aria-label="Edit" style={{
          width: 54, height: 44, flex: 'none', border: 'none', borderRadius: 14, cursor: 'pointer',
          background: tint(th.accent, 16), color: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icons.ico('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z')}</button>
        <button onClick={() => { reset(); onDelete && onDelete() }} aria-label="Delete" style={{
          width: 54, height: 44, flex: 'none', border: 'none', borderRadius: 14, cursor: 'pointer',
          background: tint(th.loss, 16), color: th.loss, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icons.ico('M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14')}</button>
      </div>
      {/* sliding content */}
      <div
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        onPointerDown={(e) => { if (e.pointerType === 'mouse') return; onDown(e) }}
        onPointerMove={(e) => { if (e.pointerType === 'mouse') return; onMove(e) }}
        onPointerUp={(e) => { if (e.pointerType === 'mouse') return; onUp(e) }}
        style={{ position: 'relative', background: th.bg, transform: `translateX(${dx}px)`, transition: start.current ? 'none' : 'transform .24s cubic-bezier(.2,.8,.2,1)', touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  )
}

/* shared list-row chrome (icon · name+sub · amount+meta) */
function rowBtnStyle(th) {
  return {
    display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
    border: 'none', background: 'none', padding: '13px 0', borderBottom: `1px solid ${th.line}`,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
function ListRow({ tile, name, sub, right, rightSub, onClick, tag, dimName }) {
  const th = useTheme()
  return (
    <button onClick={onClick} style={rowBtnStyle(th)}>
      {tile}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: dimName ? 600 : 700, color: dimName ? th.ink2 : th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          {tag}
        </span>
        {sub != null && <span style={{ display: 'block', fontSize: 11.5, color: th.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{sub}</span>}
      </span>
      <span style={{ textAlign: 'right', flex: 'none' }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: dimName ? th.ink3 : th.ink }}>{right}</span>
        {rightSub != null && <span style={{ display: 'block', fontSize: 10.5, color: th.ink3, marginTop: 1 }}>{rightSub}</span>}
      </span>
    </button>
  )
}

const SubTag = ({ th }) => (
  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3, background: th.card2, borderRadius: 6, padding: '2px 5px', flex: 'none' }}>Sub</span>
)

const secStyle = (th) => ({ padding: '22px 0 2px', marginTop: 16, borderTop: `1px solid ${th.line}` })
const dayHead = (th) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px 8px' })
const dayLbl = (th) => ({ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3 })

/* ============ TRANSACTIONS ============ */
function TransactionsView({ txns, stats, cycleLabel, daysLeft, cf, nav, whisper, budgets }) {
  const th = useTheme()
  const groups = []
  const map = {}
  txns.forEach((t) => {
    if (!map[t.date]) { map[t.date] = { date: t.date, items: [], total: 0 }; groups.push(map[t.date]) }
    map[t.date].items.push(t); map[t.date].total += t.amount
  })
  const { curTotal, prevTotal, budget, dailyAvg, projected, paceVal, prevAtNow, cats } = stats
  const left = budget - curTotal
  const pctUsed = budget > 0 ? Math.round((curTotal / budget) * 100) : 0
  const barFillPct = Math.min(100, pctUsed)
  const overProjected = projected > budget && budget > 0
  const pacePct = prevAtNow ? Math.round((paceVal / prevAtNow) * 100) : null
  const up = paceVal > 0 // spending faster than last cycle = bad
  const barColor = left < 0 ? th.loss : th.accent
  const leftColor = left < 0 ? th.loss : th.gain
  const catMax = cats.length ? cats[0].amount : 1

  // mini rings — income / spending / net (mirrors prototype 1167-1173)
  const expenses = cf.fixed + cf.subs
  const income = cf.income
  const spentAll = expenses + curTotal
  const net = income - spentAll
  const rings = [
    { label: 'Income', val: income, pct: 100, color: th.green, icon: CAT.Other.icon },
    { label: 'Spending', val: spentAll, pct: income > 0 ? (spentAll / income) * 100 : 0, color: th.accent, icon: CAT.Shopping.icon },
    { label: 'Net', val: net, pct: income > 0 ? Math.max(0, (net / income) * 100) : 0, color: th.rose, icon: CAT.Groceries.icon },
  ]

  return (
    <div>
      {/* DONUT — spent vs budget */}
      <div style={{ padding: '4px 0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: th.ink2 }}>This cycle</span>
          <span style={{ fontSize: 11, color: th.ink3 }}>{cycleLabel}</span>
        </div>
        <Donut cats={cats} total={curTotal} style={{ margin: '6px auto 4px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: th.ink3 }}>Total spend</span>
          <CountUp value={curTotal} style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: th.ink, marginTop: 2 }} />
          <span style={{ fontSize: 11, color: th.ink3 }}>of {fmt(budget)} budget</span>
        </Donut>
        <Progress pct={barFillPct} color={barColor} height={9} style={{ marginTop: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: leftColor }}>{left >= 0 ? `${fmt(left)} left` : `${fmt(-left)} over`}</span>
          <span style={{ color: th.ink3 }}>{Math.min(100, pctUsed)}% used · {daysLeft} days left</span>
        </div>
      </div>

      {/* KEELA WHISPER */}
      {whisper && <div style={{ marginTop: 16 }}><KeelaWhisper>{whisper}</KeelaWhisper></div>}

      {/* MINI RINGS */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {rings.map((r) => (
          <div key={r.label} style={{ flex: 1, padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Ring pct={Math.min(100, r.pct)} size={54} stroke={5} color={r.color}>
              <span style={{ width: 18, height: 18, display: 'flex', color: r.color }}>{r.icon}</span>
            </Ring>
            <span style={{ fontSize: 11, color: th.ink3, marginTop: 10 }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: th.ink, marginTop: 2 }}>{fmt(r.val)}</span>
          </div>
        ))}
      </div>

      {/* METRICS */}
      <div style={{ display: 'flex', gap: 18, padding: '20px 0 18px', marginTop: 8, borderTop: `1px solid ${th.line}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: th.ink }}>{fmt(Math.round(dailyAvg))}<span style={{ fontSize: 11, color: th.ink3, fontWeight: 600 }}>/d</span></div>
          <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>Avg / day</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: overProjected ? th.loss : th.ink }}>{fmt(projected)}</div>
          <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>Projected</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: th.ink }}>{fmt(prevTotal)}</div>
          <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>Last cycle</div>
        </div>
      </div>

      {/* DAILY BARS */}
      <div style={{ padding: '22px 0 2px', marginTop: 16, borderTop: `1px solid ${th.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: th.ink2 }}>Daily spend</span>
          {pacePct != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: up ? th.loss : th.gain }}>{up ? '▲' : '▼'} {Math.abs(pacePct)}% vs last</span>
          )}
        </div>
        <Bars values={stats.curDaily} elapsedIdx={stats.elapsed} color={th.accent} peakColor={th.accentPress} style={{ marginTop: 18 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: th.ink3 }}>
          <span>{fmtDay(stats.cycleStart)}</span>
          <span>Avg {fmt(Math.round(dailyAvg))}/day</span>
          <span>{fmtDay(stats.cycleEnd)}</span>
        </div>
      </div>

      {/* WHERE IT WENT — category list (tap a row to set a budget) */}
      {cats.length > 0 && (
        <div style={{ padding: '22px 0 2px', marginTop: 16, borderTop: `1px solid ${th.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: th.ink2 }}>Where it went</span>
            <span style={{ fontSize: 11, color: th.ink3 }}>tap to set a budget</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
            {cats.map((c) => {
              const cap = budgets[c.cat] || 0
              const over = cap > 0 && c.amount > cap
              const w = Math.max(3, (c.amount / catMax) * 100)
              const capPct = cap > 0 ? Math.min(100, (cap / catMax) * 100) : null
              const pct = cap > 0 ? Math.round((c.amount / cap) * 100) : (curTotal ? Math.round((c.amount / curTotal) * 100) : 0)
              return (
                <button key={c.cat} onClick={() => nav.editCatBudget(c.cat, cap)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none',
                  padding: 0, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left',
                }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: over ? th.loss : c.color, flex: 'none' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: th.ink, width: 74, flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.cat}</span>
                  <span style={{ position: 'relative', flex: 1, height: 7, borderRadius: 999, background: th.track, overflow: 'visible' }}>
                    <i style={{ display: 'block', height: '100%', width: `${w}%`, background: over ? th.loss : c.color, borderRadius: 999 }} />
                    {capPct != null && <span style={{ position: 'absolute', top: -2, bottom: -2, width: 2, borderRadius: 2, background: th.ink2, left: `${capPct}%` }} />}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: over ? th.loss : th.ink, width: 42, textAlign: 'right', flex: 'none' }}>{fmt(c.amount)}</span>
                  <span style={{ fontSize: 11, color: over ? th.loss : th.ink3, width: 32, textAlign: 'right', flex: 'none' }}>{pct}%</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* LOG — grouped by day */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: th.ink }}>Log</span>
          <span style={{ fontSize: 11, color: th.ink3 }}>{txns.length} entries</span>
        </div>
        {groups.length ? groups.map((g) => (
          <div key={g.date}>
            <div style={dayHead(th)}>
              <span style={dayLbl(th)}>{dayLabel(g.date)}</span>
              <span style={{ ...dayLbl(th), color: th.ink3 }}>−{fmt(g.total)}</span>
            </div>
            {g.items.map((t) => {
              const meta = getCat(t.cat) || CAT.Other
              return (
                <SwipeRow key={t.id} onEdit={() => nav.editTx(t)} onDelete={() => nav.deleteTx(t.id)}>
                  <ListRow
                    onClick={() => nav.editTx(t)}
                    tile={<CatTile color={meta.color} icon={meta.icon} />}
                    name={t.name}
                    tag={t.source === 'keela' ? <span style={{ fontSize: 9, fontWeight: 800, color: th.accent, background: th.accentSoft, borderRadius: 6, padding: '2px 5px', flex: 'none' }}>K</span> : null}
                    sub={t.cat + (t.note ? ' · ' + t.note : '')}
                    right={`−${fmt(t.amount, t.amount % 1 ? 2 : 0)}`}
                    rightSub={t.time}
                  />
                </SwipeRow>
              )
            })}
          </div>
        )) : <Empty>Nothing spent yet this cycle.</Empty>}
      </div>
    </div>
  )
}

/* ---------- Renewal calendar (next 30 days of monthly bills/subs) ---------- */
function RenewalCalendar({ bills, nav }) {
  const th = useTheme()
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
    <div style={{ padding: '22px 0 2px', marginTop: 16, borderTop: `1px solid ${th.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: th.ink2 }}>Renewals · next 30 days</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: th.ink }}>{fmt(total)}<span style={{ fontSize: 11, color: th.ink3, marginLeft: 4 }}>SAR</span></span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 999, background: th.track, margin: '16px 0 6px' }}>
        {items.map((i) => (
          <span key={i.id} title={`${i.name} · ${rel(i.days)}`} style={{
            position: 'absolute', top: -2, width: 4, height: 12, borderRadius: 999,
            transform: 'translateX(-50%)', left: `${Math.min(100, (i.days / 30) * 100)}%`,
            background: i.sub ? th.accent : th.loss,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: th.ink3, marginBottom: 4 }}>
        <span>today</span><span>in 30 days</span>
      </div>
      {items.map((i) => {
        const logo = i.sub ? subLogo(i.name) : null
        const meta = getCat(i.cat) || CAT.Other
        const color = logo ? logo.color : meta.color
        const icon = logo ? logo.icon : meta.icon
        return (
          <button key={i.id} onClick={() => nav.editBill(i)} style={rowBtnStyle(th)}>
            <span style={{ width: 40, height: 40, flex: 'none', borderRadius: 13, background: th.card2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              <b style={{ fontSize: 14, fontWeight: 800, color: th.ink }}>{i.date.getDate()}</b>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.04em', color: th.ink3 }}>{MONTH_ABBR[i.date.getMonth()]}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: th.ink }}>{i.name}</span>
                {i.sub && <SubTag th={th} />}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: th.ink3, marginTop: 2 }}>{rel(i.days)} · {i.cat}</span>
            </span>
            <span style={{ textAlign: 'right', flex: 'none' }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: th.ink }}>{fmt(i.amount, i.amount % 1 ? 2 : 0)}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: th.ink3 }}>/mo</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ============ RECURRING ============ */
function RecurringView({ bills, cf, nav }) {
  const th = useTheme()
  const dim = 'rgba(243,238,227,.55)'
  const monthly = bills.filter((b) => b.type === 'monthly')
  const yearly = bills.filter((b) => b.type === 'yearly')
  const subs = monthly.filter((b) => b.sub)
  const fixed = monthly.filter((b) => !b.sub)
  const fixedTotal = fixed.reduce((s, b) => s + b.amount, 0)
  const subsTotal = subs.reduce((s, b) => s + b.amount, 0)
  const monthTotal = monthly.reduce((s, b) => s + b.amount, 0)
  const yearTotal = yearly.reduce((s, b) => s + b.amount, 0)
  const annualized = monthTotal * 12 + yearTotal
  const incomePct = cf?.income ? Math.round((monthTotal / cf.income) * 100) + '%' : '—'
  const fixedW = monthTotal > 0 ? (fixedTotal / monthTotal) * 100 : 0
  const subsW = monthTotal > 0 ? (subsTotal / monthTotal) * 100 : 0

  const Row = ({ b }) => {
    const logo = b.sub ? subLogo(b.name) : null
    const meta = getCat(b.cat) || CAT.Subscriptions
    const color = logo ? logo.color : (b.sub ? CAT.Subscriptions.color : meta.color)
    const icon = logo ? logo.icon : (b.sub ? CAT.Subscriptions.icon : meta.icon)
    return (
      <SwipeRow onEdit={() => nav.editBill(b)} onDelete={() => nav.deleteBill(b.id)}>
        <ListRow
          onClick={() => nav.editBill(b)}
          tile={<CatTile color={color} icon={icon} />}
          name={b.name}
          tag={b.sub ? <SubTag th={th} /> : null}
          sub={`${b.cat} · ${b.type === 'yearly' ? 'Yearly' : b.day ? 'Due ' + b.day : 'Monthly'}`}
          right={fmt(b.amount, b.amount % 1 ? 2 : 0)}
          rightSub={b.type === 'yearly' ? '/yr' : '/mo'}
        />
      </SwipeRow>
    )
  }
  const leg = (c, label, val) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
      <span style={{ fontSize: 11, color: dim }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: th.onDark }}>{fmt(val)}</span>
    </span>
  )
  return (
    <div>
      {/* DARK COMMITMENT CARD */}
      <div style={{ background: th.darkcard, borderRadius: 28, padding: 22, color: th.onDark, boxShadow: th.shadow }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: dim }}>Monthly commitment</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em' }}>{fmt(monthTotal)}<span style={{ fontSize: 13, color: 'rgba(243,238,227,.5)', fontWeight: 600 }}> /mo</span></span>
          <span style={{ fontSize: 12, color: dim }}>{fmt(annualized)} / yr</span>
        </div>
        {monthTotal > 0 && (
          <>
            <div style={{ display: 'flex', height: 11, borderRadius: 999, overflow: 'hidden', gap: 3, marginTop: 16 }}>
              {fixedTotal > 0 && <div style={{ width: `${fixedW}%`, background: th.loss, borderRadius: 999 }} />}
              {subsTotal > 0 && <div style={{ width: `${subsW}%`, background: th.accent, borderRadius: 999 }} />}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 13 }}>
              {leg(th.loss, 'Fixed', fixedTotal)}
              {leg(th.accent, 'Subscriptions', subsTotal)}
            </div>
          </>
        )}
      </div>

      {/* METRICS */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {[
          { v: fixed.length, l: 'Bills' },
          { v: subs.length, l: 'Subscriptions' },
          { v: incomePct, l: 'Of income' },
        ].map((f, i) => (
          <div key={i} style={{ flex: 1, padding: '18px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: th.ink }}>{f.v}</div>
            <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>{f.l}</div>
          </div>
        ))}
      </div>

      {/* RENEWAL CALENDAR */}
      <RenewalCalendar bills={bills} nav={nav} />

      {/* ALL RECURRING — grouped */}
      <div style={{ marginTop: 18 }}>
        {fixed.length > 0 && <div style={{ ...dayLbl(th), padding: '12px 4px 6px' }}>Bills</div>}
        {fixed.map((b) => <Row key={b.id} b={b} />)}
        {subs.length > 0 && <div style={{ ...dayLbl(th), padding: '12px 4px 6px' }}>Subscriptions</div>}
        {subs.map((b) => <Row key={b.id} b={b} />)}
        {yearly.length > 0 && <div style={{ ...dayLbl(th), padding: '12px 4px 6px' }}>Yearly</div>}
        {yearly.map((b) => <Row key={b.id} b={b} />)}
        {!bills.length && <Empty>No recurring bills yet. Tap + Add to log one.</Empty>}
      </div>
    </div>
  )
}

/* ============ UPCOMING ============ */
function UpcomingView({ upcoming, wishlist, cf, nav }) {
  const th = useTheme()
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const daysTo = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - now) / DAY) }
  const rel = (s) => { const d = daysTo(s); return d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d}d` }
  const total = upcoming.reduce((s, u) => s + u.amount, 0)
  const next = upcoming[0]
  const dueThisCycle = upcoming.filter((u) => u.date < cf.cycleEnd).reduce((s, u) => s + u.amount, 0)
  const wishTotal = wishlist.reduce((s, w) => s + w.amount, 0)
  return (
    <div>
      {/* PLANNED OUTFLOWS */}
      <div style={{ padding: '4px 0 2px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: th.ink3 }}>Planned outflows</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', color: th.ink, marginTop: 10 }}>
          <CountUp value={total} /><span style={{ fontSize: 13, color: th.ink3, fontWeight: 600 }}> SAR</span>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div style={{ display: 'flex', gap: 18, padding: '18px 0', marginTop: 8, borderTop: `1px solid ${th.line}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: th.accent }}>{next ? rel(next.date) : '—'}</div>
            <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>Next due</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: th.ink }}>{fmt(dueThisCycle)}</div>
            <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>This cycle</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: th.ink }}>{fmt(wishTotal)}</div>
            <div style={{ fontSize: 11, color: th.ink3, marginTop: 3 }}>Wishlist</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        {upcoming.length > 0 && (
          <div style={dayHead(th)}><span style={dayLbl(th)}>Scheduled</span><span style={{ ...dayLbl(th), color: th.ink3 }}>{upcoming.length}</span></div>
        )}
        {upcoming.map((u) => (
          <SwipeRow key={u.id} onEdit={() => nav.editUpcoming(u)} onDelete={() => nav.deleteUpcoming(u.id)}>
            <ListRow
              onClick={() => nav.editUpcoming(u)}
              tile={<CatTile color={UPCOMING_COLOR} icon={MISC.calendar} />}
              name={u.name}
              sub={`${fmtDate(u.date)} · ${rel(u.date)}`}
              right={fmt(u.amount)}
            />
          </SwipeRow>
        ))}
        {upcoming.length === 0 && <Empty>Nothing scheduled. Tap + Add to plan an upcoming expense.</Empty>}

        {/* WISHLIST */}
        <div style={dayHead(th)}>
          <span style={dayLbl(th)}>Wishlist · someday</span>
          <button onClick={() => nav.addWishlist()} style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: th.accent, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
        </div>
        {wishlist.map((w) => (
          <SwipeRow key={w.id} onEdit={() => nav.editWishlist(w)} onDelete={() => nav.deleteWish(w.id)}>
            <ListRow
              onClick={() => nav.editWishlist(w)}
              tile={<CatTile dashed icon={Icons.star} />}
              name={w.name}
              dimName
              right={fmt(w.amount)}
            />
          </SwipeRow>
        ))}
        {wishlist.length === 0 && (
          <div style={{ padding: '13px 2px', fontSize: 12, fontStyle: 'italic', color: th.ink3 }}>Nothing saved yet — tap &ldquo;+ Add&rdquo;.</div>
        )}
      </div>
    </div>
  )
}

/* ============ SCREEN ============ */
export function Spending({ data, nav, sub, setSub }) {
  const th = useTheme()
  const { bills, upcoming, wishlist, cashflow, cycleTxns } = data
  const cycleLabel = `${fmtDay(cashflow.cycleStart)} – ${fmtDay(cashflow.cycleEnd)}`
  const daysLeft = Math.max(0, Math.ceil((new Date(cashflow.cycleEnd) - new Date()) / DAY))
  const stats = spendStats(data)
  const hints = whispers(data)
  const spendHint = hints[1] || hints[0] // vary from Home (which shows hints[0])
  const budgets = data.profile.categoryBudgets || {}
  const onAdd = () => (sub === 'rec' ? nav.addBill() : sub === 'up' ? nav.addUpcoming() : nav.addTx())

  return (
    <div className="k-screen">
      <div style={{ padding: '0 20px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>Spending</span>
          <button onClick={onAdd} style={{
            display: 'flex', alignItems: 'center', gap: 5, border: 'none', borderRadius: 999,
            background: th.accent, color: th.onAccent, fontSize: 12.5, fontWeight: 700,
            padding: '9px 15px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 15, lineHeight: 0 }}>+</span> Add
          </button>
        </div>

        {/* segmented */}
        <Segmented
          style={{ marginBottom: 20 }}
          options={[{ value: 'tx', label: 'Transactions' }, { value: 'rec', label: 'Recurring' }, { value: 'up', label: 'Upcoming' }]}
          value={sub} onChange={setSub}
        />

        <div key={sub}>
          {sub === 'tx' && <TransactionsView txns={cycleTxns} stats={stats} cycleLabel={cycleLabel} daysLeft={daysLeft} cf={cashflow} nav={nav} whisper={spendHint} budgets={budgets} />}
          {sub === 'rec' && <RecurringView bills={bills} cf={cashflow} nav={nav} />}
          {sub === 'up' && <UpcomingView upcoming={upcoming} wishlist={wishlist} cf={cashflow} nav={nav} />}
        </div>
      </div>
    </div>
  )
}

/* Sheets live in spending-extras.jsx; re-export so App.tsx's existing imports
   from './screens/Spending' keep resolving unchanged. */
export { TxSheet, BillSheet, UpcomingSheet, WishlistSheet, CategoryBudgetSheet } from './spending-extras'
