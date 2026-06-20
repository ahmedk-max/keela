/* Keela — Buckets: savings goals. "Warm" reskin (soft-rounded fintech on sand
   & espresso). Saving / In-use sub-tabs, ring goal cards, full-screen detail
   with a balance-over-time SVG chart, and deposit / withdraw / edit sheets. */
import React from 'react'
import { useTheme, SWATCHES } from '../lib/theme'
import {
  Ring, StackedBar, Progress, Pill, Segmented, Empty, Sheet, Field, SheetSave, SheetDelete, DetailShell, CountUp,
} from '../ui/primitives'
import { entryMeta } from '../lib/icons'
import { fmt, fmtDate, MONTH_ABBR } from '../lib/format'
import { bucketStats, monthsLeft, monthlyNeeded, goalBalance, balanceSeries } from './bucket-extras'

const TODAY = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()

function fmtTargetMonth(d) { const [y, m] = d.split('-').map(Number); return MONTH_ABBR[m - 1] + ' ' + y }

/* status → pill colours (deferred to theme) */
function statusPill(status, th) {
  if (status === 'completed') return { label: 'Done', bg: th.accentSoft, fg: th.accent }
  if (status === 'paused') return { label: 'Paused', bg: th.card2, fg: th.ink2 }
  return { label: 'Active', bg: th.card2, fg: th.ink2 }
}

const secDivider = (th) => ({ padding: '22px 0 2px', marginTop: 22, borderTop: `1px solid ${th.line}` })
const secTitle = (th) => ({ fontSize: 15, fontWeight: 700, color: th.ink })

/* ---------- Ring goal card (used by every grid) ---------- */
function BucketRingCard({ g, onClick }) {
  const th = useTheme()
  const spent = g.spent || 0
  const balance = goalBalance(g)
  const completed = g.status === 'completed'
  const drawdown = completed && spent > 0
  const fundedHeld = completed && spent === 0
  const paused = g.status === 'paused'
  const targetPct = g.target > 0 ? Math.round(balance / g.target * 100) : 0
  const usedPct = g.allocated > 0 ? Math.round(spent / g.allocated * 100) : 0

  let ringPct, ringColor, center, amtMain, amtSub, cap
  if (drawdown) {
    ringPct = usedPct; ringColor = th.flat; center = usedPct + '%'
    amtMain = fmt(balance); amtSub = 'left'; cap = fmt(spent) + ' of ' + fmt(g.allocated) + ' spent'
  } else if (fundedHeld) {
    ringPct = 100; ringColor = g.color; center = '✓'
    amtMain = fmt(balance); amtSub = 'held'; cap = 'Funded · ' + fmtTargetMonth(g.targetDate)
  } else if (paused) {
    ringPct = targetPct; ringColor = th.flat; center = targetPct + '%'
    amtMain = fmt(balance); amtSub = 'of ' + fmt(g.target); cap = 'Paused'
  } else {
    ringPct = targetPct; ringColor = g.color; center = targetPct + '%'
    amtMain = fmt(balance); amtSub = 'of ' + fmt(g.target)
    cap = fmt(monthlyNeeded(g)) + '/mo · ' + monthsLeft(g) + ' mo'
  }
  const centerColor = paused ? th.ink3 : ringColor

  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', padding: '14px 6px', textAlign: 'center', cursor: 'pointer',
      fontFamily: 'inherit', opacity: paused ? 0.62 : 1,
    }}>
      <Ring pct={ringPct} size={72} stroke={6} color={ringColor} style={{ margin: '0 auto 12px' }}>
        <span style={{ fontSize: center === '✓' ? 19 : 15, fontWeight: 800, color: centerColor }}>{center}</span>
      </Ring>
      <div style={{ fontSize: 13, fontWeight: 700, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: th.ink, marginTop: 5 }}>
        {amtMain} <span style={{ color: th.ink3, fontWeight: 600 }}>{amtSub}</span>
      </div>
      <div style={{ fontSize: 10.5, color: th.ink3, marginTop: 4 }}>{cap}</div>
    </button>
  )
}

function RingGrid({ goals, nav, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...style }}>
      {goals.map((g) => <BucketRingCard key={g.id} g={g} onClick={() => nav.openBucket(g.id)} />)}
    </div>
  )
}

