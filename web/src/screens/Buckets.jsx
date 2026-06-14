/* Keela — Buckets: saving goals (ported, wired to data) */
import React from 'react'
import { Progress, Tag, Empty, Icons, Sheet } from '../ui/primitives'
import { fmt, fmtDate, monthsBetween, MONTH_ABBR, NOW_MONTH } from '../lib/format'

const TODAY = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()

function monthsLeft(g) { return Math.max(0, monthsBetween(NOW_MONTH, g.targetDate)) }
function monthlyNeeded(g) {
  const remain = g.target - (g.allocated - (g.spent || 0))
  if (remain <= 0) return 0
  const m = monthsLeft(g)
  return m > 0 ? Math.ceil(remain / m) : remain
}
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

function BucketCard({ g, onClick, onEdit, onDelete }) {
  const spent = g.spent || 0
  const balance = g.allocated - spent
  const completed = g.status === 'completed'
  const drawdown = completed && spent > 0
  const fundedHeld = completed && spent === 0
  const pct = Math.round(balance / g.target * 100)
  const left = balance
  const monthly = monthlyNeeded(g)
  const ml = monthsLeft(g)
  const stop = (fn) => (e) => { e.stopPropagation(); fn(g.id) }

  return (
    <div className="k-bucket-card" role="button" tabIndex={0} onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '15px 0', cursor: 'pointer', borderTop: '1px solid var(--qahwa-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
        <span className="k-swatch" style={{ width: 12, height: 12, background: g.color }} />
        <span style={{ font: '600 14px/1.2 var(--qahwa-font-ui)', flex: 1 }}>{g.name}</span>
        <span className="k-card-tr">
          <span className="k-card-status">{statusTag(g.status)}</span>
          <span className="k-card-acts">
            <button className="k-iconbtn ico" title="Edit" onClick={stop(onEdit)}>{Icons.edit}</button>
            <button className="k-iconbtn ico danger" title="Delete" onClick={stop(onDelete)}>{Icons.trash}</button>
          </span>
        </span>
      </div>

      {drawdown ? (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
            <span className="k-num" style={{ fontSize: 19, fontWeight: 600 }}>{fmt(left)}<span className="k-label dim" style={{ marginLeft: 6 }}>left</span></span>
            <span className="k-num" style={{ fontSize: 11, color: 'var(--qahwa-fg-3)' }}>{fmt(spent)} spent / {fmt(g.allocated)}</span>
          </div>
          <Progress pct={spent / g.allocated * 100} color="var(--qahwa-flat)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span className="k-num" style={{ fontSize: 11, color: 'var(--qahwa-flat)', fontWeight: 600 }}>{Math.round(spent / g.allocated * 100)}% used</span>
            <span className="k-label dim">Reached {fmtTargetMonth(g.targetDate)}</span>
          </div>
        </React.Fragment>
      ) : fundedHeld ? (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
            <span className="k-num" style={{ fontSize: 19, fontWeight: 600 }}>{fmt(g.allocated)}<span className="k-label dim" style={{ marginLeft: 6 }}>held</span></span>
            <span className="k-label dim">Fully funded</span>
          </div>
          <Progress pct={100} color={g.color} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span className="k-num k-gain" style={{ fontSize: 11, fontWeight: 600 }}>100%</span>
            <span className="k-label dim">Reached {fmtTargetMonth(g.targetDate)}</span>
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
            <span className="k-num" style={{ fontSize: 19, fontWeight: 600 }}>{fmt(balance)}</span>
            <span className="k-num" style={{ fontSize: 12, color: 'var(--qahwa-fg-3)' }}>of {fmt(g.target)}</span>
          </div>
          <Progress pct={pct} color={g.color} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span className="k-num" style={{ fontSize: 11, color: g.color, fontWeight: 600 }}>{pct}%</span>
            <span className="k-label dim">Target {fmtTargetMonth(g.targetDate)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--qahwa-border)' }}>
            {g.status === 'paused' ? (
              <span className="k-micro" style={{ letterSpacing: '0.04em' }}>Paused &middot; resume to track contribution</span>
            ) : (
              <React.Fragment>
                <span className="k-micro" style={{ letterSpacing: '0.04em' }}>
                  <span className="k-num k-em" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(monthly)}/mo</span> to finish
                </span>
                <span className="k-label dim">{ml} mo left</span>
              </React.Fragment>
            )}
          </div>
        </React.Fragment>
      )}
    </div>
  )
}

