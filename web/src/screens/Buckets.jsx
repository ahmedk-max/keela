/* Keela — Buckets: saving goals (ported, wired to data) */
import React from 'react'
import { Progress, Tag, Empty, Sheet, Badge, Segmented, Icons } from '../ui/primitives'
import { getEntry } from '../lib/icons'
import { fmt, fmtDate, MONTH_ABBR } from '../lib/format'
import { Ring } from './home-extras'
import { bucketStats, monthsLeft, monthlyNeeded, goalBalance, ContributionChart } from './bucket-extras'

const TODAY = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()

function fmtTargetMonth(d) { const [y, m] = d.split('-').map(Number); return MONTH_ABBR[m - 1] + ' ' + y }

function statusTag(s) {
  if (s === 'completed') return <Tag kind="gain">Done</Tag>
  if (s === 'paused') return <Tag kind="mute">Paused</Tag>
  return <Tag kind="em">Active</Tag>
}

const entryStyle = {
  deposit: { sign: '+', cls: 'k-gain', label: 'Deposit' },
  withdrawal: { sign: '−', cls: 'k-loss', label: 'Withdrawal' },
  spend: { sign: '−', cls: 'k-loss', label: 'Spent' },
}

/* ---------- Ring card — circular progress per goal ---------- */
function BucketRingCard({ g, onClick }) {
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
    ringPct = usedPct; ringColor = 'var(--qahwa-flat)'
    center = <><span className="k-bkring-pct" style={{ color: ringColor }}>{usedPct}%</span><span className="k-bkring-sub">used</span></>
    amtMain = fmt(balance); amtSub = 'left'; cap = fmt(spent) + ' of ' + fmt(g.allocated) + ' spent'
  } else if (fundedHeld) {
    ringPct = 100; ringColor = g.color
    center = <span className="k-bkring-check" style={{ color: ringColor }}>{Icons.check}</span>
    amtMain = fmt(balance); amtSub = 'held'; cap = 'Funded · ' + fmtTargetMonth(g.targetDate)
  } else if (paused) {
    ringPct = targetPct; ringColor = 'var(--qahwa-flat)'
    center = <span className="k-bkring-pct" style={{ color: 'var(--qahwa-fg-3)' }}>{targetPct}%</span>
    amtMain = fmt(balance); amtSub = 'of ' + fmt(g.target); cap = 'Paused'
  } else {
    ringPct = targetPct; ringColor = g.color
    center = <span className="k-bkring-pct" style={{ color: ringColor }}>{targetPct}%</span>
    amtMain = fmt(balance); amtSub = 'of ' + fmt(g.target)
    cap = fmt(monthlyNeeded(g)) + '/mo · ' + monthsLeft(g) + ' mo left'
  }

  return (
    <button className={'k-bkcard' + (paused ? ' paused' : '')} onClick={onClick}>
      <span className="k-bkring">
        <Ring pct={ringPct} color={ringColor} size={80} stroke={6} />
        <span className="k-bkring-lbl">{center}</span>
      </span>
      <span className="k-bkcard-name">{g.name}</span>
      <span className="k-bkcard-amt">{amtMain} <span style={{ color: 'var(--qahwa-fg-3)' }}>{amtSub}</span></span>
      <span className="k-bkcard-cap">{cap}</span>
    </button>
  )
}

function RingGrid({ goals, nav }) {
  return (
    <div className="k-bkgrid">
      {goals.map((g) => <BucketRingCard key={g.id} g={g} onClick={() => nav.openBucket(g.id)} />)}
    </div>
  )
}

