/* Keela — Assets: portfolios → holdings → activity. Cost-basis only (SAR, no
   live prices / no P/L). A portfolio carries a savings-style goal; its holdings
   are cash or positions (units + avg cost), grown/shrunk by buy/sell/deposit/
   withdraw. "Warm" reskin: dark espresso hero, allocation bar + legend, rounded
   portfolio cards, SVG Sparkline balance card on the holding detail. */
import React from 'react'
import { useTheme, SWATCHES, tint } from '../lib/theme'
import {
  CountUp, Sparkline, StackedBar, Progress, Pill, Segmented, Empty, DetailShell,
  Sheet, Field, SheetSave, SheetDelete,
} from '../ui/primitives'
import { entryMeta } from '../lib/icons'
import { fmt, fmtDate, MONTH_ABBR } from '../lib/format'
import { pfProgress, pfMonthlyNeeded, holdingSeries } from './assets-extras'

const TODAY = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()
const fmtMonth = (d) => { const [y, m] = (d || '').split('-').map(Number); return m ? MONTH_ABBR[m - 1] + ' ' + y : '' }
const unitsStr = (u) => fmt(u, u % 1 ? 4 : 0)

/* subtitle for a holding (units · avg cost, or Cash) */
const holdSub = (h) => h.kind === 'cash'
  ? 'Cash'
  : (h.units != null ? `${unitsStr(h.units)} units · avg ${fmt(h.avgCost || 0)}` : (h.cat || 'Position'))

/* ---------- shared section divider header (mirrors Home.jsx) ---------- */
function SecHead({ th, label, sub, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: th.ink }}>{label}</span>
      {onAction
        ? <button onClick={onAction} style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: th.accent, cursor: 'pointer', fontFamily: 'inherit' }}>{action}</button>
        : sub ? <span style={{ fontSize: 12, color: th.ink2 }}>{sub}</span> : null}
    </div>
  )
}

/* ---------- allocation: stacked bar + legend over items {id,name,current,color} ---------- */
function Allocation({ th, items, total, label, sub }) {
  if (!items.length || total <= 0) return null
  const sorted = [...items].sort((a, b) => b.current - a.current)
  return (
    <div style={{ padding: '22px 0 2px', marginTop: 22, borderTop: `1px solid ${th.line}` }}>
      <SecHead th={th} label={label} sub={sub} />
      <StackedBar height={14} segs={sorted.map((a) => ({ w: (a.current / total) * 100, color: a.color }))} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flex: 'none' }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
            <span style={{ fontSize: 11, color: th.ink3, marginRight: 10 }}>{fmt((a.current / total) * 100, 1)}%</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: th.ink }}>{fmt(a.current)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- portfolio card (Assets tab list) ---------- */
function PortfolioCard({ th, p, onClick }) {
  const pct = pfProgress(p)
  const funded = p.target > 0 && p.value >= p.target
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', background: th.card, border: 'none',
      borderRadius: 22, padding: 18, cursor: 'pointer', boxShadow: th.shadow, fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: p.color, flex: 'none' }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
        <span style={{ fontSize: 11.5, color: th.ink3 }}>{p.count} holding{p.count === 1 ? '' : 's'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>{fmt(p.value)}</span>
        {p.target > 0 && <span style={{ fontSize: 12, color: th.ink3 }}>of {fmt(p.target)}</span>}
      </div>
      {p.target > 0 && (
        <>
          <div style={{ marginTop: 14 }}><Progress pct={pct} color={p.color} height={8} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 11.5, color: th.ink3 }}>
            <span>{pct}% to goal</span>
            <span>{funded ? 'Funded' : `${fmt(pfMonthlyNeeded(p))}/mo · ${fmtMonth(p.targetDate)}`}</span>
          </div>
        </>
      )}
    </button>
  )
}