/* ---------- Saving: goals you're still funding, or holding untouched ---------- */
function SavingView({ goals, allGoals, profile, nav }) {
  const th = useTheme()
  const s = bucketStats(goals, profile)
  const { active, paused, fundedReady } = s
  const { fundedPct, ongoingTarget, remaining, requiredMonthly, saveBudget, headroom } = s
  // Net savings = every bucket holding money: active/paused goals, done & funded
  // ones, and the leftovers still sitting in goals being drawn down (In-use tab).
  const { netSavings, alloc } = bucketStats(allGoals, profile)
  const short = headroom < 0
  const planColor = short ? th.loss : th.gain
  const planPct = saveBudget > 0 ? Math.min(100, (requiredMonthly / saveBudget) * 100) : (requiredMonthly > 0 ? 100 : 0)
  // active goals closest-to-done first (momentum up top), paused trailing
  const activeSorted = [...active].sort((a, b) => (goalBalance(b) / b.target) - (goalBalance(a) / a.target))
  const inProgress = [...activeSorted, ...paused]
  const allocSegs = alloc.map((a) => ({ w: netSavings > 0 ? (a.amount / netSavings) * 100 : 0, color: a.color }))
  const dim = 'rgba(243,238,227,.5)'

  return (
    <div>
      {/* NET SAVINGS — money held + where it lives (dark hero card) */}
      <div style={{ background: th.darkcard, borderRadius: 28, padding: 22, color: th.onDark, boxShadow: th.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'rgba(243,238,227,.55)' }}>Net savings · held now</span>
          <span style={{ fontSize: 11, color: dim }}>{alloc.length} bucket{alloc.length === 1 ? '' : 's'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <CountUp value={netSavings} style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }} />
            <span style={{ fontSize: 13, color: dim, fontWeight: 600 }}>SAR</span>
          </span>
          <span style={{ fontSize: 12, color: dim }}>{remaining > 0 ? fmt(remaining) + ' to go' : 'all funded'}</span>
        </div>
        {allocSegs.length > 0 && <StackedBar segs={allocSegs} height={13} />}
      </div>

      {/* MONTHLY PLAN — can the goals be funded out of the save budget? */}
      <div style={secDivider(th)}>
        <span style={secTitle(th)}>Monthly plan</span>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '14px 0 11px' }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: th.ink }}>
            {fmt(requiredMonthly)}<span style={{ fontSize: 11, color: th.ink3, fontWeight: 600 }}> /mo committed</span>
          </span>
          <span style={{ fontSize: 12, color: th.ink3 }}>of {fmt(saveBudget)} budget</span>
        </div>
        <Progress pct={planPct} color={planColor} height={9} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: planColor }}>{short ? fmt(-headroom) + ' short' : fmt(headroom) + ' spare'}</span>
          <span style={{ color: th.ink3 }}>{short ? 'Over save budget' : 'Within budget'}</span>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
          {[
            { v: fundedPct + '%', l: 'Goals funded' },
            { v: fmt(ongoingTarget), l: 'Open target' },
            { v: String(active.length + paused.length), l: 'In progress' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: th.ink }}>{f.v}</div>
              <div style={{ fontSize: 11, color: th.ink3, marginTop: 2 }}>{f.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GOALS — active first (closest to done), paused trailing & muted */}
      <div style={{ ...secTitle(th), margin: '24px 2px 14px' }}>Goals</div>
      {inProgress.length
        ? <RingGrid goals={inProgress} nav={nav} />
        : <Empty>No goals in progress. Everything is funded.</Empty>}

      {/* FUNDED & READY — completed goals, not yet touched */}
      {fundedReady.length > 0 && (
        <React.Fragment>
          <div style={{ ...secTitle(th), margin: '24px 2px 14px' }}>Funded &amp; ready</div>
          <RingGrid goals={fundedReady} nav={nav} />
        </React.Fragment>
      )}
    </div>
  )
}

