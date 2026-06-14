/* Keela — Home extras: bucket rings, cashflow river, income settings (ported) */
import React from 'react'
import { fmt, monthsBetween, NOW_MONTH } from '../lib/format'
import { Sheet, Icons } from '../ui/primitives'

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
  const off = c * (1 - Math.min(1, Math.max(0, pct / 100)))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flex: 'none' }}>
      <circle cx={cc} cy={cc} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={cc} cy={cc} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="butt"
        transform={`rotate(-90 ${cc} ${cc})`} style={{ transition: 'stroke-dashoffset 700ms var(--qahwa-ease)' }} />
    </svg>
  )
}

/* ---------- Bucket rings (minimal overview) ---------- */
export function BucketRings({ goals, onOpen }) {
  return (
    <div className="k-rings-open">
      {goals.map((g) => {
        const pct = Math.round((g.allocated - (g.spent || 0)) / g.target * 100)
        return (
          <button className="k-ring-row" key={g.id} onClick={() => onOpen(g.id)}>
            <Ring pct={pct} color={g.color} size={42} stroke={4} />
            <span className="k-ring-mid">
              <span className="k-ring-name">{g.name}</span>
              <span className="k-num" style={{ fontSize: 12, fontWeight: 600, color: g.color }}>{pct}%</span>
            </span>
            <span className="k-ring-r">
              <span className="k-num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(g.allocated)}<span className="k-sar" style={{ marginLeft: 4 }}>SAR</span></span>
              <span className="k-num" style={{ fontSize: 11, color: 'var(--qahwa-fg-3)' }}>of {fmt(g.target)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Cashflow river (compact Sankey) ---------- */
export function CashflowRiver({ income, fixed, subs, variable }) {
  const expenses = fixed + subs + variable
  const savings = Math.max(0, income - expenses)
  const total = income || 1
  const W = 340, H = 176, padY = 6, gap = 3
  const innerH = H - padY * 2
  const sc = (v) => v / total * innerH
  const xInc = [6, 20], xExp = [156, 168], xOut = [322, 336]

  const incSav = { y: padY, h: sc(savings) }
  const incExp = { y: padY + sc(savings), h: sc(expenses) }

  let oy = padY
  const oSav = { y: oy, h: sc(savings) }; oy += oSav.h + gap
  const oFix = { y: oy, h: sc(fixed) }; oy += oFix.h + gap
  const oSub = { y: oy, h: sc(subs) }; oy += oSub.h + gap
  const oVar = { y: oy, h: sc(variable) }

  const expNode = { y: oFix.y, h: sc(expenses) }
  let ey = expNode.y
  const eFix = { y: ey, h: sc(fixed) }; ey += eFix.h
  const eSub = { y: ey, h: sc(subs) }; ey += eSub.h
  const eVar = { y: ey, h: sc(variable) }

  const ribbon = (x1, s1, x2, s2, fill, op) => {
    const mx = (x1 + x2) / 2
    const d = `M${x1} ${s1.y} C${mx} ${s1.y} ${mx} ${s2.y} ${x2} ${s2.y} L${x2} ${(s2.y + s2.h)} C${mx} ${(s2.y + s2.h)} ${mx} ${(s1.y + s1.h)} ${x1} ${(s1.y + s1.h)} Z`
    return <path d={d} fill={fill} opacity={op} />
  }
  const node = (x, n, fill) => <rect x={x[0]} y={n.y} width={x[1] - x[0]} height={Math.max(1, n.h)} fill={fill} />
  const G = 'var(--qahwa-gain)', R = 'var(--qahwa-loss)', A = 'var(--qahwa-accent)', B = 'var(--qahwa-brewed)', E = 'var(--qahwa-espresso)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {ribbon(xInc[1], incSav, xOut[0], oSav, G, 0.3)}
      {ribbon(xInc[1], incExp, xExp[0], expNode, R, 0.26)}
      {ribbon(xExp[1], eFix, xOut[0], oFix, R, 0.34)}
      {ribbon(xExp[1], eSub, xOut[0], oSub, A, 0.42)}
      {ribbon(xExp[1], eVar, xOut[0], oVar, B, 0.4)}
      {node(xInc, { y: padY, h: innerH }, E)}
      {node(xExp, expNode, R)}
      {node(xOut, oSav, G)}
      {node(xOut, oFix, R)}
      {node(xOut, oSub, A)}
      {node(xOut, oVar, B)}
    </svg>
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
          <div key={s.id} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <input className="k-input" style={{ flex: 1, padding: '10px' }} placeholder="Name" value={s.name} onChange={(e) => setField(i, 'name', e.target.value)} />
            <input className="k-input k-num" style={{ width: 96, padding: '10px', textAlign: 'right' }} inputMode="numeric" placeholder="0" value={s.amount} onChange={(e) => setField(i, 'amount', num(e.target.value))} />
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

      <button className="k-btn accent full" style={{ marginTop: 22 }}
        onClick={() => { onSave(
          { ...profile, payday: parseInt(payday, 10) || profile.payday, split: { save: saveNum, live: 100 - saveNum } },
          streams.map((s) => ({ ...s, amount: num(s.amount), name: s.name.trim() || 'Income' })),
        ); close() }}>
        SAVE SETTINGS
      </button>
        </>
      )}
    </Sheet>
  )
}