export function Assets({ data, nav }) {
  const th = useTheme()
  const portfolios = data.portfolios || []
  const holdings = data.assets || []
  const total = holdings.reduce((s, h) => s + h.current, 0)
  // cost-basis only: nothing is "invested vs current" — invested == balance.
  const pfItems = portfolios.map((p) => ({ id: p.id, name: p.name, current: p.value, color: p.color }))

  const dim = 'rgba(243,238,227,.55)'

  return (
    <div className="k-screen">
      <div style={{ padding: '0 20px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>Assets</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: th.ink3, textAlign: 'right', lineHeight: 1.5 }}>
            {portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}<br />{holdings.length} holding{holdings.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* HERO — Portfolio · SAR */}
        <div style={{ background: th.darkcard, borderRadius: 28, padding: '24px 22px', color: th.onDark, boxShadow: th.shadow }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: dim }}>Portfolio · SAR</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
            <CountUp value={total} style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: th.onDark }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 12.5 }}>
            <span style={{ color: dim }}>{holdings.length} holding{holdings.length === 1 ? '' : 's'}</span>
            <span style={{ color: 'rgba(243,238,227,.3)' }}>·</span>
            <span style={{ color: dim }}>{portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'} · cost basis</span>
          </div>
        </div>

        {/* ALLOCATION */}
        <Allocation th={th} items={pfItems} total={total}
          label="Allocation" sub={`${portfolios.length} portfolio${portfolios.length === 1 ? '' : 's'}`} />

        {/* PORTFOLIOS */}
        <div style={{ padding: '22px 0 2px', marginTop: 22, borderTop: `1px solid ${th.line}` }}>
          <SecHead th={th} label="Portfolios" action="+ New" onAction={() => nav.addPortfolio()} />
          {portfolios.length
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {portfolios.map((p) => <PortfolioCard key={p.id} th={th} p={p} onClick={() => nav.openPortfolio(p.id)} />)}
              </div>
            : <Empty>No portfolios yet. Create one to start tracking what you hold.</Empty>}
        </div>
      </div>
    </div>
  )
}

/* ---------- holding row (inside a portfolio) ---------- */
function HoldingRow({ th, h, onOpen }) {
  return (
    <button onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
      border: 'none', background: 'none', padding: '14px 0', borderBottom: `1px solid ${th.line}`,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, background: h.color, flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: th.ink3 }}>{holdSub(h)}</span>
      </span>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: th.ink, flex: 'none' }}>{fmt(h.current)}</span>
    </button>
  )
}

/* ---------- Portfolio detail ---------- */
export function PortfolioDetail({ p, onClose, onEdit, onAddHolding, onOpenHolding, onEditHolding, onDeleteHolding }) {
  const th = useTheme()
  const pct = pfProgress(p)
  const funded = p.target > 0 && p.value >= p.target
  const remaining = Math.max(0, (p.target || 0) - p.value)
  const holdings = [...p.holdings].sort((a, b) => b.current - a.current)
  const allocItems = holdings.map((h) => ({ id: h.id, name: h.name, current: h.current, color: h.color }))

  const editBtn = !p.isDefault && (
    <button onClick={() => onEdit(p.id)} style={{ border: 'none', background: th.card2, borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 700, color: th.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
  )

  return (
    <DetailShell onClose={onClose} right={editBtn}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 13, height: 13, borderRadius: 4, background: p.color, flex: 'none' }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 800, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
        {p.isDefault && <Pill bg={th.card2} fg={th.ink2}>Unsorted</Pill>}
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>{fmt(p.value)}</div>

      {p.target > 0 ? (
        <>
          <div style={{ marginTop: 6, fontSize: 13, color: th.ink3 }}>of {fmt(p.target)} SAR · {pct}%</div>
          <div style={{ marginTop: 16 }}><Progress pct={pct} color={p.color} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 12, color: th.ink2 }}>
            <span>{remaining > 0 ? `${fmt(remaining)} to go` : 'Goal reached'}</span>
            <span>Target {fmtMonth(p.targetDate)}</span>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 6, fontSize: 13, color: th.ink3 }}>{p.count} holding{p.count === 1 ? '' : 's'}</div>
      )}

      {/* stats */}
      {p.target > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: th.card, borderRadius: 22, padding: 18, marginTop: 18, boxShadow: th.shadow }}>
          {[
            { l: 'Invested', v: fmt(p.value), c: th.ink },
            { l: 'Target', v: fmt(p.target), c: th.ink2 },
            { l: funded ? 'Status' : 'Contribute / mo', v: funded ? 'Funded' : fmt(pfMonthlyNeeded(p)), c: funded ? th.gain : th.accent },
            { l: 'Holdings', v: String(p.count), c: th.ink },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, color: th.ink3 }}>{s.l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.c, marginTop: 3 }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* note */}
      {p.note && (
        <div style={{ marginTop: 14, borderLeft: `3px solid ${th.line}`, paddingLeft: 13, fontSize: 13, lineHeight: 1.55, color: th.ink2 }}>{p.note}</div>
      )}

      {/* allocation */}
      <Allocation th={th} items={allocItems} total={p.value}
        label="Allocation" sub={`${p.count} holding${p.count === 1 ? '' : 's'}`} />

      {/* holdings */}
      <div style={{ padding: '22px 0 2px', marginTop: 22, borderTop: `1px solid ${th.line}` }}>
        <SecHead th={th} label="Holdings" action="+ Add" onAction={onAddHolding} />
        {holdings.length
          ? holdings.map((h) => <HoldingRow key={h.id} th={th} h={h} onOpen={() => onOpenHolding(h.id)} />)
          : <Empty>No holdings yet. Add cash or a position to this portfolio.</Empty>}
      </div>
    </DetailShell>
  )
}

