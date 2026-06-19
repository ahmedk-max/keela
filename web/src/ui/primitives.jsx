/* Keela — shared UI primitives. Qahwa language. (ported from design ui.jsx) */
import React from 'react'
import { fmt, fmtDate } from '../lib/format'
import { getCat } from '../lib/icons'
const { useState, useEffect, useRef, createContext, useContext } = React

/* ---------- Brand mark (two coffee cups from above) ---------- */
export function Mark({ size = 24, fill = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={style} aria-hidden="true">
      <circle cx="156" cy="148" r="36" fill={fill} />
      <circle cx="156" cy="320" r="100" fill={fill} />
      <circle cx="356" cy="148" r="36" fill={fill} />
      <circle cx="356" cy="320" r="100" fill={fill} />
    </svg>
  )
}

/* ---------- Money / numbers ---------- */
export function Money({ value, dp = 0, sar = false, cls = '' }) {
  return (
    <span className={'k-num ' + cls} style={{ fontFeatureSettings: '"tnum" 1' }}>
      {sar && <span className="k-sar" style={{ marginRight: 5 }}>SAR</span>}
      {fmt(value, dp)}
    </span>
  )
}

export function Delta({ value, pct, dp = 0, abs = false }) {
  const up = value >= 0
  const arrow = value === 0 ? '—' : up ? '▲' : '▼'
  const cls = value === 0 ? 'k-flat' : up ? 'k-gain' : 'k-loss'
  return (
    <span className={'k-num ' + cls} style={{ fontWeight: 500 }}>
      {arrow} {pct != null ? `${fmt(Math.abs(pct), dp)}%` : abs ? fmt(Math.abs(value), dp) : fmt(value, dp)}
    </span>
  )
}

/* ---------- reduced-motion check ---------- */
export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Count-up number — eases to value on mount and on change ----------
   The fill of bars rises with CSS; the figures count up here in lockstep. Starts
   from 0 on mount, animates from the previous value on live updates. */
export function CountUp({ value, dp = 0, duration = 650, className = '', style }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const to = Number(value) || 0
    if (prefersReduced() || from === to) { setDisplay(to); fromRef.current = to; return }
    let start = null
    const ease = (t) => 1 - Math.pow(1 - t, 3) // easeOutCubic
    const step = (ts) => {
      if (start === null) start = ts
      const t = Math.min(1, (ts - start) / duration)
      setDisplay(from + (to - from) * ease(t))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])
  return <span className={className} style={style}>{fmt(display, dp)}</span>
}

/* ---------- Floating quick-add button (the daily action, always a thumb away) --- */
export function Fab({ onClick, label = 'Add transaction' }) {
  return (
    <button className="k-fab" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  )
}

/* ---------- Keela whisper — a quiet, derived one-liner in her voice ---------- */
export function KeelaWhisper({ children }) {
  if (!children) return null
  return (
    <div className="k-whisper">
      <span className="k-ember" />
      <span className="k-whisper-txt">{children}</span>
    </div>
  )
}

/* ---------- Trend path builder ---------- */
export function buildTrend(values, w, h, padTop = 6, padBot = 6) {
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const n = values.length
  const x = (i) => (n > 1 ? (i / (n - 1)) * w : w / 2)
  const y = (v) => padTop + (1 - (v - min) / span) * (h - padTop - padBot)
  const pts = values.map((v, i) => [x(i), y(v)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ')
  const area = line + ` L${w} ${h} L0 ${h} Z`
  return { line, area, pts }
}

/* ---------- Hero trend backdrop ---------- */
export function TrendBackdrop({ values }) {
  const W = 360, H = 96
  const { line, area } = buildTrend(values, W, H, 10, 2)
  const [inn, setInn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setInn(true), 40); return () => clearTimeout(t) }, [])
  return (
    <div className="k-hero-trend">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={area} className="k-trendfill" style={{ opacity: inn ? 0.1 : 0 }} />
        <path d={line} className="k-trendline" pathLength="1"
          style={{ strokeDasharray: 1, strokeDashoffset: inn ? 0 : 1 }} />
      </svg>
    </div>
  )
}