/* ---------- In use: completed goals you're drawing down ---------- */
function InUseView({ goals, nav }) {
  const th = useTheme()
  if (!goals.length) {
    return <Empty>Nothing in use yet. Completed goals you start spending from show up here.</Empty>
  }
  const funded = goals.reduce((s, g) => s + (g.allocated || 0), 0)
  const spent = goals.reduce((s, g) => s + (g.spent || 0), 0)
  const left = goals.reduce((s, g) => s + goalBalance(g), 0)
  const pctUsed = funded > 0 ? Math.round((spent / funded) * 100) : 0

  return (
    <div>
      {/* OVERVIEW — how much of the funded pots is left */}
      <div style={{ padding: '4px 0 2px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: th.ink3 }}>In use · left to spend</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '12px 0 14px' }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <CountUp value={left} style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', color: th.ink, lineHeight: 1 }} />
            <span style={{ fontSize: 13, color: th.ink3, fontWeight: 600 }}>SAR</span>
          </span>
          <span style={{ fontSize: 12, color: th.ink3 }}>of {fmt(funded)} funded</span>
        </div>
        <StackedBar height={13} segs={[
          { w: funded > 0 ? (spent / funded) * 100 : 0, color: th.flat },
          { w: funded > 0 ? (left / funded) * 100 : 0, color: th.green },
        ]} />
        <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
          {[
            { v: fmt(funded), l: 'Funded', c: th.ink },
            { v: fmt(spent), l: 'Spent', c: th.loss },
            { v: fmt(left), l: 'Left', c: th.green },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: f.c }}>{f.v}</div>
              <div style={{ fontSize: 11, color: th.ink3, marginTop: 2 }}>{f.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: th.ink3, marginTop: 8 }}>{pctUsed}% used</div>
      </div>

      <RingGrid goals={goals} nav={nav} style={{ marginTop: 18 }} />
    </div>
  )
}

export function Buckets({ data, nav, sub, setSub }) {
  const th = useTheme()
  const { goals, profile } = data
  // "In use" = a goal you're drawing down — but an active goal stays in Saving
  // even if it's been dipped into.
  const isInUse = (g) => g.status !== 'active' && (g.spent || 0) > 0
  const inUse = goals.filter(isInUse)
  const saving = goals.filter((g) => !isInUse(g))
  const activeCount = goals.filter((g) => g.status === 'active').length

  return (
    <div className="k-screen">
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>Savings Goals</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: th.ink3, textAlign: 'right', lineHeight: 1.5 }}>
            {activeCount} active<br />{goals.length} total
          </span>
        </div>

        <Segmented
          options={[{ value: 'saving', label: 'Saving' }, { value: 'inuse', label: 'In use' }]}
          value={sub} onChange={setSub} style={{ marginBottom: 20 }} />

        <div key={sub}>
          {sub === 'inuse'
            ? <InUseView goals={inUse} nav={nav} />
            : <SavingView goals={saving} allGoals={goals} profile={profile} nav={nav} />}
        </div>
      </div>
    </div>
  )
}

/* ---------- Activity log row (uses entryMeta for icon + colour + sign) ---------- */
function ActivityLog({ entries }) {
  const th = useTheme()
  if (!entries.length) return <Empty>No activity yet. A fresh bucket, waiting.</Empty>
  const ordered = [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div>
      {ordered.map((e, i) => {
        const m = entryMeta(e.type, th)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: `1px solid ${th.line}` }}>
            <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 11, background: th.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
              <span style={{ width: 18, height: 18, display: 'flex' }}>{m.icon}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: th.ink }}>{m.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: th.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fmtDate(e.date)}{e.note ? ' · ' + e.note : ''}
              </span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.sign}{fmt(e.amount)}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Balance-over-time SVG (zero-based line + optional dashed target) ---------- */
function BalanceChart({ g, funded }) {
  const th = useTheme()
  const { vals, opening, now } = balanceSeries(g)
  if (vals.length < 2) return null
  const W = 320, H = 60
  const showTarget = !funded && g.target > 0
  const peak = Math.max(...vals, showTarget ? g.target : 0) * 1.08 || 1
  const x = (i) => (vals.length > 1 ? (i / (vals.length - 1)) * W : W / 2)
  const y = (v) => H - (v / peak) * H
  const line = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')
  const area = line + ` L${W} ${H} L0 ${H} Z`
  const targetY = y(g.target).toFixed(1)

  return (
    <div style={{ background: th.card, borderRadius: 22, padding: '18px 16px 14px', boxShadow: th.shadow }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {showTarget && (
          <line x1="0" y1={targetY} x2={W} y2={targetY} stroke={th.ink3} strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        )}
        <path d={area} fill={g.color} opacity="0.14" />
        <path d={line} fill="none" stroke={g.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: th.ink3 }}>
        <span>{fmt(opening)}</span><span>balance</span><span>{fmt(now)}</span>
      </div>
    </div>
  )
}