/* ---------- Holding detail ---------- */
function ActivityList({ th, entries }) {
  return (
    <div style={{ padding: '22px 0 2px', marginTop: 22, borderTop: `1px solid ${th.line}` }}>
      <SecHead th={th} label="Activity" sub={String(entries.length)} />
      {entries.length ? entries.map((e, i) => {
        const m = entryMeta(e.type, th)
        const sub = (e.units != null && e.price != null)
          ? `${unitsStr(e.units)} @ ${fmt(e.price)}${e.note ? ' · ' + e.note : ''}`
          : (e.note ? `${fmtDate(e.date)} · ${e.note}` : fmtDate(e.date))
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: `1px solid ${th.line}` }}>
            <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 11, background: tint(m.color, 13), color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 18, height: 18, display: 'flex' }}>{m.icon}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: th.ink }}>{m.label}<span style={{ fontSize: 11, fontWeight: 400, color: th.ink3, marginLeft: 8 }}>{fmtDate(e.date)}</span></span>
              <span style={{ display: 'block', fontSize: 11.5, color: th.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: m.sign === '−' ? th.loss : m.sign === '+' ? th.gain : th.ink, flex: 'none' }}>{m.sign}{fmt(e.amount)}</span>
          </div>
        )
      }) : <Empty>No activity yet.</Empty>}
    </div>
  )
}

export function HoldingDetail({ h, portfolio, onClose, onEdit, onAct }) {
  const th = useTheme()
  const isCash = h.kind === 'cash'
  const weight = portfolio.value > 0 ? (h.current / portfolio.value * 100) : 0
  const hasBalance = h.current > 0
  const series = holdingSeries(h)
  const entries = [...h.entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const editBtn = (
    <button onClick={onEdit} style={{ border: 'none', background: th.card2, borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 700, color: th.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
  )

  return (
    <DetailShell onClose={onClose} right={editBtn}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 13, height: 13, borderRadius: 4, background: h.color, flex: 'none' }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 800, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
        <Pill bg={th.card2} fg={th.ink2}>{isCash ? 'Cash' : (h.cat || 'Position')}</Pill>
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>{fmt(h.current)}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: th.ink3 }}>
        {isCash ? 'cash balance' : (h.units != null ? `${unitsStr(h.units)} units · avg ${fmt(h.avgCost || 0)}` : 'cost basis')}
      </div>

      {/* balance sparkline card */}
      {series.length > 1 && (
        <div style={{ background: th.card, borderRadius: 22, padding: 18, marginTop: 18, boxShadow: th.shadow }}>
          <Sparkline values={series} w={320} h={60} height={60} color={h.color} fillOpacity={0.12} strokeWidth={2} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: th.ink3 }}>
            <span>{fmt(series[0])}</span>
            <span>balance history</span>
            <span>{fmt(series[series.length - 1])}</span>
          </div>
        </div>
      )}

      {/* 2-col stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: th.card, borderRadius: 22, padding: 18, marginTop: 14, boxShadow: th.shadow }}>
        {[
          { l: 'Invested', v: fmt(h.costBasis), c: th.ink },
          { l: 'Current', v: fmt(h.current), c: th.ink },
          { l: isCash ? 'Type' : 'Units', v: isCash ? 'Cash' : (h.units != null ? unitsStr(h.units) : '—'), c: th.ink },
          { l: isCash ? 'Weight' : 'Avg cost', v: isCash ? `${weight.toFixed(0)}%` : (h.avgCost ? fmt(h.avgCost) : '—'), c: th.ink2 },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: th.ink3 }}>{s.l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.c, marginTop: 3 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* action buttons: Edit + buy/sell or deposit/withdraw */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => onAct(isCash ? 'deposit' : 'buy')} style={{
          flex: 1, border: 'none', borderRadius: 14, padding: 13, background: th.accent, color: th.onAccent,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ {isCash ? 'DEPOSIT' : 'BUY'}</button>
        <button onClick={() => hasBalance && onAct(isCash ? 'withdraw' : 'sell')} style={{
          flex: 1, border: `1px solid ${th.line}`, borderRadius: 14, padding: 13, background: th.card, color: th.ink2,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          opacity: hasBalance ? 1 : 0.4, pointerEvents: hasBalance ? 'auto' : 'none',
        }}>− {isCash ? 'WITHDRAW' : 'SELL'}</button>
      </div>

      <ActivityList th={th} entries={entries} />
    </DetailShell>
  )
}