/* ---------- Bottom sheet — CSS-keyframe enter, JS-flagged exit (no first-frame race) ---------- */
export const SheetCloseCtx = createContext(() => {})
export const useSheetClose = () => useContext(SheetCloseCtx)

export function Sheet({ title, onClose, children }) {
  const [out, setOut] = useState(false)
  const sheetRef = useRef(null)
  const close = () => {
    if (out) return
    setOut(true)
    setTimeout(onClose, 280) // a hair longer than the 260ms exit animation
  }

  // Focus the marked field only AFTER the slide-in finishes. Focusing during the
  // animation raises the keyboard mid-flight, which resizes the viewport and
  // breaks the entrance. Waiting for animationend keeps the open glitch-free.
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    let done = false
    const focusNow = () => {
      if (done) return
      done = true
      el.querySelector('[data-autofocus]')?.focus()
    }
    const onEnd = (e) => { if (e.target === el && e.animationName === 'ksheet-in') focusNow() }
    el.addEventListener('animationend', onEnd)
    const fallback = setTimeout(focusNow, 460) // in case animationend never fires
    return () => { el.removeEventListener('animationend', onEnd); clearTimeout(fallback) }
  }, [])

  return (
    <SheetCloseCtx.Provider value={close}>
      <div className={'k-overlay' + (out ? ' out' : '')} onClick={close}>
        <div className="k-sheet" ref={sheetRef} onClick={(e) => e.stopPropagation()}>
          <div className="k-sheet-grab" />
          <div className="k-sheet-head">
            <span className="k-sheet-title">{title}</span>
            <button className="k-sheet-cancel" onClick={close}>Cancel</button>
          </div>
          <div className="k-sheet-body">{typeof children === 'function' ? children(close) : children}</div>
        </div>
      </div>
    </SheetCloseCtx.Provider>
  )
}

