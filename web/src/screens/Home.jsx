/* Keela — Home: cashflow-led, open layout (ported, wired to Firestore data) */
import { Delta, Sparkline, KeelaNote, Mark, Icons } from '../ui/primitives'
import { BucketRings, CashflowRiver, hxMonthly } from './home-extras'
import { fmt, fmtDay, MONTH_ABBR } from '../lib/format'

export function Home({ data, nav }) {
  const { goals, profile, income, bills, snapshots, thisMonth, meetings } = data

  const nw = profile.netWorth
  const series = snapshots.map((s) => s.netWorth)
  const prev = series.length > 1 ? series[series.length - 2] : series[0]
  const delta = nw - prev
  const deltaPct = prev ? (delta / prev) * 100 : 0
  const tm = thisMonth
  const target = profile.split.save
  const ahead = tm.kept - target
  const latest = meetings[0]
  const min = Math.min(...series), max = Math.max(...series)

  // cashflow — consistent, pay-cycle figures from the selector
  const cf = data.cashflow
  const cycleLabel = `${fmtDay(cf.cycleStart)} – ${fmtDay(cf.cycleEnd)}`
  const rateAhead = cf.rate - cf.target
  const legend = [
    { label: 'Saved', val: cf.saved, c: 'var(--qahwa-gain)' },
    { label: 'Fixed', val: cf.fixed, c: 'var(--qahwa-loss)' },
    { label: 'Subs', val: cf.subs, c: 'var(--qahwa-accent)' },
    { label: 'Variable', val: cf.variableSpent, c: 'var(--qahwa-brewed)' },
  ]

  const now = new Date()
  const asOf = `${now.getDate()} ${MONTH_ABBR[now.getMonth()]} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className="k-screen">
      {/* header */}
      <div className="k-head">
        <div className="k-head-l" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Mark size={20} fill="var(--qahwa-accent)" />
          <span style={{ font: '600 17px/1 var(--qahwa-font-ui)', letterSpacing: '-0.01em' }}>Keela</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="k-asof">As of<br />{asOf}</div>
          <button className="k-back" onClick={nav.toggleTheme} style={{ padding: 4 }} aria-label="Toggle theme">
            <span style={{ display: 'block', width: 18, height: 18, color: 'var(--qahwa-fg-2)' }}>
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <path d="M9 3a6 6 0 0 0 0 12z" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </button>
          <button className="k-back" onClick={nav.openSettings} style={{ padding: 4 }} aria-label="Settings">
            <span style={{ display: 'block', width: 18, height: 18, color: 'var(--qahwa-fg-2)' }}>{Icons.gear}</span>
          </button>
        </div>
      </div>

      {/* CASHFLOW — the headline */}
      <div className="k-hero" style={{ paddingTop: 10, paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="k-label">This cycle &middot; {cycleLabel}</span>
          <span className="k-micro" style={{ cursor: 'pointer', color: 'var(--qahwa-accent)', letterSpacing: '0.04em' }} onClick={nav.openSettings}>Edit income &rsaquo;</span>
        </div>
        <span className="k-label dim" style={{ display: 'block', marginBottom: 8 }}>Saved so far</span>
        <div className="k-hero-num" style={{ fontSize: 46, color: cf.saved < 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-fg-1)' }}>
          {fmt(cf.saved)}<span className="k-sar" style={{ fontSize: 14, marginLeft: 8 }}>SAR</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 9px', marginTop: 12 }}>
          <span className="k-num" style={{ fontWeight: 600 }}>{fmt(cf.income)}</span><span className="k-micro">in</span>
          <span className="k-flat">&minus;</span>
          <span className="k-num k-loss" style={{ fontWeight: 600 }}>{fmt(cf.fixed + cf.subs)}</span><span className="k-micro">fixed+subs</span>
          <span className="k-flat">&minus;</span>
          <span className="k-num k-em" style={{ fontWeight: 600 }}>{fmt(cf.variableSpent)}</span><span className="k-micro">spent</span>
          <span className="k-num" style={{ fontWeight: 600, marginLeft: 'auto', color: rateAhead >= 0 ? 'var(--qahwa-gain)' : 'var(--qahwa-loss)' }}>{cf.rate}% saved</span>
        </div>

        <div style={{ marginTop: 20 }}>
          <CashflowRiver income={cf.income} fixed={cf.fixed} subs={cf.subs} variable={cf.variableSpent} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 14 }}>
            {legend.map((l, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <span className="k-swatch" style={{ width: 9, height: 9, background: l.c }} />
                <span className="k-micro" style={{ color: 'var(--qahwa-fg-2)' }}>{l.label}</span>
                <span className="k-num" style={{ fontSize: 11, fontWeight: 600 }}>{fmt(l.val)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* NET WORTH — secondary */}
      <div className="k-sec div">
        <div className="k-sec-head"><span className="k-label">Net worth &middot; SAR</span>
          <span className="k-micro">{snapshots.length} months</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div className="k-num" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmt(nw)}</div>
          <div style={{ textAlign: 'right' }}>
            <Delta value={delta} pct={deltaPct} dp={1} />
            <div className="k-micro" style={{ marginTop: 3 }}>this month</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><Sparkline values={series} h={46} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span className="k-micro k-num">low {fmt(min)}</span>
          <span className="k-micro k-num">high {fmt(max)}</span>
        </div>
      </div>

      {/* THE PACT — demoted */}
      <div className="k-sec div">
        <div className="k-sec-head"><span className="k-label">The pact &middot; {profile.split.save}/{profile.split.live}</span>
          <span className={'k-num ' + (ahead >= 0 ? 'k-gain' : 'k-loss')} style={{ fontWeight: 600, fontSize: 11 }}>
            {tm.kept}% kept &middot; {ahead >= 0 ? '▲ +' : '▼ −'}{Math.abs(ahead)}
          </span></div>
        <div className="k-gauge" style={{ marginTop: 4 }}>
          <div className="k-gauge-save" style={{ width: tm.kept + '%' }}><span className="k-gauge-seg-lbl" style={{ color: 'var(--qahwa-fg-inv)' }}>SAVE</span></div>
          <div className="k-gauge-live"><span className="k-gauge-seg-lbl" style={{ color: 'var(--qahwa-fg-2)' }}>LIVE</span></div>
          <div className="k-gauge-tick" data-l={target} style={{ left: target + '%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <span className="k-micro">{fmt(Math.round(cf.income * tm.kept / 100))} saved &middot; {fmt(Math.round(cf.income * (100 - tm.kept) / 100))} to live</span>
          <span className="k-micro" style={{ cursor: 'pointer', color: 'var(--qahwa-accent)' }} onClick={() => nav.goTab('buckets')}>Goals &rsaquo;</span>
        </div>
      </div>

      {/* SAVINGS GOALS — rings */}
      <div className="k-sec div">
        <div className="k-sec-head"><span className="k-label">Savings goals</span>
          <span className="k-micro" style={{ cursor: 'pointer' }} onClick={() => nav.goTab('buckets')}>All &rsaquo;</span></div>
        <BucketRings goals={goals.filter((g) => g.status !== 'completed')} onOpen={nav.openBucket} />
      </div>

      {/* KEELA NOTE */}
      {latest && (
        <div className="k-sec div">
          <div className="k-sec-head"><span className="k-label">Keela&rsquo;s latest note</span>
            <span className="k-micro" style={{ cursor: 'pointer' }} onClick={() => nav.goTab('keela')}>All notes &rsaquo;</span></div>
          <KeelaNote date={latest.date} clamp onClick={() => nav.openMeeting(latest.id)}>
            {latest.summary}
          </KeelaNote>
        </div>
      )}

      {/* QUICK ADD */}
      <div className="k-sec" style={{ marginTop: 24 }}>
        <button className="k-btn accent full" onClick={() => nav.addTx()}>
          <span style={{ fontSize: 15, lineHeight: 0 }}>+</span> ADD TRANSACTION
        </button>
      </div>
    </div>
  )
}
