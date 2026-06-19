/* Keela — Assets: portfolios → holdings → activity. Cost-basis only (SAR, no
   live prices / no P/L). A portfolio carries a savings-style goal; its holdings
   are cash or positions (units + avg cost), grown/shrunk by buy/sell/deposit/withdraw. */
import React from 'react'
import { Tag, Badge, CountUp, Progress, Empty, Segmented, Sheet, SwipeRow, Icons } from '../ui/primitives'
import { getEntry } from '../lib/icons'
import { TrendChart } from '../ui/echart'
import { fmt, fmtDate, MONTH_ABBR } from '../lib/format'
import { pfProgress, pfMonthlyNeeded, HoldingChart } from './assets-extras'

const TODAY = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()
const fmtMonth = (d) => { const [y, m] = (d || '').split('-').map(Number); return m ? MONTH_ABBR[m - 1] + ' ' + y : '' }

const ASSET_COLORS = [
  'var(--qahwa-brewed)', 'var(--qahwa-latte)', 'var(--qahwa-espresso)', 'var(--qahwa-accent)',
  '#DDA12B', '#C0453C', '#C75D88', '#6C5AA6', '#3C6CA6', '#2E8B8B', '#4E8C50', 'var(--qahwa-flat)',
]

// activity row styling — buy/sell move a position, deposit/withdraw move cash
const ACT = {
  buy: { label: 'Buy', sign: '+', cls: '', icon: getEntry('update') },
  sell: { label: 'Sell', sign: '−', cls: 'k-loss', icon: getEntry('withdrawal') },
  deposit: { label: 'Deposit', sign: '+', cls: 'k-gain', icon: getEntry('deposit') },
  withdraw: { label: 'Withdraw', sign: '−', cls: 'k-loss', icon: getEntry('withdrawal') },
}

/* ---------- holding row (inside a portfolio) ---------- */
function HoldingRow({ h, onOpen, onEdit, onDelete }) {
  const sub = h.kind === 'cash'
    ? 'Cash'
    : (h.units != null ? `${fmt(h.units, h.units % 1 ? 4 : 0)} units · avg ${fmt(h.avgCost || 0)}` : h.cat)
  return (
    <SwipeRow actions={[
      { label: 'Edit', icon: Icons.edit, onClick: onEdit },
      { label: 'Delete', kind: 'del', icon: Icons.trash, onClick: onDelete },
    ]}>
      <button className="k-row btn" onClick={onOpen}>
        <span className="k-swatch" style={{ width: 12, height: 12, background: h.color }} />
        <div className="k-row-main">
          <span className="k-row-name">{h.name}</span>
          <span className="k-row-sub k-hold-units">{sub}</span>
        </div>
        <div className="k-row-r"><span className="k-row-amt">{fmt(h.current)}</span></div>
      </button>
    </SwipeRow>
  )
}

/* ---------- portfolio card (list on the Assets tab) ---------- */
function PortfolioCard({ p, onClick }) {
  const pct = pfProgress(p)
  const funded = p.target > 0 && p.value >= p.target
  return (
    <button className="k-pfcard" onClick={onClick}>
      <div className="k-pfcard-top">
        <span className="k-swatch" style={{ width: 11, height: 11, background: p.color }} />
        <span className="k-pfcard-name">{p.name}</span>
        <span className="k-pfcard-count">{p.count} holding{p.count === 1 ? '' : 's'}</span>
      </div>
      <div>
        <span className="k-pfcard-val">{fmt(p.value)}</span>
        {p.target > 0 && <span className="k-pfcard-sub">of {fmt(p.target)}</span>}
      </div>
      {p.target > 0 && (
        <>
          <Progress pct={pct} color={p.color} />
          <div className="k-pfcard-meta">
            <span className="k-label dim">{pct}% to goal</span>
            <span className="k-label dim">{funded ? 'Funded' : fmt(pfMonthlyNeeded(p)) + '/mo · ' + fmtMonth(p.targetDate)}</span>
          </div>
        </>
      )}
    </button>
  )
}