/* ---------- Sparkline (detail views) ---------- */
export function Sparkline({ values, h = 48, stroke = 'var(--qahwa-accent)', fill = true }) {
  const W = 320, H = h
  const { line, area } = buildTrend(values, W, H, 6, 4)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      {fill && <path d={area} fill={stroke} opacity="0.06" />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------- Pact ledger gauge ----------
   kept/target = this cycle's save rate vs the pact line. Optional `vow` renders
   the 36-month countdown (Oct 2024 → Oct 2027) as a thin progress strip. */
export function PactGauge({ kept, target, vow }) {
  const ahead = kept - target
  return (
    <div className="k-pact">
      <div className="k-pact-top">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="k-label" style={{ whiteSpace: 'nowrap' }}>Kept this cycle</span>
          <span className="k-pact-kept k-gain">{kept}%</span>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="k-label dim">Save {target} / Live {100 - target}</span>
          <span className={'k-num ' + (ahead >= 0 ? 'k-gain' : 'k-loss')} style={{ fontWeight: 600, fontSize: 13 }}>
            {ahead >= 0 ? '▲ +' : '▼ −'}{Math.abs(ahead)} {ahead >= 0 ? 'ahead' : 'behind'}
          </span>
        </div>
      </div>
      <div className="k-gauge">
        <div className="k-gauge-save" style={{ width: kept + '%' }}>
          <span className="k-gauge-seg-lbl" style={{ color: 'var(--qahwa-fg-inv)' }}>SAVE</span>
        </div>
        <div className="k-gauge-live">
          <span className="k-gauge-seg-lbl" style={{ color: 'var(--qahwa-fg-2)' }}>LIVE</span>
        </div>
        <div className="k-gauge-tick" data-l={target} style={{ left: target + '%' }} />
      </div>
      {vow && (
        <div className="k-pact-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="k-micro" style={{ letterSpacing: '0.04em' }}>The vow &middot; month {vow.elapsed} of {vow.total}</span>
            <span className="k-num k-em" style={{ fontWeight: 600, fontSize: 11 }}>{vow.left} mo left</span>
          </div>
          <div className="k-vow-bar"><i style={{ width: Math.min(100, vow.elapsed / vow.total * 100) + '%' }} /></div>
        </div>
      )}
    </div>
  )
}

/* ---------- Progress bar ---------- */
export function Progress({ pct, color = 'var(--qahwa-accent)' }) {
  return (
    <div className="k-bar">
      <i style={{ width: Math.min(100, pct) + '%', background: color }} />
    </div>
  )
}

/* ---------- Keela note object ---------- */
export function KeelaNote({ date, children, clamp = false, onClick }) {
  return (
    <div className="k-knote" onClick={onClick} style={onClick ? { cursor: 'pointer' } : null}>
      <div className="k-knote-head">
        <span className="k-ember" />
        <span className="k-knote-by">Keela</span>
        {date && <span className="k-knote-date">{fmtDate(date)}</span>}
      </div>
      <div className={'k-knote-body' + (clamp ? ' clamp' : '')}>{children}</div>
    </div>
  )
}

/* ---------- Icon badge (coloured tile) ---------- */
export function Badge({ icon, img = null, color = 'var(--qahwa-fg-2)', dashed = false, ember = false }) {
  return (
    <span className={'k-sq tinted' + (dashed ? ' dashed' : '')} style={{ '--c': color }}>
      {img ? <img src={img} alt="" /> : icon}
      {ember && <span className="k-ember" />}
    </span>
  )
}

/* ---------- Category badge (icon + colour, falls back to a letter code) ---------- */
export function CatSquare({ cat, code, keela }) {
  const meta = getCat(cat)
  if (!meta) {
    return <span className="k-sq">{code}{keela && <span className="k-ember" />}</span>
  }
  return <Badge icon={meta.icon} color={meta.color} ember={keela} />
}

/* ---------- Tag ---------- */
export function Tag({ children, kind = '' }) {
  return <span className={'k-tag ' + kind}>{children}</span>
}

/* ---------- Segmented control ---------- */
export function Segmented({ items, value, onChange }) {
  return (
    <div className="k-seg">
      {items.map((it) => (
        <div key={it.v} className={'k-seg-item' + (value === it.v ? ' on' : '')} onClick={() => onChange(it.v)}>
          {it.label}
        </div>
      ))}
    </div>
  )
}

/* ---------- Empty state ---------- */
export function Empty({ children }) {
  return (
    <div className="k-empty">
      <Mark size={30} fill="var(--qahwa-fg-3)" style={{ opacity: 0.5 }} />
      <div className="k-empty-txt">{children}</div>
    </div>
  )
}

/* ---------- Markdown (small subset) ---------- */
function parseInline(text, keyBase) {
  const nodes = []
  let rest = text, k = 0
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/
  let mt
  while ((mt = rest.match(re))) {
    const idx = mt.index
    if (idx > 0) nodes.push(rest.slice(0, idx))
    if (mt[2] != null) nodes.push(<strong key={keyBase + '-' + (k++)}>{mt[2]}</strong>)
    else nodes.push(<em key={keyBase + '-' + (k++)}>{mt[3]}</em>)
    rest = rest.slice(idx + mt[0].length)
  }
  if (rest) nodes.push(rest)
  return nodes
}

const isRow = (l) => /^\s*\|.*\|\s*$/.test(l)
const isSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l)
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ text }) {
  const lines = text.split('\n')
  const out = []
  let list = null
  const flush = () => { if (list) { out.push(<ul key={'ul' + out.length}>{list}</ul>); list = null } }
  let i = 0
  while (i < lines.length) {
    const ln = lines[i]
    // tables
    if (isRow(ln) && i + 1 < lines.length && isSep(lines[i + 1])) {
      flush()
      const header = cells(ln)
      i += 2
      const rows = []
      while (i < lines.length && isRow(lines[i])) { rows.push(cells(lines[i])); i++ }
      out.push(
        <div key={'t' + i} style={{ overflowX: 'auto', margin: '4px 0 14px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr>{header.map((h, j) => (
                <th key={j} style={{ textAlign: j ? 'right' : 'left', padding: '6px 8px', borderBottom: '1px solid var(--qahwa-border-strong)', color: 'var(--qahwa-fg-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, j) => (
                <td key={j} style={{ textAlign: j ? 'right' : 'left', padding: '6px 8px', borderBottom: '1px solid var(--qahwa-border)', fontFamily: j ? 'var(--qahwa-font-data)' : 'inherit', color: 'var(--qahwa-fg-1)' }}>{parseInline(c, ri * 20 + j)}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^#{1,3}\s/.test(ln)) { flush(); out.push(<h3 key={i}>{ln.replace(/^#{1,3}\s+/, '')}</h3>); i++; continue }
    if (/^---+\s*$/.test(ln)) { flush(); out.push(<div key={i} className="k-divide" style={{ margin: '14px 0' }} />); i++; continue }
    if (ln.startsWith('- ') || /^\d+\.\s/.test(ln)) {
      const content = ln.replace(/^(-\s|\d+\.\s)/, '')
      if (!list) list = []
      list.push(<li key={i}>{parseInline(content, i)}</li>)
      i++; continue
    }
    if (ln.startsWith('> ')) {
      flush()
      out.push(<p key={i} style={{ borderLeft: '1px solid var(--qahwa-accent)', paddingLeft: 12, fontStyle: 'italic', color: 'var(--qahwa-fg-2)' }}>{parseInline(ln.slice(2), i)}</p>)
      i++; continue
    }
    if (ln.trim() === '') { flush(); i++; continue }
    flush(); out.push(<p key={i}>{parseInline(ln, i)}</p>); i++
  }
  flush()
  return <div className="k-md">{out}</div>
}

/* ---------- Tab glyphs (minimal 1px) ---------- */
export const TabGlyph = {
  home: <svg className="k-tab-glyph" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13l4-4 3 3 5-6 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  spend: <svg className="k-tab-glyph" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 5h14M3 10h14M3 15h9" strokeLinecap="round" /></svg>,
  buckets: <svg className="k-tab-glyph" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 5h12l-1.5 11h-9L4 5z" strokeLinejoin="round" /><path d="M4 9h12" /></svg>,
  assets: <svg className="k-tab-glyph" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 16V9M9 16V4M14 16v-5" strokeLinecap="round" /></svg>,
  keela: <svg className="k-tab-glyph" viewBox="0 0 20 20" fill="currentColor"><circle cx="6" cy="6" r="1.7" /><circle cx="6" cy="13" r="4" /><circle cx="14" cy="6" r="1.7" /><circle cx="14" cy="13" r="4" /></svg>,
}

/* ---------- Tiny inline icons (hand-drawn, 1px) ---------- */
export const Icons = {
  edit: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11.8 1.9 14.1 4.2 5.3 13l-3 .7.7-3z" />
      <path d="M10.1 3.6l2.3 2.3" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.8 4.3h10.4M6 4.3V2.8h4v1.5M4.6 4.3l.5 8.4a1 1 0 0 0 1 1h3.8a1 1 0 0 0 1-1l.5-8.4" />
      <path d="M6.7 6.9v4.1M9.3 6.9v4.1" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1.5v2.2M9 14.3v2.2M1.5 9h2.2M14.3 9h2.2M3.7 3.7l1.6 1.6M12.7 12.7l1.6 1.6M14.3 3.7l-1.6 1.6M5.3 12.7l-1.6 1.6" />
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
      <path d="M3 5.5h5.5M13 5.5h2" />
      <circle cx="10.5" cy="5.5" r="1.9" fill="var(--qahwa-canvas)" />
      <path d="M3 12.5h2M9.5 12.5h5.5" />
      <circle cx="7" cy="12.5" r="1.9" fill="var(--qahwa-canvas)" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ),
}
