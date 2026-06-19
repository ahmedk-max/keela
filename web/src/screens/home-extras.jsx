/* Keela — Home extras: bucket rings, cashflow river, income settings (ported) */
import React from 'react'
import { fmt, monthsBetween, NOW_MONTH } from '../lib/format'
import { Sheet, Icons, prefersReduced } from '../ui/primitives'

export function hxMonthsLeft(g) { return Math.max(0, monthsBetween(NOW_MONTH, g.targetDate)) }
export function hxMonthly(g) {
  const remain = g.target - (g.allocated - (g.spent || 0))
  if (remain <= 0) return 0
  const m = hxMonthsLeft(g)
  return m > 0 ? Math.ceil(remain / m) : remain
}

/* ---------- Ring (circular progress) ---------- */
export function Ring({ pct, color = 'var(--qahwa-accent)', size = 46, stroke = 4, track = 'var(--qahwa-surface-sunk)' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, cc = size / 2
  // sweep up from empty on mount — the dash-offset transition does the work
  const [shown, setShown] = React.useState(() => (prefersReduced() ? pct : 0))
  React.useEffect(() => {
    if (prefersReduced()) { setShown(pct); return }
    const id = requestAnimationFrame(() => setShown(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])
  const off = c * (1 - Math.min(1, Math.max(0, shown / 100)))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flex: 'none' }}>
      <circle cx={cc} cy={cc} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={cc} cy={cc} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="butt"
        transform={`rotate(-90 ${cc} ${cc})`} style={{ transition: 'stroke-dashoffset 700ms var(--qahwa-ease)' }} />
    </svg>
  )
}