/* ---------- shared: allocation bar + legend over a set of items {name,current,color} ---------- */
function Allocation({ items, total, label, sub }) {
  if (!items.length || total <= 0) return null
  const sorted = [...items].sort((a, b) => b.current - a.current)
  return (
    <div className="k-sec">
      <div className="k-sec-head"><span className="k-label">{label}</span><span className="k-micro">{sub}</span></div>
      <div className="k-alloc">
        {sorted.map((a) => (
          <div key={a.id} className="k-alloc-seg" title={a.name} style={{ width: (a.current / total * 100) + '%', background: a.color }} />
        ))}
      </div>
      <div className="k-legend">
        {sorted.map((a) => (
          <div className="k-legend-row" key={a.id}>
            <span className="k-swatch" style={{ background: a.color }} />
            <span style={{ flex: 1, font: '500 12px/1.2 var(--qahwa-font-ui)' }}>{a.name}</span>
            <span className="k-num" style={{ fontSize: 11, color: 'var(--qahwa-fg-3)', marginRight: 12 }}>{(a.current / total * 100).toFixed(1)}%</span>
            <span className="k-num" style={{ fontSize: 12, fontWeight: 500, minWidth: 56, textAlign: 'right' }}>{fmt(a.current)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Assets({ data, nav }) {
  const portfolios = data.portfolios || []
  const holdings = data.assets || []
  const total = holdings.reduce((s, h) => s + h.current, 0)
  // net-worth trend (assets + savings) from monthly snapshots
  const nwSeries = (data.snapshots || []).map((s) => s.netWorth)
  const nwUp = nwSeries.length > 1 && nwSeries[nwSeries.length - 1] >= nwSeries[0]
  // allocation across portfolios (each portfolio is one segment)
  const pfItems = portfolios.map((p) => ({ id: p.id, name: p.name, current: p.value, color: p.color }))

  return (
    <div className="k-screen">
      <div className="k-phead">
        <div><div className="k-htitle">Portfolios</div></div>
        <div className="k-asof">{portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}<br />{holdings.length} holdings</div>
      </div>

      <div className="k-hero" style={{ paddingTop: 8 }}>
        <span className="k-label" style={{ display: 'block', marginBottom: 10 }}>Invested &middot; SAR</span>
        <div className="k-hero-num" style={{ fontSize: 44 }}><CountUp value={total} /></div>
        <div className="k-hero-delta">
          <span className="k-num k-flat">{holdings.length} holding{holdings.length === 1 ? '' : 's'} across {portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {nwSeries.length > 1 && (
        <div className="k-sec">
          <div className="k-sec-head"><span className="k-label">Net worth &middot; trend</span><span className="k-micro">{nwSeries.length} mo &middot; incl. savings</span></div>
          <TrendChart values={nwSeries} height={56} tone={nwUp ? 'gain' : 'loss'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span className="k-micro k-num">{fmt(nwSeries[0])}</span>
            <span className="k-micro">last {nwSeries.length} months</span>
            <span className="k-micro k-num">{fmt(nwSeries[nwSeries.length - 1])}</span>
          </div>
        </div>
      )}

      <Allocation items={pfItems} total={total} label="Allocation" sub={`${portfolios.length} portfolio${portfolios.length === 1 ? '' : 's'}`} />

      <div className="k-sec div" style={{ paddingBottom: 0 }}>
        <div className="k-sec-head" style={{ marginBottom: 0 }}>
          <span className="k-label">Portfolios</span>
          <button className="k-back" style={{ padding: 0 }} onClick={() => nav.addPortfolio()}>+ New</button>
        </div>
      </div>
      <div className="k-sec" style={{ marginTop: 0 }}>
        {portfolios.length
          ? <div className="k-pflist">{portfolios.map((p) => <PortfolioCard key={p.id} p={p} onClick={() => nav.openPortfolio(p.id)} />)}</div>
          : <Empty>No portfolios yet. Create one to start tracking what you hold.</Empty>}
      </div>
    </div>
  )
}

/* ---------- Portfolio detail ---------- */
export function PortfolioDetail({ p, onClose, onEdit, onAddHolding, onOpenHolding, onEditHolding, onDeleteHolding }) {
  const pct = pfProgress(p)
  const funded = p.target > 0 && p.value >= p.target
  const remaining = Math.max(0, (p.target || 0) - p.value)
  const holdings = [...p.holdings].sort((a, b) => b.current - a.current)

  return (
    <div className="k-detail">
      <div className="k-detail-bar">
        <button className="k-back" onClick={onClose}>&lsaquo; Portfolios</button>
        {!p.isDefault && <button className="k-back" style={{ marginLeft: 'auto' }} onClick={() => onEdit(p.id)}>Edit</button>}
      </div>
      <div className="k-scroll">
        <div className="k-screen">
          <div className="k-hero" style={{ paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="k-swatch" style={{ width: 12, height: 12, background: p.color }} />
              <span style={{ font: '600 18px/1.1 var(--qahwa-font-ui)', flex: 1 }}>{p.name}</span>
              {p.isDefault && <Tag kind="mute">Unsorted</Tag>}
            </div>
            <div className="k-hero-num" style={{ fontSize: 38 }}>{fmt(p.value)}</div>
            {p.target > 0 ? (
              <>
                <div className="k-hero-delta"><span className="k-num" style={{ color: 'var(--qahwa-fg-3)' }}>of {fmt(p.target)} SAR &middot; {pct}%</span></div>
                <div style={{ marginTop: 16 }}><Progress pct={pct} color={p.color} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span className="k-label dim">{remaining > 0 ? fmt(remaining) + ' to go' : 'Goal reached'}</span>
                  <span className="k-label dim">Target {fmtMonth(p.targetDate)}</span>
                </div>
              </>
            ) : (
              <div className="k-hero-delta"><span className="k-num k-flat">{p.count} holding{p.count === 1 ? '' : 's'}</span></div>
            )}
          </div>

          {p.target > 0 && (
            <div className="k-sec" style={{ marginTop: 20 }}>
              <div className="k-stats">
                <div className="k-stat"><span className="k-label dim">Invested</span><span className="k-stat-val">{fmt(p.value)}</span></div>
                <div className="k-stat"><span className="k-label dim">Target</span><span className="k-stat-val" style={{ color: 'var(--qahwa-fg-2)' }}>{fmt(p.target)}</span></div>
                <div className="k-stat"><span className="k-label dim">{funded ? 'Status' : 'Contribute / mo'}</span><span className="k-stat-val k-em">{funded ? 'Funded' : fmt(pfMonthlyNeeded(p))}</span></div>
                <div className="k-stat"><span className="k-label dim">Holdings</span><span className="k-stat-val">{p.count}</span></div>
              </div>
            </div>
          )}

          {p.note && (
            <div className="k-sec"><div className="k-knote" style={{ borderLeftColor: 'var(--qahwa-border)' }}>
              <div className="k-knote-body" style={{ fontSize: 13 }}>{p.note}</div>
            </div></div>
          )}

          <Allocation items={holdings} total={p.value} label="Allocation" sub={`${p.count} holding${p.count === 1 ? '' : 's'}`} />

          <div className="k-sec div" style={{ paddingBottom: 0 }}>
            <div className="k-sec-head" style={{ marginBottom: 0 }}>
              <span className="k-label">Holdings</span>
              <button className="k-back" style={{ padding: 0 }} onClick={onAddHolding}>+ Add</button>
            </div>
          </div>
          <div className="k-sec" style={{ marginTop: 0 }}>
            {holdings.length
              ? holdings.map((h) => (
                <HoldingRow key={h.id} h={h}
                  onOpen={() => onOpenHolding(h.id)}
                  onEdit={() => onEditHolding(h)}
                  onDelete={() => onDeleteHolding(h.id)} />
              ))
              : <Empty>No holdings yet. Add cash or a position to this portfolio.</Empty>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Holding detail ---------- */
function ActivityLog({ entries }) {
  return (
    <div className="k-sec">
      <div className="k-sec-head"><span className="k-label">Activity</span><span className="k-micro">{entries.length}</span></div>
      {entries.length ? entries.map((e, i) => {
        const m = ACT[e.type] || { label: e.type, sign: '', cls: '', icon: getEntry('update') }
        const sub = (e.units != null && e.price != null)
          ? `${fmt(e.units, e.units % 1 ? 4 : 0)} @ ${fmt(e.price)}${e.note ? ' · ' + e.note : ''}`
          : (e.note || fmtDate(e.date))
        return (
          <div className="k-row" key={i}>
            <Badge icon={m.icon.icon} color={m.icon.color} />
            <div className="k-row-main">
              <span className="k-row-name">{m.label}<span className="k-micro" style={{ marginLeft: 8 }}>{fmtDate(e.date)}</span></span>
              <span className="k-row-sub">{sub}</span>
            </div>
            <div className="k-row-r"><span className={'k-row-amt ' + m.cls}>{m.sign}{fmt(e.amount)}</span></div>
          </div>
        )
      }) : <Empty>No activity yet.</Empty>}
    </div>
  )
}

export function HoldingDetail({ h, portfolio, onClose, onEdit, onAct }) {
  const isCash = h.kind === 'cash'
  const weight = portfolio.value > 0 ? (h.current / portfolio.value * 100) : 0
  const hasBalance = h.current > 0
  return (
    <div className="k-detail">
      <div className="k-detail-bar">
        <button className="k-back" onClick={onClose}>&lsaquo; {portfolio.name}</button>
        <button className="k-back" style={{ marginLeft: 'auto' }} onClick={onEdit}>Edit</button>
      </div>
      <div className="k-scroll">
        <div className="k-screen">
          <div className="k-hero" style={{ paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="k-swatch" style={{ width: 12, height: 12, background: h.color }} />
              <span style={{ font: '600 16px/1.15 var(--qahwa-font-ui)', flex: 1 }}>{h.name}</span>
              <Tag kind="mute">{isCash ? 'Cash' : h.cat}</Tag>
            </div>
            <div className="k-hero-num" style={{ fontSize: 40 }}>{fmt(h.current)}</div>
            <div className="k-hero-delta">
              {isCash
                ? <span className="k-num k-flat">cash balance</span>
                : <span className="k-num k-flat">{h.units != null ? `${fmt(h.units, h.units % 1 ? 4 : 0)} units · avg ${fmt(h.avgCost || 0)}` : 'cost basis'}</span>}
            </div>
          </div>

          <div className="k-sec" style={{ marginTop: 18 }}>
            <div className="k-stats">
              <div className="k-stat"><span className="k-label dim">Invested</span><span className="k-stat-val">{fmt(h.costBasis)}</span></div>
              <div className="k-stat"><span className="k-label dim">{isCash ? 'Type' : 'Units'}</span><span className="k-stat-val">{isCash ? 'Cash' : (h.units != null ? fmt(h.units, h.units % 1 ? 4 : 0) : '—')}</span></div>
              <div className="k-stat"><span className="k-label dim">Avg cost</span><span className="k-stat-val">{!isCash && h.avgCost ? fmt(h.avgCost) : '—'}</span></div>
              <div className="k-stat"><span className="k-label dim">Weight</span><span className="k-stat-val">{weight.toFixed(0)}%</span></div>
            </div>
          </div>

          <div className="k-sec"><div style={{ display: 'flex', gap: 10 }}>
            <button className="k-btn accent" style={{ flex: 1 }} onClick={() => onAct(isCash ? 'deposit' : 'buy')}>+ {isCash ? 'DEPOSIT' : 'BUY'}</button>
            <button className="k-btn" style={{ flex: 1, opacity: hasBalance ? 1 : 0.4, pointerEvents: hasBalance ? 'auto' : 'none' }}
              onClick={() => onAct(isCash ? 'withdraw' : 'sell')}>&minus; {isCash ? 'WITHDRAW' : 'SELL'}</button>
          </div></div>

          {h.entries.length > 1 && (
            <div className="k-sec" style={{ marginTop: 24 }}>
              <div className="k-sec-head"><span className="k-label">Cost basis over time</span><span className="k-micro">{h.entries.length} entries</span></div>
              <HoldingChart h={h} />
            </div>
          )}

          <ActivityLog entries={h.entries} />
        </div>
      </div>
    </div>
  )
}

/* ---------- Sheets ---------- */
function ColourRow({ value, onChange, palette }) {
  const colors = value && !palette.includes(value) ? [value, ...palette] : palette
  return (
    <div className="k-field">
      <span className="k-label dim">Colour</span>
      <div className="k-swatchrow">
        {colors.map((c) => (
          <button key={c} type="button" aria-label="colour"
            className={'k-swatchbtn' + (value === c ? ' on' : '')}
            style={{ background: c }} onClick={() => onChange(c)} />
        ))}
      </div>
    </div>
  )
}

export function PortfolioSheet({ portfolio, onClose, onSave, onDelete }) {
  const editing = !!portfolio
  const [name, setName] = React.useState(portfolio?.name || '')
  const [target, setTarget] = React.useState(portfolio ? String(portfolio.target || '') : '')
  const [tdate, setTdate] = React.useState(portfolio?.targetDate || '')
  const [color, setColor] = React.useState(portfolio?.color || ASSET_COLORS[0])
  const [note, setNote] = React.useState(portfolio?.note || '')
  const valid = name.trim()
  return (
    <Sheet title={editing ? 'Edit · ' + portfolio.name : 'New portfolio'} onClose={onClose}>
      {(close) => (
        <>
          <div className="k-field" style={{ marginTop: 14 }}>
            <span className="k-label dim">Name</span>
            <input className="k-input" placeholder="e.g. Long-term" value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
          </div>
          <ColourRow value={color} onChange={setColor} palette={ASSET_COLORS} />
          <div className="k-field">
            <span className="k-label dim">Goal &middot; SAR &middot; optional</span>
            <input className="k-input k-num" inputMode="numeric" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="k-field">
            <span className="k-label dim">Target month &middot; optional</span>
            <input className="k-input k-num" type="month" value={tdate} onChange={(e) => setTdate(e.target.value)} />
          </div>
          <div className="k-field">
            <span className="k-label dim">Note &middot; optional</span>
            <textarea className="k-input" rows={2} placeholder="What's this portfolio for?" value={note}
              style={{ resize: 'none', lineHeight: 1.4 }} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => { if (valid) { onSave(portfolio?.id, { name: name.trim(), target: parseInt(target, 10) || 0, targetDate: tdate || '', color, note: note.trim() }); close() } }}>
            {editing ? 'SAVE CHANGES' : 'CREATE PORTFOLIO'}
          </button>
          {editing && (
            <button className="k-btn ghost full" style={{ marginTop: 10, color: 'var(--qahwa-loss)', borderColor: 'var(--qahwa-loss)' }}
              onClick={() => { onDelete(portfolio.id); close() }}>
              DELETE PORTFOLIO
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}

export function HoldingSheet({ holding, portfolioId, portfolios, onClose, onSave, onDelete }) {
  const editing = !!holding
  const realPfs = (portfolios || []).filter((p) => !p.isDefault)
  const [pid, setPid] = React.useState(holding?.portfolioId || portfolioId || (realPfs[0]?.id ?? ''))
  const [name, setName] = React.useState(holding?.name || '')
  const [kind, setKind] = React.useState(holding?.kind || 'position')
  const [category, setCategory] = React.useState(holding?.cat || '')
  const [color, setColor] = React.useState(holding?.color || ASSET_COLORS[0])
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
          <div className="k-field" style={{ marginTop: 14 }}>
            <span className="k-label dim">Name</span>
            <input className="k-input" placeholder={kind === 'cash' ? 'e.g. Cash Reserve' : 'e.g. US Stocks (VOO)'} value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
          </div>
          <div className="k-field">
            <span className="k-label dim">Type</span>
            <Segmented items={[{ v: 'position', label: 'Position' }, { v: 'cash', label: 'Cash' }]} value={kind} onChange={setKind} />
          </div>
          {realPfs.length > 0 && (
            <div className="k-field">
              <span className="k-label dim">Portfolio</span>
              <select className="k-input" value={pid} onChange={(e) => setPid(e.target.value)}>
                {realPfs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {kind === 'position' && (
            <div className="k-field">
              <span className="k-label dim">Category &middot; optional</span>
              <input className="k-input" placeholder="Stocks, crypto, gold…" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          )}
          <ColourRow value={color} onChange={setColor} palette={ASSET_COLORS} />

          {!editing && kind === 'position' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="k-field" style={{ flex: 1 }}>
                <span className="k-label dim">Units</span>
                <input className="k-input k-num" inputMode="decimal" placeholder="0" value={units} onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
              <div className="k-field" style={{ flex: 1 }}>
                <span className="k-label dim">Buy price &middot; SAR</span>
                <input className="k-input k-num" inputMode="decimal" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
            </div>
          )}
          {!editing && kind === 'cash' && (
            <div className="k-field">
              <span className="k-label dim">Opening balance &middot; SAR</span>
              <input className="k-input k-num" inputMode="decimal" placeholder="0" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^0-9.]/g, ''))} />
            </div>
          )}
          {!editing && openAmt > 0 && (
            <div className="k-micro" style={{ marginTop: 10, textAlign: 'center' }}>
              Opens at <span className="k-num k-em" style={{ fontWeight: 600 }}>{fmt(openAmt)}</span> SAR cost basis{kind === 'position' && parseFloat(units) > 0 ? ` · avg ${fmt(openAmt / parseFloat(units))}` : ''}
            </div>
          )}

          <div className="k-field">
            <span className="k-label dim">Note &middot; optional</span>
            <input className="k-input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <button className="k-btn accent full" style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => {
              if (!valid) return
              onSave(holding?.id, {
                portfolioId: editing ? holding.portfolioId : (pid || null),
                name: name.trim(), kind, category: category.trim() || (kind === 'cash' ? 'Cash' : 'Investment'),
                color, note: note.trim(),
                opening: editing ? null : { units: parseFloat(units) || 0, price: parseFloat(price) || 0, amount: Math.round(openAmt * 100) / 100 },
              })
              close()
            }}>
            {editing ? 'SAVE CHANGES' : 'ADD HOLDING'}
          </button>
          {editing && (
            <button className="k-btn ghost full" style={{ marginTop: 10, color: 'var(--qahwa-loss)', borderColor: 'var(--qahwa-loss)' }}
              onClick={() => { onDelete(holding.id); close() }}>
              DELETE HOLDING
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}

export function ActivitySheet({ holding, mode, onClose, onSave }) {
  const isUnit = mode === 'buy' || mode === 'sell'
  const [units, setUnits] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')

  const titles = { buy: 'Buy', sell: 'Sell', deposit: 'Deposit to', withdraw: 'Withdraw from' }
  const cta = { buy: 'LOG BUY', sell: 'LOG SELL', deposit: 'DEPOSIT', withdraw: 'WITHDRAW' }
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
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <div className="k-field" style={{ flex: 1, marginTop: 0 }}>
                  <span className="k-label dim">Units</span>
                  <input className="k-input k-num" inputMode="decimal" placeholder="0" value={units}
                    onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ''))} data-autofocus />
                </div>
                <div className="k-field" style={{ flex: 1, marginTop: 0 }}>
                  <span className="k-label dim">{mode === 'buy' ? 'Buy' : 'Sell'} price &middot; SAR</span>
                  <input className="k-input k-num" inputMode="decimal" placeholder="0" value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                </div>
              </div>
              {mode === 'sell' && holding.units != null && (
                <div className="k-micro" style={{ marginTop: 8 }}>You hold <span className="k-num">{fmt(holding.units, holding.units % 1 ? 4 : 0)}</span> units{overSell ? ' — can’t sell more than that' : ''}</div>
              )}
              {computed > 0 && (
                <div className="k-micro" style={{ marginTop: 10, textAlign: 'center' }}>
                  {mode === 'buy' ? 'Cost' : 'Proceeds'} <span className="k-num k-em" style={{ fontWeight: 600 }}>{fmt(computed)}</span> SAR
                </div>
              )}
            </>
          ) : (
            <div className="k-field" style={{ marginTop: 14 }}>
              <span className="k-label dim">Amount</span>
              <div className="k-amountrow">
                <input className="k-input k-amount-in" inputMode="decimal" placeholder="0" value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} data-autofocus />
                <span className="k-amountcur">SAR</span>
              </div>
            </div>
          )}
          <div className="k-field">
            <span className="k-label dim">Note &middot; optional</span>
            <input className="k-input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className={'k-btn full ' + (mode === 'buy' || mode === 'deposit' ? 'accent' : '')}
            style={{ marginTop: 18, opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
            onClick={() => {
              if (!valid) return
              const entry = isUnit
                ? { type: mode, units: u, price: pr, amount: Math.round(computed * 100) / 100, date: TODAY, note: note.trim() }
                : { type: mode, amount: Math.round(parseFloat(amount) * 100) / 100, date: TODAY, note: note.trim() }
              onSave(holding.id, entry)
              close()
            }}>
            {cta[mode]}
          </button>
        </>
      )}
    </Sheet>
  )
}
