/* =========================================================================
   Keela — "Warm" shared primitives. Soft-rounded, theme-aware (inline styles
   from lib/theme.js via useTheme). SVG charts (ring / donut / sparkline / bars),
   the bottom sheet + detail-push shells, segmented control, count-up, whisper,
   category tile, tab glyphs and the FAB. Every screen composes from here.
   ========================================================================= */
import React from 'react'
import { useTheme, tint } from '../lib/theme'
import { fmt } from '../lib/format'

export const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Shared layout tokens — one source of truth for screen rhythm ----------
   Every screen's horizontal gutter and bordered "section divider" come from here so
   the vertical cadence and edge alignment stay identical across tabs. */
export const GUTTER = 20
export const sectionStyle = (th) => ({ padding: '22px 0 2px', marginTop: 22, borderTop: `1px solid ${th.line}` })

/* Detail-view action buttons (Deposit/Withdraw, Buy/Sell …) — paired primary +
   ghost so the bucket and holding detail views render an identical action row. */
export const actionPrimary = (th) => ({
  flex: 1, border: 'none', borderRadius: 14, padding: 14, background: th.accent, color: th.onAccent,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
})
export const actionGhost = (th) => ({
  flex: 1, border: `1.5px solid ${th.line}`, borderRadius: 14, padding: 14, background: th.card, color: th.ink,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
})

/* Small pill button used for the "Edit" affordance in every detail header. */
export const chipBtn = (th) => ({
  border: 'none', background: th.card2, borderRadius: 999, padding: '8px 15px',
  fontSize: 13, fontWeight: 700, color: th.ink2, cursor: 'pointer', fontFamily: 'inherit',
})

/* ---------- Brand mark (the four-circle Keela glyph) ---------- */
export function Mark({ size = 30, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={style} aria-hidden="true">
      <circle cx="156" cy="148" r="40" fill={color} />
      <circle cx="156" cy="322" r="100" fill={color} />
      <circle cx="356" cy="148" r="40" fill={color} />
      <circle cx="356" cy="322" r="100" fill={color} />
    </svg>
  )
}

/* ---------- Progress ring with mount sweep ----------
   Draws an empty track + a coloured arc that sweeps up from 0 on mount
   (stroke-dashoffset transition). `children` render centred in the ring. */
export function Ring({ pct = 0, size = 64, stroke = 6, color, track, children, sweep = true, style }) {
  const th = useTheme()
  const c = color || th.accent
  const tk = track || th.track
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const target = circ * (1 - Math.min(1, Math.max(0, pct / 100)))
  const [off, setOff] = React.useState(() => (sweep && !prefersReduced() ? circ : target))
  React.useEffect(() => {
    if (!sweep || prefersReduced()) { setOff(target); return }
    const id = requestAnimationFrame(() => setOff(target))
    return () => cancelAnimationFrame(id)
  }, [target, sweep])
  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tk} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 760ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      {children != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ---------- Sparkline (area + line) ---------- */
export function sparkPath(values, W = 320, H = 48) {
  if (!values || !values.length) return { line: '', area: '' }
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1, n = values.length
  const x = (i) => (n > 1 ? (i / (n - 1)) * W : W / 2)
  const y = (v) => 4 + (1 - (v - min) / span) * (H - 8)
  const line = values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')
  const area = line + ` L${W} ${H} L0 ${H} Z`
  return { line, area }
}
export function Sparkline({ values, w = 320, h = 48, color, fillOpacity = 0.1, strokeWidth = 2.5, width = '100%', height, style }) {
  const th = useTheme()
  const c = color || th.green
  const { line, area } = sparkPath(values, w, h)
  return (
    <svg width={width} height={height || h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', ...style }}>
      <path d={area} fill={c} opacity={fillOpacity} />
      <path d={line} fill="none" stroke={c} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------- Stacked bar (monthly flow / allocation / runway split) ---------- */
export function StackedBar({ segs = [], height = 14, gap = 3, radius = 999, track, animate = true, style }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: radius, overflow: 'hidden', gap,
      background: track || 'transparent', ...style }}>
      {segs.filter((s) => s.w > 0).map((s, i) => (
        <div key={i} style={{
          width: `${s.w}%`, background: s.color, borderRadius: radius, minWidth: 2,
          transformOrigin: 'left center',
          animation: animate && !prefersReduced() ? 'kgrowx 620ms cubic-bezier(.2,.8,.2,1) both' : undefined,
        }} />
      ))}
    </div>
  )
}

/* ---------- Single progress track ---------- */
export function Progress({ pct = 0, color, track, height = 10, radius = 999, style }) {
  const th = useTheme()
  return (
    <div style={{ position: 'relative', height, borderRadius: radius, background: track || th.track, overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', borderRadius: radius, width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color || th.accent, transition: 'width 560ms cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  )
}

/* ---------- Daily spend bars ---------- */
export function Bars({ values = [], max, elapsedIdx, color, peakColor, track, height = 90, style }) {
  const th = useTheme()
  const mx = max || Math.max(...values, 1)
  const peakIdx = values.indexOf(Math.max(...values))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, ...style }}>
      {values.map((v, i) => {
        const future = elapsedIdx != null && i + 1 > elapsedIdx
        const col = future ? (track || th.track) : (i === peakIdx && v > 0 ? (peakColor || th.accentPress) : (color || th.accent))
        return <div key={i} style={{ flex: 1, height: `${Math.max(3, (v / mx) * 100)}%`, borderRadius: 999, background: col, minHeight: 3 }} />
      })}
    </div>
  )
}