/* ---------- Sheets ---------- */
function ColourSwatches({ th, value, onChange, palette = SWATCHES }) {
  const colors = value && !palette.includes(value) ? [value, ...palette] : palette
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3, margin: '16px 2px 8px' }}>Colour</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        {colors.map((c) => (
          <button key={c} type="button" aria-label="colour" onClick={() => onChange(c)} style={{
            width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
            border: value === c ? `2.5px solid ${th.ink}` : `2.5px solid transparent`,
            boxShadow: value === c ? `0 0 0 2px ${th.card}` : 'none',
          }} />
        ))}
      </div>
    </>
  )
}

const lbl = (th) => ({ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: th.ink3, margin: '16px 2px 8px' })

export function PortfolioSheet({ portfolio, onClose, onSave, onDelete }) {
  const th = useTheme()
  const editing = !!portfolio
  const [name, setName] = React.useState(portfolio?.name || '')
  const [target, setTarget] = React.useState(portfolio ? String(portfolio.target || '') : '')
  const [tdate, setTdate] = React.useState(portfolio?.targetDate || '')
  const [color, setColor] = React.useState(portfolio?.color || SWATCHES[0])
  const [note, setNote] = React.useState(portfolio?.note || '')
  const valid = name.trim()

  return (
    <Sheet title={editing ? 'Edit · ' + portfolio.name : 'New portfolio'} onClose={onClose}>
      {(close) => (
        <>
          <div style={lbl(th)}>Name</div>
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Long-term" style={{ marginTop: 0 }} />

          <ColourSwatches th={th} value={color} onChange={setColor} />

          <div style={lbl(th)}>Goal · SAR · optional</div>
          <Field value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" style={{ marginTop: 0 }} />

          <div style={lbl(th)}>Target month · optional</div>
          <Field value={tdate} onChange={(e) => setTdate(e.target.value)} type="month" style={{ marginTop: 0 }} />

          <div style={lbl(th)}>Note · optional</div>
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this portfolio for?" style={{ marginTop: 0 }} />

          <SheetSave onClick={() => {
            if (!valid) return
            onSave(portfolio?.id, { name: name.trim(), target: parseInt(target, 10) || 0, targetDate: tdate || '', color, note: note.trim() })
            close()
          }} style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>
            {editing ? 'Save changes' : 'Create portfolio'}
          </SheetSave>
          {editing && <SheetDelete onClick={() => { onDelete(portfolio.id); close() }}>Delete portfolio</SheetDelete>}
        </>
      )}
    </Sheet>
  )
}

