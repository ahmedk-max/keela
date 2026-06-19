/* Keela — Home: daily-driver. Variable headroom hero · runway · goals grid. */
import { Delta, KeelaNote, Mark, Icons, Sparkline, CountUp, KeelaWhisper } from '../ui/primitives'
import { whispers } from '../lib/whispers'
import { GoalScroll, RunwayBar } from './home-extras'
import { CashflowSankey } from '../ui/echart'
import { fmt, monthsBetween, NOW_MONTH } from '../lib/format'

const DAY = 86400000

export function Home({ data, nav }) {
  const { goals, profile, snapshots, meetings } = data
  const cf = data.cashflow

  // ----- this cycle: variable headroom (the number you open the app for) -----
  const expenses = cf.fixed + cf.subs                         // fixed + subs, clumped
  const variableLeft = cf.variableBudget - cf.variableSpent
  const variablePct = cf.variableBudget > 0
    ? Math.round((cf.variableSpent / cf.variableBudget) * 100)
    : (cf.variableSpent > 0 ? 100 : 0)

  // cycle progress — how far through the pay cycle we are, vs how fast we're spending
  const startMs = new Date(cf.cycleStart).getTime()
  const endMs = new Date(cf.cycleEnd).getTime()
  const cycleLen = Math.max(1, Math.round((endMs - startMs) / DAY))
  const dayInCycle = Math.min(cycleLen, Math.max(0, Math.round((Date.now() - startMs) / DAY)))
  const daysLeft = Math.max(0, cycleLen - dayInCycle)
  const timePct = Math.round((dayInCycle / cycleLen) * 100)
  const onPace = variablePct <= timePct                       // spending slower than time = ahead
  const perDay = daysLeft > 0 ? Math.round(variableLeft / daysLeft) : variableLeft

  // ----- runway: liquid (unearmarked) money ÷ monthly essentials -----
  const nw = profile.netWorth
  const isEmergency = (g) => /emerg/i.test(g.name)
  const goalBal = (g) => Math.max(0, (g.allocated || 0) - (g.spent || 0))
  // Earmarked = money reserved for a specific non-emergency goal (a kitchen, a
  // wedding) — committed even if the goal is "done" but not yet spent. Everything
  // else (assets + the emergency fund) is liquid runway you could actually live on.
  const earmarkedSegs = goals
    .filter((g) => !isEmergency(g))
    .map((g) => ({ id: g.id, name: g.name, color: g.color, bal: goalBal(g) }))
    .filter((g) => g.bal > 0)
    .sort((a, b) => b.bal - a.bal)
  const earmarkedTotal = earmarkedSegs.reduce((s, g) => s + g.bal, 0)
  const liquid = Math.max(0, nw - earmarkedTotal)
  const runway = expenses > 0 ? liquid / expenses : 0
  const runwayLabel = runway >= 100 ? '99+' : String(Math.round(runway))
  const freePct = nw > 0 ? Math.round((liquid / nw) * 100) : 0

  // net-worth month delta (kept small — net worth is no longer the headline)
  const series = snapshots.map((s) => s.netWorth)
  const prev = series.length > 1 ? series[series.length - 2] : series[0]
  const delta = nw - prev
  const deltaPct = prev ? (delta / prev) * 100 : 0

  // ----- the vow: 36-month pact countdown (Oct 2024 → Oct 2027) -----
  const pactTotal = Math.max(1, monthsBetween(profile.pactStart, profile.pactEnd))
  const pactElapsed = Math.min(pactTotal, Math.max(0, monthsBetween(profile.pactStart, NOW_MONTH)))
  const pactLeft = Math.max(0, pactTotal - pactElapsed)

  // ----- goals: show every bucket that still holds money — including funded ones
  // not yet spent — in-progress first; only emptied buckets collapse to a count.
  const isFunded = (g) => g.status === 'completed' || (g.allocated || 0) >= g.target
  const visibleGoals = goals
    .filter((g) => goalBal(g) > 0)
    .sort((a, b) => (isFunded(a) ? 1 : 0) - (isFunded(b) ? 1 : 0))
  const doneCount = goals.length - visibleGoals.length

  const latest = meetings[0]
  const hint = whispers(data)[0]

  return (
    <div className="k-screen">
      {/* header */}
      <div className="k-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Mark size={22} fill="var(--qahwa-accent)" />
          <span style={{ font: '600 18px/1 var(--qahwa-font-ui)', letterSpacing: '-0.01em' }}>Keela</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="k-icontap" onClick={nav.toggleTheme} aria-label="Toggle theme">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="M9 3a6 6 0 0 0 0 12z" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="k-icontap" onClick={nav.openSettings} aria-label="Settings">{Icons.sliders}</button>
        </div>
      </div>

      {/* THIS CYCLE — variable headroom, the daily number. One figure, one
          verdict, one gauge: the breakdown moves to its own sections below. */}
      <div className="k-hero" style={{ paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span className="k-label dim" style={{ display: 'block', marginBottom: 10 }}>Left to spend</span>
            <div className="k-hero-num" style={{ fontSize: 46, color: variableLeft < 0 ? 'var(--qahwa-loss)' : 'var(--qahwa-fg-1)' }}>
              <CountUp value={variableLeft} /><span className="k-sar" style={{ fontSize: 14, marginLeft: 8 }}>SAR</span>
            </div>
          </div>
          <span className={'k-tag ' + (variableLeft < 0 ? 'loss' : onPace ? 'gain' : 'loss')} style={{ marginTop: 6 }}>
            {variableLeft < 0 ? 'Over budget' : onPace ? 'On pace' : 'Over pace'}
          </span>
        </div>

        <div className="k-micro" style={{ marginTop: 12 }}>
          {daysLeft > 0
            ? <>~<span className="k-num" style={{ fontWeight: 600, color: 'var(--qahwa-fg-2)' }}>{fmt(Math.max(0, perDay))}</span>/day to coast the last {daysLeft} days</>
            : 'cycle ending'}
        </div>

        {/* variable budget bar with a "where you should be" time marker */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <div className="k-flowbar">
            <div className="k-flowbar-seg" style={{ width: Math.min(100, variablePct) + '%', background: variableLeft < 0 ? 'var(--qahwa-loss)' : onPace ? 'var(--qahwa-gain)' : 'var(--qahwa-accent)' }} />
          </div>
          <div style={{ position: 'absolute', left: Math.min(100, timePct) + '%', top: -3, bottom: -3, width: 1, background: 'var(--qahwa-fg-1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span className="k-micro"><span className="k-num" style={{ fontWeight: 600, color: 'var(--qahwa-fg-2)' }}>{fmt(cf.variableSpent)}</span> spent</span>
          <span className="k-micro">of <span className="k-num" style={{ fontWeight: 600, color: 'var(--qahwa-fg-2)' }}>{fmt(cf.variableBudget)}</span> budget</span>
        </div>
      </div>

      {/* KEELA WHISPER — one derived nudge, her voice, inline */}
      {hint && (
        <div className="k-sec" style={{ marginTop: 16 }}>
          <KeelaWhisper>{hint}</KeelaWhisper>
        </div>
      )}

      {/* MONTHLY FLOW — where each month's income goes, as a river */}
      <div className="k-sec div">
        <div className="k-sec-head">
          <span className="k-label">Monthly flow</span>
          <span className="k-micro"><span className="k-num" style={{ fontWeight: 600, color: 'var(--qahwa-fg-2)' }}>{fmt(cf.income)}</span> income</span>
        </div>
        <CashflowSankey income={cf.income} saved={cf.saved} expenses={expenses} variable={cf.variableSpent} />
        <div className="k-figs" style={{ marginTop: 14 }}>
          <div className="k-fig"><div className="k-fig-tick" style={{ background: 'var(--qahwa-gain)' }} /><span className="k-fig-val">{fmt(cf.saved)}</span><span className="k-label dim">Saved &middot; {cf.rate}%</span></div>
          <div className="k-fig"><div className="k-fig-tick" style={{ background: 'var(--qahwa-loss)' }} /><span className="k-fig-val">{fmt(expenses)}</span><span className="k-label dim">Expenses</span></div>
          <div className="k-fig"><div className="k-fig-tick" style={{ background: 'var(--qahwa-accent)' }} /><span className="k-fig-val">{fmt(cf.variableSpent)}</span><span className="k-label dim">Variable</span></div>
        </div>
        <div className="k-micro" style={{ marginTop: 12, color: 'var(--qahwa-fg-3)' }}>
          {cf.rate >= cf.target ? '▲ +' : '▼ −'}{Math.abs(cf.rate - cf.target)} vs {cf.target} pact &middot; vow {pactElapsed} of {pactTotal} months &middot; {pactLeft} left
        </div>
      </div>

      {/* RUNWAY — net worth, reframed as freedom */}
      <div className="k-sec div">
        <div className="k-sec-head">
          <span className="k-label">Runway &middot; if income stopped</span>
          <span className="k-micro" style={{ cursor: 'pointer' }} onClick={() => nav.goTab('assets')}>Net worth &rsaquo;</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span className="k-num" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>{runwayLabel}</span>
            <span className="k-micro">months of essentials covered</span>
          </div>
          <span style={{ display: 'block', width: 88, height: 30, flex: 'none' }}>
            <Sparkline values={series} h={30} stroke="var(--qahwa-gain)" />
          </span>
        </div>
        <div style={{ marginTop: 14 }}>
          <RunwayBar liquid={liquid} earmarked={earmarkedTotal} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span className="k-micro"><span className="k-num k-gain" style={{ fontWeight: 600 }}>{fmt(liquid)}</span> liquid &middot; {freePct}% free</span>
          <span className="k-micro">Net worth <span className="k-num" style={{ fontWeight: 600, color: 'var(--qahwa-fg-2)' }}>{fmt(nw)}</span> <Delta value={delta} pct={deltaPct} dp={1} /></span>
        </div>
        {earmarkedSegs.length > 0 && (
          <div className="k-micro" style={{ marginTop: 5, color: 'var(--qahwa-fg-3)' }}>
            Earmarked: {earmarkedSegs.slice(0, 3).map((g) => g.name).join(' · ')}
            {earmarkedSegs.length > 3 ? ` · +${earmarkedSegs.length - 3} more` : ''}
          </div>
        )}
      </div>

      {/* SAVINGS GOALS — 2-col grid, finished ones hidden */}
      <div className="k-sec div">
        <div className="k-sec-head">
          <span className="k-label">Savings goals</span>
          <span className="k-micro" style={{ cursor: 'pointer' }} onClick={() => nav.goTab('buckets')}>
            {doneCount > 0 ? `${doneCount} done · all ` : 'All '}&rsaquo;
          </span>
        </div>
        <GoalScroll goals={visibleGoals} onOpen={nav.openBucket} />
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