export function BucketDetail({ g, onClose, onMove, onEdit }) {
  const th = useTheme()
  const spent = g.spent || 0
  const balance = g.allocated - spent
  const completed = g.status === 'completed'
  const drawdown = completed && spent > 0
  const funded = completed || balance >= g.target
  const pct = g.target > 0 ? Math.round(balance / g.target * 100) : 0
  const remaining = Math.max(0, g.target - balance)
  const sp = statusPill(g.status, th)

  const mainNum = fmt(balance)
  const mainSuffix = drawdown ? 'left' : ''
  const subLine = drawdown
    ? fmt(spent) + ' spent of ' + fmt(g.allocated) + ' funded'
    : 'of ' + fmt(g.target) + ' SAR · ' + pct + '%'
  const progPct = drawdown ? (g.allocated > 0 ? spent / g.allocated * 100 : 0) : pct
  const progColor = drawdown ? th.flat : g.color
  const footL = drawdown
    ? (g.allocated > 0 ? Math.round(spent / g.allocated * 100) : 0) + '% used'
    : (remaining > 0 ? fmt(remaining) + ' to go' : 'Fully funded')
  const footR = 'Target ' + fmtTargetMonth(g.targetDate)

  const stats = [
    { l: 'Balance', v: fmt(balance) },
    { l: 'Target', v: fmt(g.target) },
    { l: g.status === 'paused' ? 'Needed / mo' : 'Add / mo', v: fmt(monthlyNeeded(g)) },
    { l: 'Months left', v: String(monthsLeft(g)) },
  ]
  const canMove = balance > 0 || funded

  const editBtn = (
    <button onClick={() => onEdit(g.id)} style={{
      border: 'none', background: th.card2, borderRadius: 999, padding: '8px 17px',
      fontSize: 13, fontWeight: 700, color: th.ink2, cursor: 'pointer', fontFamily: 'inherit',
    }}>Edit</button>
  )

  return (
    <DetailShell onClose={onClose} right={editBtn}>
      {/* title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 13, height: 13, borderRadius: 4, background: g.color, flex: 'none' }} />
        <span style={{ fontSize: 19, fontWeight: 800, color: th.ink, flex: 1 }}>{g.name}</span>
        <Pill bg={sp.bg} fg={sp.fg}>{sp.label}</Pill>
      </div>

      {/* big balance */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>{mainNum}</span>
        {mainSuffix && <span style={{ fontSize: 14, color: th.ink3, fontWeight: 600 }}>{mainSuffix}</span>}
      </div>
      <div style={{ fontSize: 13, color: th.ink3, marginTop: 5 }}>{subLine}</div>

      {/* progress */}
      <div style={{ marginTop: 16 }}><Progress pct={progPct} color={progColor} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 12, color: th.ink3 }}>
        <span>{footL}</span><span>{footR}</span>
      </div>

      {/* stats card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: th.card, borderRadius: 22, padding: 18, marginTop: 20, boxShadow: th.shadow }}>
        {stats.map((st, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: th.ink3 }}>{st.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: th.ink, marginTop: 3 }}>{st.v}</div>
          </div>
        ))}
      </div>

      {/* note */}
      {g.note && (
        <div style={{ background: th.accentSoft, borderRadius: 18, padding: 16, marginTop: 14, fontSize: 13, lineHeight: 1.55, color: th.ink }}>
          {g.note}
        </div>
      )}

      {/* actions */}
      {canMove && (
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={() => onMove(g.id, 'deposit')} style={{
            flex: 1, border: 'none', borderRadius: 16, padding: 14, background: th.accent,
            color: th.onAccent, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Deposit</button>
          <button onClick={() => onMove(g.id, funded ? 'spend' : 'withdrawal')} style={{
            flex: 1, border: `1.5px solid ${th.line}`, borderRadius: 16, padding: 14, background: th.card,
            color: th.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>− {funded ? 'Spend' : 'Withdraw'}</button>
        </div>
      )}

      {/* balance over time */}
      {g.entries.length > 1 && (
        <React.Fragment>
          <div style={{ fontSize: 14, fontWeight: 700, color: th.ink, margin: '26px 2px 12px' }}>Balance over time</div>
          <BalanceChart g={g} funded={funded} />
        </React.Fragment>
      )}

      {/* activity log */}
      <div style={{ fontSize: 14, fontWeight: 700, color: th.ink, margin: '26px 2px 12px' }}>Activity log</div>
      <ActivityLog entries={g.entries} />
    </DetailShell>
  )
}

/* ---------- Deposit / withdraw / spend move sheet ---------- */
export function BucketSheet({ goal, mode, onClose, onSave }) {
  const th = useTheme()
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')
  const titles = { deposit: 'Deposit to', withdrawal: 'Withdraw from', spend: 'Spend from' }
  const cta = { deposit: 'Deposit', withdrawal: 'Withdraw', spend: 'Record spend' }
  const valid = amount && parseFloat(amount) > 0

  return (
    <Sheet title={(titles[mode] || 'Move') + ' · ' + goal.name} onClose={onClose}>
      {(close) => (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: `2px solid ${th.line}`, padding: '6px 0', marginTop: 12 }}>
            <input
              value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" placeholder="0" data-autofocus
              style={{ flex: 1, width: '100%', border: 'none', background: 'none', fontSize: 26, fontWeight: 800, color: th.ink, outline: 'none', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: th.ink3 }}>SAR</span>
          </div>
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" />
          <SheetSave
            style={{ opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => {
              if (!valid) return
              onSave(goal.id, { type: mode, amount: Math.round(parseFloat(amount) * 100) / 100, date: TODAY, note: note.trim() })
              close()
            }}>{cta[mode] || 'Save'}</SheetSave>
        </>
      )}
    </Sheet>
  )
}

/* ---------- Edit bucket sheet (with colour swatch picker) ---------- */
export function EditBucketSheet({ goal, onClose, onSave, onDelete }) {
  const th = useTheme()
  const [name, setName] = React.useState(goal.name)
  const [target, setTarget] = React.useState(String(goal.target))
  const [tdate, setTdate] = React.useState(goal.targetDate)
  const [status, setStatus] = React.useState(goal.status || 'active')
  const [color, setColor] = React.useState(goal.color || SWATCHES[0])
  const [note, setNote] = React.useState(goal.note || '')
  // keep the goal's existing colour selectable even if it's not a preset
  const palette = goal.color && !SWATCHES.includes(goal.color) ? [goal.color, ...SWATCHES] : SWATCHES
  const valid = name.trim() && parseFloat(target) > 0
  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3 }

  return (
    <Sheet title={'Edit · ' + goal.name} onClose={onClose}>
      {(close) => (
        <>
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
            style={{ marginTop: 14, fontSize: 15, fontWeight: 600 }} />

          <div style={{ ...lbl, margin: '14px 2px 7px' }}>Status</div>
          <Segmented
            options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'completed', label: 'Done' }]}
            value={status} onChange={setStatus} />

          <div style={{ ...lbl, margin: '16px 2px 9px' }}>Colour</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {palette.map((c) => (
              <button key={c} type="button" aria-label="colour" onClick={() => setColor(c)} style={{
                width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
                border: `2px solid ${color === c ? th.ink : 'transparent'}`,
                boxShadow: `0 0 0 2px ${th.card} inset`,
              }} />
            ))}
          </div>

          <Field value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric" placeholder="Target · SAR" style={{ marginTop: 14 }} />
          <Field value={tdate} onChange={(e) => setTdate(e.target.value)} type="month" />
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />

          <SheetSave
            style={{ marginTop: 16, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => {
              if (!valid) return
              onSave(goal.id, { name: name.trim(), target: parseInt(target, 10), targetDate: tdate, status, color, note: note.trim() })
              close()
            }}>Save changes</SheetSave>
          <SheetDelete onClick={() => { onDelete(goal.id); close() }}>Delete bucket</SheetDelete>
        </>
      )}
    </Sheet>
  )
}