/* ---------- Saving: goals you're still funding, or holding untouched ---------- */
function SavingView({ goals, profile, nav }) {
  const s = bucketStats(goals, profile)
  const { active, paused, fundedReady, netSavings, alloc } = s
  const { fundedPct, ongoingTarget, remaining, requiredMonthly, saveBudget, headroom } = s
  const short = headroom < 0
  const pressureCol = short ? 'var(--qahwa-loss)' : 'var(--qahwa-gain)'
  const pressurePct = saveBudget > 0 ? (requiredMonthly / saveBudget) * 100 : (requiredMonthly > 0 ? 100 : 0)
  // active goals closest-to-done first (momentum up top), paused trailing
  const activeSorted = [...active].sort((a, b) => (goalBalance(b) / b.target) - (goalBalance(a) / a.target))
  const inProgress = [...activeSorted, ...paused]

  return (
    <div>
      {/* OVERVIEW — money held + where it lives */}
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-sec-head"><span className="k-label">Net savings &middot; held now</span><span className="k-micro">{alloc.length} bucket{alloc.length === 1 ? '' : 's'}</span></div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="k-num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmt(netSavings)}<span className="k-sar" style={{ marginLeft: 6 }}>SAR</span></span>
          <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>{remaining > 0 ? fmt(remaining) + ' to go' : 'all funded'}</span>
        </div>
        {alloc.length > 0 && (
          <div className="k-flowbar">
            {alloc.map((a) => (
              <div key={a.cat} className="k-flowbar-seg" style={{ width: (a.amount / netSavings * 100) + '%', background: a.color }} />
            ))}
          </div>
        )}
      </div>

      {/* MONTHLY PLAN — can the goals be funded out of the save budget? */}
      <div className="k-sec" style={{ marginTop: 30 }}>
        <div className="k-sec-head"><span className="k-label">Monthly plan</span><span className="k-micro">{active.length} active</span></div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
          <span className="k-num" style={{ fontSize: 19, fontWeight: 600 }}>{fmt(requiredMonthly)}<span className="k-label dim" style={{ marginLeft: 6 }}>/mo committed</span></span>
          <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>of {fmt(saveBudget)} budget</span>
        </div>
        <Progress pct={pressurePct} color={pressureCol} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
          <span className="k-num" style={{ fontSize: 11, fontWeight: 600, color: pressureCol }}>
            {short ? fmt(-headroom) + ' short' : fmt(headroom) + ' spare'}
          </span>
          <span className="k-label dim">{short ? 'Over save budget' : 'Within budget'}</span>
        </div>
        <div className="k-figs">
          <div className="k-fig"><span className="k-fig-val">{fundedPct}%</span><span className="k-label dim">Goals funded</span></div>
          <div className="k-fig"><span className="k-fig-val">{fmt(ongoingTarget)}</span><span className="k-label dim">Open target</span></div>
          <div className="k-fig"><span className="k-fig-val">{active.length + paused.length}</span><span className="k-label dim">In progress</span></div>
        </div>
      </div>

      {/* GOALS — active first (closest to done), paused trailing & muted */}
      <div className="k-sec div" style={{ paddingBottom: 0 }}>
        <div className="k-sec-head" style={{ marginBottom: 0 }}>
          <span className="k-label">Goals</span>
          <span className="k-num k-em" style={{ fontSize: 11, fontWeight: 600 }}>{fmt(requiredMonthly)}/mo</span>
        </div>
      </div>
      <div className="k-sec" style={{ marginTop: 0 }}>
        {inProgress.length ? <RingGrid goals={inProgress} nav={nav} /> : <Empty>No goals in progress. Everything is funded.</Empty>}
      </div>

      {/* FUNDED & READY — completed goals, not yet touched */}
      {fundedReady.length > 0 && (
        <React.Fragment>
          <div className="k-sec div" style={{ paddingBottom: 0 }}>
            <div className="k-sec-head" style={{ marginBottom: 0 }}><span className="k-label">Funded &amp; ready</span><span className="k-micro">{fundedReady.length}</span></div>
          </div>
          <div className="k-sec" style={{ marginTop: 0 }}><RingGrid goals={fundedReady} nav={nav} /></div>
        </React.Fragment>
      )}
    </div>
  )
}

