/* Keela — Assets: investments & net worth detail (ported, wired to data) */
import { Delta, Tag, Badge } from '../ui/primitives'
import { getEntry } from '../lib/icons'
import { TrendChart } from '../ui/echart'
import { fmt, fmtDate } from '../lib/format'

function assetSeries(a) {
  // synthesize a deterministic balance history from invested -> current
  const n = 8, out = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const base = a.invested + (a.current - a.invested) * t
    const wob = Math.sin(i * 1.7 + a.invested) * (a.current - a.invested) * 0.06
    out.push(Math.max(0, base + (i === n - 1 ? 0 : wob)))
  }
  out[n - 1] = a.current
  return out
}

function AssetRow({ a, onClick }) {
  const gain = a.current - a.invested
  const pct = a.invested ? (gain / a.invested) * 100 : 0
  return (
    <button className="k-row btn" onClick={onClick}>
      <span className="k-swatch" style={{ width: 12, height: 12, background: a.color }} />
      <div className="k-row-main">
        <span className="k-row-name">{a.name}</span>
        <span className="k-row-sub">{a.goal && a.goal !== a.cat ? `${a.cat} · ${a.goal}` : a.cat}</span>
      </div>
      <div className="k-row-r">
        <span className="k-row-amt">{fmt(a.current)}</span>
        <span className="k-num" style={{ fontSize: 10 }}><Delta value={gain} pct={pct} dp={1} /></span>
      </div>
    </button>
  )
}

export function Assets({ data, nav }) {
  const assets = data.assets
  const nw = assets.reduce((s, a) => s + a.current, 0)
  const invested = assets.reduce((s, a) => s + a.invested, 0)
  const gain = nw - invested
  const gainPct = invested ? (gain / invested) * 100 : 0
  const sorted = [...assets].sort((x, y) => y.current - x.current)
  return (
    <div className="k-screen">
      <div className="k-phead">
        <div><div className="k-htitle">Assets</div></div>
        <div className="k-asof">{assets.length} positions</div>
      </div>

      <div className="k-hero" style={{ paddingTop: 8 }}>
        <span className="k-label" style={{ display: 'block', marginBottom: 10 }}>Portfolio &middot; SAR</span>
        <div className="k-hero-num" style={{ fontSize: 44 }}>{fmt(nw)}</div>
        <div className="k-hero-delta">
          <span className="k-num k-flat">{fmt(invested)} invested</span>
          <span className="k-flat">/</span>
          <Delta value={gain} pct={gainPct} dp={1} />
          <span className="k-micro">all time</span>
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="k-sec">
          <div className="k-sec-head"><span className="k-label">Allocation</span><span className="k-micro">{assets.length} holdings</span></div>
          <div className="k-alloc">
            {sorted.map((a) => (
              <div key={a.id} className="k-alloc-seg" title={a.name} style={{ width: (a.current / nw * 100) + '%', background: a.color }} />
            ))}
          </div>
          <div className="k-legend">
            {sorted.map((a) => (
              <div className="k-legend-row" key={a.id}>
                <span className="k-swatch" style={{ background: a.color }} />
                <span style={{ flex: 1, font: '500 12px/1.2 var(--qahwa-font-ui)' }}>{a.name}</span>
                <span className="k-num" style={{ fontSize: 11, color: 'var(--qahwa-fg-3)', marginRight: 12 }}>{(a.current / nw * 100).toFixed(1)}%</span>
                <span className="k-num" style={{ fontSize: 12, fontWeight: 500, minWidth: 56, textAlign: 'right' }}>{fmt(a.current)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="k-sec">
        <div className="k-sec-head"><span className="k-label">Holdings</span></div>
      </div>
      {sorted.map((a) => <AssetRow key={a.id} a={a} onClick={() => nav.openAsset(a.id)} />)}
    </div>
  )
}

export function AssetDetail({ a, onClose }) {
  const gain = a.current - a.invested
  const pct = a.invested ? (gain / a.invested) * 100 : 0
  const series = assetSeries(a)
  return (
    <div className="k-detail">
      <div className="k-detail-bar"><button className="k-back" onClick={onClose}>&lsaquo; Assets</button></div>
      <div className="k-scroll">
        <div className="k-screen">
          <div className="k-hero" style={{ paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="k-swatch" style={{ width: 12, height: 12, background: a.color }} />
              <span style={{ font: '600 16px/1.15 var(--qahwa-font-ui)', flex: 1 }}>{a.name}</span>
              <Tag kind="mute">{a.cat}</Tag>
            </div>
            <div className="k-hero-num" style={{ fontSize: 40 }}>{fmt(a.current)}</div>
            <div className="k-hero-delta"><Delta value={gain} dp={0} /> <span className="k-flat">/</span> <Delta value={gain} pct={pct} dp={1} /><span className="k-micro">on cost</span></div>
          </div>

          <div className="k-sec" style={{ marginTop: 18 }}>
            <TrendChart values={series} height={60} tone={gain >= 0 ? 'gain' : 'loss'} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="k-micro k-num">{fmt(a.invested)}</span>
              <span className="k-micro">balance history</span>
              <span className="k-micro k-num">{fmt(a.current)}</span>
            </div>
          </div>

          <div className="k-sec">
            <div className="k-stats">
              <div className="k-stat"><span className="k-label dim">Invested</span><span className="k-stat-val">{fmt(a.invested)}</span></div>
              <div className="k-stat"><span className="k-label dim">Current</span><span className="k-stat-val">{fmt(a.current)}</span></div>
              <div className="k-stat"><span className="k-label dim">Gain</span><span className={'k-stat-val ' + (gain >= 0 ? 'k-gain' : 'k-loss')}>{gain >= 0 ? '+' : '−'}{fmt(Math.abs(gain))}</span></div>
              <div className="k-stat"><span className="k-label dim">Allocated to</span><span className="k-stat-val" style={{ fontSize: 13, color: 'var(--qahwa-fg-2)' }}>{a.goal}</span></div>
            </div>
          </div>

          <div className="k-sec">
            <div className="k-sec-head"><span className="k-label">Entries</span><span className="k-micro">{a.entries.length}</span></div>
            {a.entries.map((e, i) => (
              <div className="k-row" key={i}>
                <Badge icon={getEntry(e.type).icon} color={getEntry(e.type).color} />
                <div className="k-row-main">
                  <span className="k-row-name" style={{ textTransform: 'capitalize' }}>{e.type}</span>
                  <span className="k-row-sub">{fmtDate(e.date)}{e.note ? ' · ' + e.note : ''}</span>
                </div>
                <div className="k-row-r"><span className="k-row-amt">{e.amount ? fmt(e.amount) : '—'}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