/* ---------- Donut (category arcs + centre + optional badges) ---------- */
export function donutGeom(cats, total, R = 58, cx = 80, cy = 80, gapPx = 5) {
  const C = 2 * Math.PI * R
  let cum = 0
  const segs = [], badges = []
  const gap = total > 0 ? gapPx : 0
  cats.forEach((c) => {
    const frac = total > 0 ? c.amount / total : 0
    const dashLen = frac * C
    const startDeg = cum * 360
    segs.push({
      dash: `${Math.max(0, dashLen - gap).toFixed(1)} ${(C + gap).toFixed(1)}`,
      rot: `rotate(${(startDeg - 90).toFixed(2)} ${cx} ${cy})`, color: c.color, C: C.toFixed(1),
    })
    const midDeg = (cum + frac / 2) * 360 - 90, rad = (midDeg * Math.PI) / 180
    badges.push({
      xPct: ((cx + R * Math.cos(rad)) / (cx * 2)) * 100,
      yPct: ((cy + R * Math.sin(rad)) / (cy * 2)) * 100,
      color: c.color, icon: c.icon, cat: c.cat,
    })
    cum += frac
  })
  return { segs, badges, C }
}
export function Donut({ cats = [], total = 0, size = 200, stroke = 15, badges = true, children, style }) {
  const th = useTheme()
  const { segs, badges: bd } = donutGeom(cats, total)
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', ...style }}>
      <svg width={size} height={size} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="58" fill="none" stroke={th.track} strokeWidth={stroke} />
        {segs.map((s, i) => (
          <circle key={i} cx="80" cy="80" r="58" fill="none" stroke={s.color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={s.dash} transform={s.rot} />
        ))}
      </svg>
      {badges && bd.map((b, i) => (
        <span key={i} style={{ position: 'absolute', left: `${b.xPct}%`, top: `${b.yPct}%`,
          transform: 'translate(-50%,-50%)', width: 26, height: 26, borderRadius: '50%',
          background: th.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,.12)', color: b.color }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}>{b.icon}</span>
        </span>
      ))}
      {children != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>{children}</div>
      )}
    </div>
  )
}

/* ---------- Category icon tile (rounded, tinted) ---------- */
export function CatTile({ color, icon, size = 40, radius = 13, dashed = false, style }) {
  const th = useTheme()
  return (
    <span style={{
      width: size, height: size, flex: 'none', borderRadius: radius,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: dashed ? 'transparent' : tint(color || th.accent, 13),
      border: dashed ? `1.5px dashed ${th.line}` : 'none',
      color: dashed ? th.ink3 : (color || th.accent),
      ...style,
    }}>
      <span style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5), display: 'flex' }}>{icon}</span>
    </span>
  )
}

/* ---------- Pill (status / pace badge) ---------- */
export function Pill({ children, bg, fg, style }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 999,
      background: bg, color: fg, whiteSpace: 'nowrap', ...style }}>{children}</span>
  )
}