/* ---------- Savings goals (horizontal rail of ring cards) ---------- */
export function GoalScroll({ goals, onOpen }) {
  if (!goals.length) {
    return <div className="k-micro" style={{ color: 'var(--qahwa-fg-3)', fontStyle: 'italic' }}>No active goals — every bucket is full.</div>
  }
  return (
    <div className="k-goalscroll">
      {goals.map((g) => {
        const bal = Math.max(0, (g.allocated || 0) - (g.spent || 0))
        const pct = Math.round(bal / g.target * 100)
        const funded = g.status === 'completed' || (g.allocated || 0) >= g.target
        return (
          <button className="k-goalcard" key={g.id} onClick={() => onOpen(g.id)}>
            <span className="k-goalcard-ring">
              <Ring pct={funded ? 100 : pct} color={g.color} size={66} stroke={5} />
              {funded && <span className="k-goalcard-check" style={{ color: g.color }}>{Icons.check}</span>}
            </span>
            <span className="k-goalcard-name">{g.name}</span>
            <span className="k-num k-goalcard-pct" style={{ color: g.color }}>{funded ? 'Funded' : pct + '%'}</span>
            <span className="k-num k-goalcard-amt">
              {fmt(bal)} <span style={{ color: 'var(--qahwa-fg-3)' }}>{funded ? 'left' : '/ ' + fmt(g.target)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Runway bar (liquid vs earmarked split of net worth) ----------
   Two segments only: liquid runway (gain) and everything earmarked clumped into
   one neutral block. The per-bucket breakdown lives in the caption below, not the
   bar — a clean split reads better than a muddy stack of goal colours. */
export function RunwayBar({ liquid, earmarked }) {
  const total = liquid + earmarked || 1
  return (
    <div className="k-flowbar">
      <div className="k-flowbar-seg" style={{ width: (liquid / total * 100) + '%', background: 'var(--qahwa-gain)' }} />
      {earmarked > 0 && (
        <div className="k-flowbar-seg" style={{ width: (earmarked / total * 100) + '%', background: 'var(--qahwa-flat)' }} />
      )}
    </div>
  )
}

/* ---------- Cashflow bar (income split: saved / expenses / variable) ---------- */
export function CashflowRiver({ saved, expenses, variable }) {
  const total = Math.max(0, saved) + expenses + variable || 1
  const segs = [
    { v: Math.max(0, saved), c: 'var(--qahwa-gain)' },
    { v: expenses, c: 'var(--qahwa-loss)' },
    { v: variable, c: 'var(--qahwa-brewed)' },
  ].filter((s) => s.v > 0)
  return (
    <div className="k-flowbar">
      {segs.map((s, i) => (
        <div key={i} className="k-flowbar-seg" style={{ width: (s.v / total * 100) + '%', background: s.c }} />
      ))}
    </div>
  )
}

/* ---------- Income settings sheet ---------- */
export function IncomeSettingsSheet({ profile, income, onClose, onSave }) {
  const [streams, setStreams] = React.useState(income.map((s) => ({ ...s })))
  const [save, setSave] = React.useState(profile.split.save)
  const [payday, setPayday] = React.useState(String(profile.payday))
  const num = (v) => parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0
  const setField = (i, k, v) => setStreams((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const addStream = () => setStreams((s) => [...s, { id: 'inc' + Date.now(), name: '', amount: 0, code: 'IN', recurring: true }])
  const removeStream = (i) => setStreams((s) => s.filter((_, j) => j !== i))
  const recTotal = streams.filter((s) => s.recurring).reduce((a, s) => a + num(s.amount), 0)
  const saveNum = Math.min(95, Math.max(5, num(save) || 70))

  return (
    <Sheet title="Income & pact settings" onClose={onClose}>
      {(close) => (
        <>
      <div className="k-field" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span className="k-label dim">Income streams</span>
          <span className="k-num" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(recTotal)}<span className="k-sar" style={{ marginLeft: 4 }}>/mo</span></span>
        </div>
        {streams.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <input className="k-input" style={{ flex: 1 }} placeholder="Name" value={s.name} onChange={(e) => setField(i, 'name', e.target.value)} />
            <input className="k-input k-num" style={{ width: 104, textAlign: 'right' }} inputMode="numeric" placeholder="0" value={s.amount} onChange={(e) => setField(i, 'amount', num(e.target.value))} />
            <button className="k-iconbtn ico danger" title="Remove" onClick={() => removeStream(i)}>{Icons.trash}</button>
          </div>
        ))}
        <button className="k-btn ghost full sm" style={{ marginTop: 10 }} onClick={addStream}>+ ADD INCOME STREAM</button>
      </div>

      <div className="k-field">
        <span className="k-label dim">The pact &middot; save / live split</span>
        <div className="k-panel tint" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="k-num k-gain" style={{ fontWeight: 600 }}>Save {saveNum}%</span>
            <span className="k-num" style={{ color: 'var(--qahwa-fg-2)', fontWeight: 600 }}>Live {100 - saveNum}%</span>
          </div>
          <input type="range" min="5" max="95" step="5" value={saveNum} onChange={(e) => setSave(e.target.value)} style={{ width: '100%', accentColor: 'var(--qahwa-accent)' }} />
        </div>
      </div>

      <div className="k-field">
        <span className="k-label dim">Payday</span>
        <input className="k-input k-num" inputMode="numeric" value={payday} onChange={(e) => setPayday(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
      </div>

      <button className="k-btn accent full" style={{ marginTop: 18 }}
        onClick={() => { onSave(
          { ...profile, payday: parseInt(payday, 10) || profile.payday, split: { save: saveNum, live: 100 - saveNum } },
          streams.map((s) => ({ ...s, amount: num(s.amount), name: s.name.trim() || 'Income' })),
        ); close() }}>
        SAVE SETTINGS
      </button>

      {/* Build stamp — confirms the installed PWA is running the latest deploy
          (the service worker can otherwise serve a stale cached build). */}
      <div className="k-label dim" style={{ textAlign: 'center', marginTop: 18, opacity: 0.6 }}>
        Keela &middot; build {__BUILD_ID__} UTC
      </div>
        </>
      )}
    </Sheet>
  )
}