/* ---------- In use: completed goals you're drawing down ---------- */
function InUseView({ goals, nav }) {
  if (!goals.length) {
    return <div className="k-sec" style={{ marginTop: 18 }}><Empty>Nothing in use yet. Completed goals you start spending from show up here.</Empty></div>
  }
  const funded = goals.reduce((s, g) => s + (g.allocated || 0), 0)
  const spent = goals.reduce((s, g) => s + (g.spent || 0), 0)
  const left = goals.reduce((s, g) => s + goalBalance(g), 0)
  const pctUsed = funded > 0 ? Math.round((spent / funded) * 100) : 0

  return (
    <div>
      {/* OVERVIEW — how much of the funded pots is left */}
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-sec-head"><span className="k-label">In use &middot; left to spend</span><span className="k-micro">{goals.length} bucket{goals.length === 1 ? '' : 's'}</span></div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
          <span className="k-num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmt(left)}<span className="k-sar" style={{ marginLeft: 6 }}>SAR</span></span>
          <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>of {fmt(funded)} funded</span>
        </div>
        <div className="k-flowbar">
          {spent > 0 && <div className="k-flowbar-seg" style={{ width: (spent / funded * 100) + '%', background: 'var(--qahwa-flat)' }} />}
          {left > 0 && <div className="k-flowbar-seg" style={{ width: (left / funded * 100) + '%', background: 'var(--qahwa-gain)' }} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
          <span className="k-num" style={{ fontSize: 11, fontWeight: 600, color: 'var(--qahwa-flat)' }}>{fmt(spent)} spent</span>
          <span className="k-label dim">{pctUsed}% used</span>
        </div>
        <div className="k-figs">
          <div className="k-fig"><span className="k-fig-val">{fmt(funded)}</span><span className="k-label dim">Funded</span></div>
          <div className="k-fig"><span className="k-fig-val k-loss">{fmt(spent)}</span><span className="k-label dim">Spent</span></div>
          <div className="k-fig"><span className="k-fig-val k-gain">{fmt(left)}</span><span className="k-label dim">Left</span></div>
        </div>
      </div>

      <div className="k-sec div" style={{ paddingBottom: 0 }}>
        <div className="k-sec-head" style={{ marginBottom: 0 }}><span className="k-label">Drawing down</span><span className="k-micro">{goals.length}</span></div>
      </div>
      <div className="k-sec" style={{ marginTop: 0 }}><RingGrid goals={goals} nav={nav} /></div>
    </div>
  )
}

export function Buckets({ data, nav, sub, setSub }) {
  const { goals, profile } = data
  // "In use" = a goal you're drawing down — but an active goal stays in Saving
  // even if it's been dipped into.
  const isInUse = (g) => g.status !== 'active' && (g.spent || 0) > 0
  const inUse = goals.filter(isInUse)
  const saving = goals.filter((g) => !isInUse(g))
  const activeCount = goals.filter((g) => g.status === 'active').length

  return (
    <div className="k-screen">
      <div className="k-phead">
        <div><div className="k-htitle">Savings Goals</div></div>
        <div className="k-asof">{activeCount} active<br />{goals.length} total</div>
      </div>
      <div className="k-sec" style={{ marginTop: 14 }}>
        <Segmented
          items={[{ v: 'saving', label: 'Saving' }, { v: 'inuse', label: 'In use' }]}
          value={sub} onChange={setSub} />
      </div>
      <div key={sub}>
        {sub === 'inuse'
          ? <InUseView goals={inUse} nav={nav} />
          : <SavingView goals={saving} profile={profile} nav={nav} />}
      </div>
    </div>
  )
}

function ActivityLog({ entries }) {
  return (
    <div className="k-sec">
      <div className="k-sec-head"><span className="k-label">Activity log</span><span className="k-micro">{entries.length}</span></div>
      {entries.length ? entries.map((e, i) => {
        const s = entryStyle[e.type] || { sign: '', cls: '', label: e.type }
        const ent = getEntry(e.type)
        return (
          <div className="k-row" key={i}>
            <Badge icon={ent.icon} color={ent.color} />
            <div className="k-row-main">
              <span className="k-row-name">{s.label}</span>
              <span className="k-row-sub">{fmtDate(e.date)}{e.note ? ' · ' + e.note : ''}</span>
            </div>
            <div className="k-row-r"><span className={'k-row-amt ' + s.cls}>{s.sign}{fmt(e.amount)}</span></div>
          </div>
        )
      }) : <Empty>No activity yet. A fresh bucket, waiting.</Empty>}
    </div>
  )
}

export function BucketDetail({ g, onClose, onMove, onEdit }) {
  const spent = g.spent || 0
  const balance = g.allocated - spent
  const completed = g.status === 'completed'
  const drawdown = completed && spent > 0
  const fundedHeld = completed && spent === 0
  const funded = completed || balance >= g.target
  const pct = Math.round(balance / g.target * 100)
  const left = balance
  const remaining = Math.max(0, g.target - balance)
  const monthly = monthlyNeeded(g)
  const ml = monthsLeft(g)

  return (
    <div className="k-detail">
      <div className="k-detail-bar">
        <button className="k-back" onClick={onClose}>&lsaquo; Buckets</button>
        <button className="k-back" style={{ marginLeft: 'auto' }} onClick={() => onEdit(g.id)}>Edit</button>
      </div>
      <div className="k-scroll">
        <div className="k-screen">
          <div className="k-hero" style={{ paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="k-swatch" style={{ width: 12, height: 12, background: g.color }} />
              <span style={{ font: '600 18px/1.1 var(--qahwa-font-ui)', flex: 1 }}>{g.name}</span>
              {statusTag(g.status)}
            </div>
            {drawdown ? (
              <React.Fragment>
                <div className="k-hero-num" style={{ fontSize: 38 }}>{fmt(left)}<span className="k-label dim" style={{ marginLeft: 8 }}>left</span></div>
                <div className="k-hero-delta"><span className="k-num" style={{ color: 'var(--qahwa-fg-3)' }}>{fmt(spent)} spent of {fmt(g.allocated)} funded</span></div>
                <div style={{ marginTop: 16 }}><Progress pct={spent / g.allocated * 100} color="var(--qahwa-flat)" /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span className="k-label dim">{Math.round(spent / g.allocated * 100)}% used</span>
                  <span className="k-label dim">Reached {fmtTargetMonth(g.targetDate)}</span>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="k-hero-num" style={{ fontSize: 38 }}>{fmt(balance)}</div>
                <div className="k-hero-delta"><span className="k-num" style={{ color: 'var(--qahwa-fg-3)' }}>of {fmt(g.target)} SAR &middot; {pct}%</span></div>
                <div style={{ marginTop: 16 }}><Progress pct={pct} color={g.color} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span className="k-label dim">{remaining > 0 ? fmt(remaining) + ' to go' : 'Fully funded'}</span>
                  <span className="k-label dim">Target {fmtTargetMonth(g.targetDate)}</span>
                </div>
              </React.Fragment>
            )}
          </div>

          <div className="k-sec" style={{ marginTop: 20 }}>
            {drawdown ? (
              <div className="k-stats">
                <div className="k-stat"><span className="k-label dim">Funded</span><span className="k-stat-val">{fmt(g.allocated)}</span></div>
                <div className="k-stat"><span className="k-label dim">Spent</span><span className="k-stat-val k-loss">{fmt(spent)}</span></div>
                <div className="k-stat"><span className="k-label dim">Left</span><span className="k-stat-val k-gain">{fmt(left)}</span></div>
                <div className="k-stat"><span className="k-label dim">Reached</span><span className="k-stat-val" style={{ fontSize: 13, color: 'var(--qahwa-fg-2)' }}>{fmtTargetMonth(g.targetDate)}</span></div>
              </div>
            ) : fundedHeld ? (
              <div className="k-stats">
                <div className="k-stat"><span className="k-label dim">Funded</span><span className="k-stat-val">{fmt(g.allocated)}</span></div>
                <div className="k-stat"><span className="k-label dim">Available</span><span className="k-stat-val k-gain">{fmt(left)}</span></div>
              </div>
            ) : (
              <div className="k-stats">
                <div className="k-stat"><span className="k-label dim">Balance</span><span className="k-stat-val">{fmt(balance)}</span></div>
                <div className="k-stat"><span className="k-label dim">Target</span><span className="k-stat-val" style={{ color: 'var(--qahwa-fg-2)' }}>{fmt(g.target)}</span></div>
                <div className="k-stat">
                  <span className="k-label dim">{g.status === 'paused' ? 'Needed / mo' : 'Contribute / mo'}</span>
                  <span className="k-stat-val k-em">{fmt(monthly)}</span>
                </div>
                <div className="k-stat"><span className="k-label dim">Months left</span><span className="k-stat-val">{ml}</span></div>
              </div>
            )}
            {!funded && g.status !== 'paused' && (
              <div className="k-micro" style={{ marginTop: 10, letterSpacing: '0.04em', textAlign: 'center' }}>
                Save <span className="k-num k-em" style={{ fontWeight: 600 }}>{fmt(monthly)}</span>/mo to reach {fmt(g.target)} by {fmtTargetMonth(g.targetDate)}.
              </div>
            )}
          </div>

          {g.note && (
            <div className="k-sec"><div className="k-knote" style={{ borderLeftColor: 'var(--qahwa-border)' }}>
              <div className="k-knote-body" style={{ fontSize: 13 }}>{g.note}</div>
            </div></div>
          )}

          {left > 0 && (
            <div className="k-sec"><div style={{ display: 'flex', gap: 10 }}>
              <button className="k-btn accent" style={{ flex: 1 }} onClick={() => onMove(g.id, 'deposit')}>+ DEPOSIT</button>
              <button className="k-btn" style={{ flex: 1 }} onClick={() => onMove(g.id, funded ? 'spend' : 'withdrawal')}>
                &minus; {funded ? 'SPEND' : 'WITHDRAW'}
              </button>
            </div></div>
          )}

          {g.entries.length > 0 && (
            <div className="k-sec" style={{ marginTop: 30 }}>
              <div className="k-sec-head"><span className="k-label">Balance over time</span><span className="k-micro">{g.entries.length} entries</span></div>
              <ContributionChart g={g} />
              <div className="k-chartleg" style={{ justifyContent: 'space-between' }}>
                <span><i className="k-chartleg-sw" style={{ borderColor: g.color }} />Balance</span>
                {!funded && <span><i className="k-chartleg-sw bud" />Target {fmt(g.target)}</span>}
              </div>
            </div>
          )}

          <ActivityLog entries={g.entries} />
        </div>
      </div>
    </div>
  )
}

export function BucketSheet({ goal, mode, onClose, onSave }) {
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')
  const titles = { deposit: 'Deposit to', withdrawal: 'Withdraw from', spend: 'Spend from' }
  const cta = { deposit: 'DEPOSIT', withdrawal: 'WITHDRAW', spend: 'RECORD SPEND' }
  const valid = amount && parseFloat(amount) > 0
  return (
    <Sheet title={titles[mode] + ' · ' + goal.name} onClose={onClose}>
      {(close) => (
        <>
          <div className="k-field" style={{ marginTop: 14 }}>
            <span className="k-label dim">Amount</span>
            <div className="k-amountrow">
              <input className="k-input k-amount-in" inputMode="decimal" placeholder="0" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} data-autofocus />
              <span className="k-amountcur">SAR</span>
            </div>
          </div>
          <div className="k-field">
            <span className="k-label dim">Note &middot; optional</span>
            <input className="k-input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className={'k-btn full ' + (mode === 'deposit' ? 'accent' : '')} style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(goal.id, { type: mode, amount: Math.round(parseFloat(amount) * 100) / 100, date: TODAY, note: note.trim() }); close() } }}>
            {cta[mode]}
          </button>
        </>
      )}
    </Sheet>
  )
}

const GOAL_COLORS = [
  'var(--qahwa-accent)', 'var(--qahwa-latte)', 'var(--qahwa-brewed)',
  'var(--qahwa-espresso)', 'var(--qahwa-bean)', 'var(--qahwa-flat)',
]

export function EditBucketSheet({ goal, onClose, onSave, onDelete }) {
  const [name, setName] = React.useState(goal.name)
  const [target, setTarget] = React.useState(String(goal.target))
  const [tdate, setTdate] = React.useState(goal.targetDate)
  const [status, setStatus] = React.useState(goal.status || 'active')
  const [color, setColor] = React.useState(goal.color || GOAL_COLORS[0])
  const [note, setNote] = React.useState(goal.note || '')
  const valid = name.trim() && parseFloat(target) > 0
  return (
    <Sheet title={'Edit · ' + goal.name} onClose={onClose}>
      {(close) => (
        <>
          <div className="k-field" style={{ marginTop: 14 }}>
            <span className="k-label dim">Name</span>
            <input className="k-input" value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
          </div>
          <div className="k-field">
            <span className="k-label dim">Status</span>
            <Segmented items={[{ v: 'active', label: 'Active' }, { v: 'paused', label: 'Paused' }, { v: 'completed', label: 'Done' }]}
              value={status} onChange={setStatus} />
          </div>
          <div className="k-field">
            <span className="k-label dim">Colour</span>
            <div className="k-swatchrow">
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" aria-label="colour"
                  className={'k-swatchbtn' + (color === c ? ' on' : '')}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <div className="k-field">
            <span className="k-label dim">Target &middot; SAR</span>
            <input className="k-input k-num" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="k-field">
            <span className="k-label dim">Target month</span>
            <input className="k-input k-num" type="month" value={tdate} onChange={(e) => setTdate(e.target.value)} />
          </div>
          <div className="k-field">
            <span className="k-label dim">Note &middot; optional</span>
            <textarea className="k-input" rows={2} placeholder="Add a note" value={note}
              style={{ resize: 'none', lineHeight: 1.4 }} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(goal.id, { name: name.trim(), target: parseInt(target, 10), targetDate: tdate, status, color, note: note.trim() }); close() } }}>
            SAVE CHANGES
          </button>
          <button className="k-btn ghost full" style={{ marginTop: 10, color: 'var(--qahwa-loss)', borderColor: 'var(--qahwa-loss)' }}
            onClick={() => { onDelete(goal.id); close() }}>
            DELETE BUCKET
          </button>
        </>
      )}
    </Sheet>
  )
}