/* ---------- Segmented control (pill track, accent active) ---------- */
export function Segmented({ options = [], value, onChange, style }) {
  const th = useTheme()
  return (
    <div style={{ display: 'flex', background: th.card2, borderRadius: 999, padding: 4, ...style }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, border: 'none', borderRadius: 999, padding: '9px 0', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            background: on ? th.accent : 'transparent', color: on ? th.onAccent : th.ink2,
            transition: 'background .2s ease, color .2s ease',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/* ---------- Count-up number (animates on mount, respects reduce-motion) ---------- */
export function CountUp({ value = 0, dp = 0, duration = 900, className, style }) {
  const [n, setN] = React.useState(() => (prefersReduced() ? value : 0))
  const from = React.useRef(0)
  React.useEffect(() => {
    if (prefersReduced()) { setN(value); return }
    const start = from.current, delta = value - start, t0 = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setN(start + delta * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className={className} style={style}>{fmt(n, dp)}</span>
}

/* ---------- Keela whisper — a quiet one-line nudge in her voice ---------- */
export function KeelaWhisper({ children, style }) {
  const th = useTheme()
  if (!children) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '13px 15px',
      borderRadius: 18, background: th.accentSoft, ...style }}>
      <span style={{ marginTop: 4, width: 16, height: 16, flex: 'none', borderRadius: 6,
        background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Mark size={9} color="#fff" />
      </span>
      <span style={{ fontSize: 12.5, lineHeight: 1.5, fontStyle: 'italic', color: th.ink2 }}>{children}</span>
    </div>
  )
}

/* ---------- Bottom sheet — rounded, grab handle, animated exit ----------
   Function-as-child: children receive a `close` that plays the exit animation
   then calls onClose. Use it after a save so the sheet slides away. */
export function Sheet({ title, onClose, children, cancelLabel = 'Cancel' }) {
  const th = useTheme()
  const [closing, setClosing] = React.useState(false)
  const close = React.useCallback(() => {
    if (prefersReduced()) { onClose && onClose(); return }
    setClosing(true)
    setTimeout(() => onClose && onClose(), 240)
  }, [onClose])
  return (
    <div className={'k-overlay' + (closing ? ' out' : '')} onClick={close}>
      <div className="k-sheet kscroll" onClick={(e) => e.stopPropagation()} style={{
        maxHeight: '88%', overflowY: 'auto', overflowX: 'hidden', background: th.card,
        borderRadius: '28px 28px 0 0', padding: '8px 20px calc(18px + env(safe-area-inset-bottom))',
        boxShadow: '0 -10px 40px rgba(0,0,0,.2)',
      }}>
        <div style={{ width: 34, height: 4, borderRadius: 3, background: th.line, margin: '5px auto 10px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: th.ink }}>{title}</span>
          <button onClick={close} style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700,
            color: th.ink3, cursor: 'pointer', fontFamily: 'inherit' }}>{cancelLabel}</button>
        </div>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  )
}

/* form input shared by the sheets. 16px minimum is deliberate: iOS Safari/PWA
   auto-zooms (and then pans, knocking content off-screen and making the scrim
   un-tappable) when a focused input is below 16px. Never drop below 16 here. */
export function Field({ value, onChange, placeholder, type, inputMode, style, big }) {
  const th = useTheme()
  return (
    <input
      value={value} onChange={onChange} placeholder={placeholder} type={type} inputMode={inputMode}
      style={{
        display: 'block', width: '100%', maxWidth: '100%', border: 'none', background: th.card2, borderRadius: 12,
        padding: '11px 13px', marginTop: 10, fontSize: big ? 26 : 16, fontWeight: big ? 800 : 400,
        color: th.ink, outline: 'none', fontFamily: 'inherit', ...style,
      }}
    />
  )
}

/* primary action button used across sheets */
export function SheetSave({ children, onClick, style }) {
  const th = useTheme()
  return (
    <button onClick={onClick} style={{ width: '100%', border: 'none', borderRadius: 14, padding: 13,
      background: th.accent, color: th.onAccent, fontSize: 14, fontWeight: 700, cursor: 'pointer',
      marginTop: 14, fontFamily: 'inherit', ...style }}>{children}</button>
  )
}
export function SheetDelete({ children = 'Delete', onClick }) {
  const th = useTheme()
  return (
    <button onClick={onClick} style={{ width: '100%', border: 'none', borderRadius: 12, padding: 9,
      background: 'none', color: th.loss, fontSize: 13, fontWeight: 700, cursor: 'pointer',
      marginTop: 6, fontFamily: 'inherit' }}>{children}</button>
  )
}

/* ---------- Full-screen detail push (bucket / asset / note) ---------- */
export function DetailShell({ onClose, right, children }) {
  const th = useTheme()
  return (
    <div className="k-detail" style={{ background: th.bg }}>
      {/* Flush at the top edge to match the list screens (.k-screen has 0 top padding). */}
      <div style={{ flex: 'none', padding: `0 ${GUTTER}px 12px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none',
          background: th.card2, borderRadius: 999, padding: '8px 15px 8px 11px', fontSize: 13, fontWeight: 700,
          color: th.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 16, lineHeight: 0 }}>‹</span> Back
        </button>
        {right || null}
      </div>
      <div className="kscroll" style={{ flex: 1, overflowY: 'auto', padding: `6px ${GUTTER}px calc(40px + env(safe-area-inset-bottom))` }}>{children}</div>
    </div>
  )
}

export function Empty({ children, style }) {
  const th = useTheme()
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: th.ink3, fontSize: 13, lineHeight: 1.6, ...style }}>
      {children}
    </div>
  )
}

/* ---------- Markdown (note bodies) ---------- */
export function mdBlocks(text) {
  const strip = (t) => (t || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
  const out = []
  for (const ln of (text || '').split('\n')) {
    if (ln.trim() === '') continue
    if (/^#{1,3}\s/.test(ln)) out.push({ t: 'h', text: strip(ln.replace(/^#{1,3}\s+/, '')) })
    else if (ln.startsWith('> ')) out.push({ t: 'q', text: strip(ln.slice(2)) })
    else if (ln.startsWith('- ')) out.push({ t: 'li', text: strip(ln.slice(2)) })
    else out.push({ t: 'p', text: strip(ln) })
  }
  return out
}
export function Markdown({ text }) {
  const th = useTheme()
  return (
    <div style={{ fontSize: 14, color: th.ink2 }}>
      {mdBlocks(text).map((b, i) => {
        if (b.t === 'h') return <div key={i} style={{ fontSize: 15, fontWeight: 800, color: th.ink, margin: '18px 0 8px' }}>{b.text}</div>
        if (b.t === 'q') return <p key={i} style={{ borderLeft: `3px solid ${th.accent}`, paddingLeft: 13, fontStyle: 'italic', color: th.ink2, margin: '14px 0', lineHeight: 1.6 }}>{b.text}</p>
        if (b.t === 'li') return <div key={i} style={{ display: 'flex', gap: 9, margin: '6px 0', lineHeight: 1.6 }}><span style={{ color: th.accent }}>•</span><span>{b.text}</span></div>
        return <p key={i} style={{ margin: '9px 0', lineHeight: 1.65 }}>{b.text}</p>
      })}
    </div>
  )
}

/* ---------- Inline icon set (1.6–1.9px line) ---------- */
const ico = (d, props = {}) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={d} /></svg>
)
export const Icons = {
  plus: <span style={{ fontSize: 16, lineHeight: 0 }}>+</span>,
  chevron: <span style={{ fontSize: 15, lineHeight: 0 }}>›</span>,
  arrow: <span style={{ fontSize: 15, lineHeight: 0 }}>→</span>,
  theme: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="9" cy="9" r="6" /><path d="M9 3a6 6 0 0 0 0 12z" fill="currentColor" stroke="none" />
    </svg>
  ),
  settings: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M3 5.5h6M13 5.5h2" /><circle cx="11" cy="5.5" r="2" /><path d="M3 12.5h2M9 12.5h6" /><circle cx="7" cy="12.5" r="2" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15 9 22 9.3 17 14 18 21 12 17.5 6 21 7 14 2 9.3 9 9" />
    </svg>
  ),
  lock: (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="4" y="9" width="12" height="8" rx="1.5" /><path d="M6.5 9V6.6a3.5 3.5 0 0 1 7 0V9" />
    </svg>
  ),
  ico,
}

/* ---------- Bottom tab bar glyphs (filled/stroked per design) ---------- */
export const TAB_GLYPH = {
  home: { d: 'M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1z', fill: 'none', stroke: 'currentColor' },
  spend: { d: 'M3 5h14M3 10h14M3 15h9', fill: 'none', stroke: 'currentColor' },
  buckets: { d: 'M4 5h12l-1.5 11h-9z M4 9h12', fill: 'none', stroke: 'currentColor' },
  assets: { d: 'M4 16V9M9 16V4M14 16v-5', fill: 'none', stroke: 'currentColor' },
  keela: { d: 'M6 4.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z M6 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M14 4.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z M14 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', fill: 'currentColor', stroke: 'none' },
}
export function TabGlyph({ name, color }) {
  const g = TAB_GLYPH[name] || TAB_GLYPH.home
  return (
    <svg width="21" height="21" viewBox="0 0 20 20" fill={g.fill === 'currentColor' ? color : 'none'}
      stroke={g.stroke === 'currentColor' ? color : 'none'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={g.d} />
    </svg>
  )
}

/* ---------- Floating quick-add (FAB) ---------- */
export function Fab({ onClick }) {
  const th = useTheme()
  return (
    <button className="k-fab-in" onClick={onClick} aria-label="Add transaction" style={{
      position: 'fixed', right: 'var(--k-pad)', zIndex: 76,
      // Ride 81px above the tab-bar's bottom edge (59px pill + 22px gap) so it tracks
      // the bar wherever the safe-inset puts it — must mirror TabBar's bottom in App.tsx.
      bottom: 'calc(81px + max(12px, calc(env(safe-area-inset-bottom) - 8px)))',
      width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: th.accent, border: 'none', color: th.onAccent, cursor: 'pointer',
      boxShadow: '0 8px 22px -6px rgba(196,98,58,.6)', WebkitAppearance: 'none',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  )
}