export function Buckets({ data, nav }) {
  const { goals, profile } = data
  const active = goals.filter((g) => g.status === 'active')
  const ongoing = goals.filter((g) => g.status !== 'completed')
  const done = goals.filter((g) => g.status === 'completed')
  const totalSaved = goals.reduce((s, g) => s + g.allocated, 0)
  const netSavings = goals.reduce((s, g) => s + (g.allocated - (g.spent || 0)), 0)
  const requiredMonthly = active.reduce((s, g) => s + monthlyNeeded(g), 0)
  const saveBudget = Math.round(profile.salary * profile.split.save / 100)
  const over = requiredMonthly - saveBudget
  const overCap = over > 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-gain)'
  return (
    <div className="k-screen">
      <div className="k-phead">
        <div><div className="k-htitle">Savings Goals</div></div>
        <div className="k-asof">{active.length} active<br />{goals.length} total</div>
      </div>
      <div className="k-sec" style={{ marginTop: 18 }}>
        <div className="k-stats">
          <div className="k-stat">
            <span className="k-label dim">Total saved</span>
            <span className="k-stat-val">{fmt(totalSaved)}<span className="k-sar" style={{ marginLeft: 5 }}>SAR</span></span>
            <span className="k-stat-cap">Lifetime contributions</span>
          </div>
          <div className="k-stat">
            <span className="k-label dim">Net savings</span>
            <span className="k-stat-val k-gain">{fmt(netSavings)}<span className="k-sar" style={{ marginLeft: 5 }}>SAR</span></span>
            <span className="k-stat-cap">Current balance</span>
          </div>
          <div className="k-stat">
            <span className="k-label dim">Required monthly</span>
            <span className="k-stat-val k-em">{fmt(requiredMonthly)}<span className="k-sar" style={{ marginLeft: 5 }}>/mo</span></span>
            <span className="k-stat-cap" style={{ color: overCap }}>{over > 0 ? 'Over save budget' : 'Within budget'}</span>
          </div>
          <div className="k-stat">
            <span className="k-label dim">Save budget</span>
            <span className="k-stat-val">{fmt(saveBudget)}<span className="k-sar" style={{ marginLeft: 5 }}>/mo</span></span>
            <span className="k-stat-cap" style={{ color: overCap }}>{over > 0 ? 'Short ' + fmt(over) + ' SAR' : fmt(-over) + ' spare'}</span>
          </div>
        </div>
      </div>
      <div className="k-sec">
        {ongoing.length ? ongoing.map((g) => <BucketCard key={g.id} g={g} onClick={() => nav.openBucket(g.id)} onEdit={nav.editBucket} onDelete={nav.deleteBucket} />)
          : <Empty>No active buckets.</Empty>}
      </div>
      {done.length > 0 && (
        <React.Fragment>
          <div className="k-sec" style={{ marginTop: 24 }}>
            <div className="k-sec-head"><span className="k-label">Completed &amp; spent</span><span className="k-micro">{done.length}</span></div>
          </div>
          <div className="k-sec" style={{ marginTop: 0 }}>
            {done.map((g) => <BucketCard key={g.id} g={g} onClick={() => nav.openBucket(g.id)} onEdit={nav.editBucket} onDelete={nav.deleteBucket} />)}
          </div>
        </React.Fragment>
      )}
    </div>
  )
}

function ActivityLog({ entries }) {
  return (
    <div className="k-sec">
      <div className="k-sec-head"><span className="k-label">Activity log</span><span className="k-micro">{entries.length}</span></div>
      {entries.length ? entries.map((e, i) => {
        const s = entryStyle[e.type] || { sign: '', cls: '', label: e.type }
        return (
          <div className="k-row" key={i}>
            <span className="k-sq" style={{ color: e.cls ? `var(--qahwa-${e.type === 'deposit' ? 'gain' : 'loss'})` : 'var(--qahwa-fg-2)' }}>{s.sign || '·'}</span>
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

export function BucketDetail({ g, onClose, onMove }) {
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
      <div className="k-detail-bar"><button className="k-back" onClick={onClose}>&lsaquo; Buckets</button></div>
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
            <span className="k-label dim">Amount &middot; SAR</span>
            <input className="k-input k-amount-in" inputMode="decimal" placeholder="0" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
          </div>
          <div className="k-field">
            <span className="k-label dim">Note &middot; optional</span>
            <input className="k-input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className={'k-btn full ' + (mode === 'deposit' ? 'accent' : '')} style={{ marginTop: 22, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(goal.id, { type: mode, amount: Math.round(parseFloat(amount) * 100) / 100, date: TODAY, note: note.trim() }); close() } }}>
            {cta[mode]}
          </button>
        </>
      )}
    </Sheet>
  )
}

export function EditBucketSheet({ goal, onClose, onSave, onDelete }) {
  const [name, setName] = React.useState(goal.name)
  const [target, setTarget] = React.useState(String(goal.target))
  const [tdate, setTdate] = React.useState(goal.targetDate)
  const valid = name.trim() && parseFloat(target) > 0
  return (
    <Sheet title={'Edit · ' + goal.name} onClose={onClose}>
      {(close) => (
        <>
          <div className="k-field" style={{ marginTop: 14 }}>
            <span className="k-label dim">Name</span>
            <input className="k-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="k-field">
            <span className="k-label dim">Target &middot; SAR</span>
            <input className="k-input k-num" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="k-field">
            <span className="k-label dim">Target month</span>
            <input className="k-input k-num" type="month" value={tdate} onChange={(e) => setTdate(e.target.value)} />
          </div>
          <button className="k-btn accent full" style={{ marginTop: 22, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(goal.id, { name: name.trim(), target: parseInt(target, 10), targetDate: tdate }); close() } }}>
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
