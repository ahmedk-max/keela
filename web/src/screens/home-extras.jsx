/* Keela — Home extras: income & pact settings sheet ("Warm" language). */
import React from 'react'
import { useTheme } from '../lib/theme'
import { fmt } from '../lib/format'
import { Sheet, Field, SheetSave } from '../ui/primitives'

const lbl = (th) => ({ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3 })

/* ---------- Income & pact settings sheet ----------
   Contract preserved: onSave(profilePatch, streams) — streams[0] is Salary. */
export function IncomeSettingsSheet({ profile, income, onClose, onSave }) {
  const th = useTheme()
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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '16px 2px 8px' }}>
            <span style={lbl(th)}>Income streams</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: th.ink2 }}>Total {fmt(recTotal)}/mo</span>
          </div>
          {streams.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 9 }}>
              <Field value={s.name} onChange={(e) => setField(i, 'name', e.target.value)} placeholder="Name" style={{ flex: 1, minWidth: 0, marginTop: 0 }} />
              <Field value={s.amount} onChange={(e) => setField(i, 'amount', num(e.target.value))} inputMode="numeric" placeholder="0" style={{ width: 92, flex: 'none', textAlign: 'right', marginTop: 0 }} />
              <button onClick={() => removeStream(i)} aria-label="Remove" style={{ width: 34, height: 34, flex: 'none', border: 'none', borderRadius: 10, background: th.card2, color: th.loss, fontSize: 18, lineHeight: 0, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <button onClick={addStream} style={{ width: '100%', border: `1.5px dashed ${th.line}`, background: 'none', borderRadius: 12, padding: 10, fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: th.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>+ ADD INCOME STREAM</button>

          <div style={{ ...lbl(th), margin: '18px 2px 8px' }}>The pact · save / live split</div>
          <div style={{ background: th.card2, borderRadius: 16, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 11, fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: th.green }}>Save {saveNum}%</span>
              <span style={{ color: th.ink2 }}>Live {100 - saveNum}%</span>
            </div>
            <input type="range" min="5" max="95" step="5" value={saveNum} onChange={(e) => setSave(e.target.value)} style={{ width: '100%', accentColor: th.accent }} />
          </div>

          <div style={{ ...lbl(th), margin: '16px 2px 8px' }}>Payday</div>
          <Field value={payday} onChange={(e) => setPayday(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} inputMode="numeric" placeholder="27" style={{ marginTop: 0 }} />

          <SheetSave onClick={() => {
            onSave(
              { ...profile, payday: parseInt(payday, 10) || profile.payday, split: { save: saveNum, live: 100 - saveNum } },
              streams.map((s) => ({ ...s, amount: num(s.amount), name: (s.name || '').trim() || 'Income' })),
            )
            close()
          }} style={{ marginTop: 18 }}>Save settings</SheetSave>

          {/* Build stamp — confirms the installed PWA is running the latest deploy. */}
          <div style={{ ...lbl(th), textAlign: 'center', marginTop: 18, opacity: 0.6 }}>
            Keela · build {__BUILD_ID__} UTC
          </div>
        </>
      )}
    </Sheet>
  )
}