export function HoldingSheet({ holding, portfolioId, portfolios, onClose, onSave, onDelete }) {
  const th = useTheme()
  const editing = !!holding
  const realPfs = (portfolios || []).filter((p) => !p.isDefault)
  const [pid, setPid] = React.useState(holding?.portfolioId || portfolioId || (realPfs[0]?.id ?? ''))
  const [name, setName] = React.useState(holding?.name || '')
  const [kind, setKind] = React.useState(holding?.kind || 'position')
  const [category, setCategory] = React.useState(holding?.cat || '')
  const [color, setColor] = React.useState(holding?.color || SWATCHES[0])
  const [note, setNote] = React.useState(holding?.note || '')
  // opening (add only)
  const [units, setUnits] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [cash, setCash] = React.useState('')

  const openAmt = kind === 'position' ? (parseFloat(units) || 0) * (parseFloat(price) || 0) : (parseFloat(cash) || 0)
  const valid = name.trim() && (editing || pid)

  return (
    <Sheet title={editing ? 'Edit · ' + holding.name : 'New holding'} onClose={onClose}>
      {(close) => (
        <>
          <div style={lbl(th)}>Name</div>
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'cash' ? 'e.g. Cash Reserve' : 'e.g. US Stocks (VOO)'} style={{ marginTop: 0 }} />

          <div style={lbl(th)}>Type</div>
          <Segmented options={[{ value: 'position', label: 'Position' }, { value: 'cash', label: 'Cash' }]} value={kind} onChange={setKind} />

          {realPfs.length > 0 && (
            <>
              <div style={lbl(th)}>Portfolio</div>
              <select value={pid} onChange={(e) => setPid(e.target.value)} style={{
                display: 'block', width: '100%', maxWidth: '100%', border: 'none', background: th.card2, borderRadius: 12,
                padding: '11px 13px', fontSize: 16, color: th.ink, outline: 'none', fontFamily: 'inherit',
              }}>
                {realPfs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )}

          {kind === 'position' && (
            <>
              <div style={lbl(th)}>Category · optional</div>
              <Field value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Stocks, crypto, gold…" style={{ marginTop: 0 }} />
            </>
          )}

          <ColourSwatches th={th} value={color} onChange={setColor} />

          {!editing && kind === 'position' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={lbl(th)}>Units</div>
                <Field value={units} onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ marginTop: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={lbl(th)}>Buy price · SAR</div>
                <Field value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ marginTop: 0 }} />
              </div>
            </div>
          )}
          {!editing && kind === 'cash' && (
            <>
              <div style={lbl(th)}>Opening balance · SAR</div>
              <Field value={cash} onChange={(e) => setCash(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ marginTop: 0 }} />
            </>
          )}
          {!editing && openAmt > 0 && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: th.ink2 }}>
              Opens at <b style={{ color: th.accent }}>{fmt(openAmt)}</b> SAR cost basis{kind === 'position' && parseFloat(units) > 0 ? ` · avg ${fmt(openAmt / parseFloat(units))}` : ''}
            </div>
          )}

          <div style={lbl(th)}>Note · optional</div>
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" style={{ marginTop: 0 }} />

          <SheetSave onClick={() => {
            if (!valid) return
            onSave(holding?.id, {
              portfolioId: editing ? holding.portfolioId : (pid || null),
              name: name.trim(), kind, category: category.trim() || (kind === 'cash' ? 'Cash' : 'Investment'),
              color, note: note.trim(),
              opening: editing ? null : { units: parseFloat(units) || 0, price: parseFloat(price) || 0, amount: Math.round(openAmt * 100) / 100 },
            })
            close()
          }} style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>
            {editing ? 'Save changes' : 'Add holding'}
          </SheetSave>
          {editing && <SheetDelete onClick={() => { onDelete(holding.id); close() }}>Delete holding</SheetDelete>}
        </>
      )}
    </Sheet>
  )
}

export function ActivitySheet({ holding, mode, onClose, onSave }) {
  const th = useTheme()
  const isUnit = mode === 'buy' || mode === 'sell'
  const [units, setUnits] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')

  const titles = { buy: 'Buy', sell: 'Sell', deposit: 'Deposit to', withdraw: 'Withdraw from' }
  const cta = { buy: 'Log buy', sell: 'Log sell', deposit: 'Deposit', withdraw: 'Withdraw' }
  const u = parseFloat(units) || 0
  const pr = parseFloat(price) || 0
  const computed = isUnit ? u * pr : (parseFloat(amount) || 0)
  const overSell = mode === 'sell' && holding.units != null && u > holding.units
  const valid = isUnit ? (u > 0 && pr > 0 && !overSell) : (parseFloat(amount) > 0)

  return (
    <Sheet title={titles[mode] + ' · ' + holding.name} onClose={onClose}>
      {(close) => (
        <>
          {isUnit ? (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={lbl(th)}>Units</div>
                  <Field value={units} onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ marginTop: 0 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={lbl(th)}>{mode === 'buy' ? 'Buy' : 'Sell'} price · SAR</div>
                  <Field value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ marginTop: 0 }} />
                </div>
              </div>
              {mode === 'sell' && holding.units != null && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: overSell ? th.loss : th.ink3 }}>
                  You hold {unitsStr(holding.units)} units{overSell ? ' — can’t sell more than that' : ''}
                </div>
              )}
              {computed > 0 && (
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: th.ink2 }}>
                  {mode === 'buy' ? 'Cost' : 'Proceeds'} <b style={{ color: th.accent }}>{fmt(computed)}</b> SAR
                </div>
              )}
            </>
          ) : (
            <>
              <div style={lbl(th)}>Amount · SAR</div>
              <Field value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" big style={{ marginTop: 0 }} />
            </>
          )}

          <div style={lbl(th)}>Note · optional</div>
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" style={{ marginTop: 0 }} />

          <SheetSave onClick={() => {
            if (!valid) return
            const entry = isUnit
              ? { type: mode, units: u, price: pr, amount: Math.round(computed * 100) / 100, date: TODAY, note: note.trim() }
              : { type: mode, amount: Math.round(parseFloat(amount) * 100) / 100, date: TODAY, note: note.trim() }
            onSave(holding.id, entry)
            close()
          }} style={{
            marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none',
            background: (mode === 'sell' || mode === 'withdraw') ? th.ink : th.accent,
          }}>{cta[mode]}</SheetSave>
        </>
      )}
    </Sheet>
  )
}
