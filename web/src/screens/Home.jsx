/* Keela — Home: daily-driver. "Left to spend" hero · monthly flow · runway ·
   goals rail · latest note. "Warm" language: dark espresso hero on warm sand. */
import { useTheme } from '../lib/theme'
import { Mark, Ring, Sparkline, StackedBar, Progress, Pill, KeelaWhisper, CountUp, Icons, sectionStyle } from '../ui/primitives'
import { whispers } from '../lib/whispers'
import { fmt, fmtDate, monthsBetween, NOW_MONTH } from '../lib/format'

const DAY = 86400000

export function Home({ data, nav }) {
  const th = useTheme()
  const { goals, profile, snapshots, meetings } = data
  const cf = data.cashflow

  // ----- this cycle: variable headroom (the number you open the app for) -----
  const expenses = cf.fixed + cf.subs
  const variableLeft = cf.variableBudget - cf.variableSpent
  const variablePct = cf.variableBudget > 0
    ? Math.round((cf.variableSpent / cf.variableBudget) * 100)
    : (cf.variableSpent > 0 ? 100 : 0)

  const startMs = new Date(cf.cycleStart).getTime()
  const endMs = new Date(cf.cycleEnd).getTime()
  const cycleLen = Math.max(1, Math.round((endMs - startMs) / DAY))
  const dayInCycle = Math.min(cycleLen, Math.max(0, Math.round((Date.now() - startMs) / DAY)))
  const daysLeft = Math.max(0, cycleLen - dayInCycle)
  const timePct = Math.round((dayInCycle / cycleLen) * 100)
  const onPace = variablePct <= timePct
  const perDay = daysLeft > 0 ? Math.round(variableLeft / daysLeft) : variableLeft

  const over = variableLeft < 0
  const paceLabel = over ? 'Over budget' : onPace ? 'On pace' : 'Over pace'
  const paceBg = over ? 'rgba(240,138,126,.18)' : onPace ? 'rgba(120,200,150,.18)' : 'rgba(230,170,90,.2)'
  const paceFg = over ? '#F3B4AC' : onPace ? '#9FE0B4' : '#F0C98E'
  const barColor = over ? '#E5786C' : onPace ? '#7BC894' : '#E5A862'

  // ----- runway: liquid (unearmarked) money ÷ monthly essentials -----
  const nw = profile.netWorth
  const isEmergency = (g) => /emerg/i.test(g.name)
  const goalBal = (g) => Math.max(0, (g.allocated || 0) - (g.spent || 0))
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

  const series = snapshots.map((s) => s.netWorth)
  const prev = series.length > 1 ? series[series.length - 2] : series[0]
  const delta = nw - prev
  const deltaPct = prev ? (delta / prev) * 100 : 0

  const pactTotal = Math.max(1, monthsBetween(profile.pactStart, profile.pactEnd))
  const pactElapsed = Math.min(pactTotal, Math.max(0, monthsBetween(profile.pactStart, NOW_MONTH)))
  const pactLeft = Math.max(0, pactTotal - pactElapsed)

  const isFunded = (g) => g.status === 'completed' || (g.allocated || 0) >= g.target
  const visibleGoals = goals
    .filter((g) => goalBal(g) > 0)
    .sort((a, b) => (isFunded(a) ? 1 : 0) - (isFunded(b) ? 1 : 0))
  const doneCount = goals.length - visibleGoals.length

  const latest = meetings[0]
  const hint = whispers(data)[0]

  // Monthly flow is the PLAN: variable shows the full allowance (budget), not spend-to-date,
  // so the breakdown sums to income and doesn't move as you spend. Spend lives in the hero.
  const flowTotal = Math.max(1, cf.saved + expenses + cf.variableBudget)
  const iconBtn = {
    width: 38, height: 38, border: `1px solid ${th.line}`, borderRadius: '50%', background: th.card,
    color: th.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  }
  const secStyle = sectionStyle(th)
  const headStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }
  const dim = th.onDarkDim

  return (
    <div className="k-screen">
      <div style={{ padding: '0 20px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Mark size={30} color={th.accent} style={{ marginLeft: -2 }} />
            <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: th.ink }}>Keela</span>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={nav.toggleTheme} style={iconBtn} aria-label="Toggle theme">{Icons.theme}</button>
            <button onClick={nav.openSettings} style={iconBtn} aria-label="Settings">{Icons.settings}</button>
          </div>
        </div>

        {/* HERO — left to spend */}
        <div style={{ background: th.darkcard, borderRadius: 28, padding: '24px 24px 22px', color: th.onDark, boxShadow: th.shadow }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(243,238,227,.55)' }}>Left to spend</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                <CountUp value={variableLeft} style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: over ? '#F08A7E' : th.onDark }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(243,238,227,.5)' }}>SAR</span>
              </div>
            </div>
            <Pill bg={paceBg} fg={paceFg}>{paceLabel}</Pill>
          </div>
          <div style={{ fontSize: 12.5, color: dim, marginTop: 14 }}>
            {daysLeft > 0 ? `~${fmt(Math.max(0, perDay))}/day to coast the last ${daysLeft} days` : 'cycle ending'}
          </div>
          <div style={{ position: 'relative', marginTop: 16, height: 10, borderRadius: 999, background: 'rgba(255,255,255,.1)' }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, variablePct)}%`, background: barColor, transition: 'width 560ms cubic-bezier(.2,.8,.2,1)' }} />
            <div style={{ position: 'absolute', top: -3, bottom: -3, width: 2, borderRadius: 2, background: 'rgba(255,255,255,.85)', left: `${Math.min(100, timePct)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: dim }}>
            <span><b style={{ color: th.onDark }}>{fmt(cf.variableSpent)}</b> spent</span>
            <span>of <b style={{ color: th.onDark }}>{fmt(cf.variableBudget)}</b> budget</span>
          </div>
        </div>

        {/* KEELA WHISPER — one derived nudge, her voice */}
        {hint && <div style={{ marginTop: 16 }}><KeelaWhisper>{hint}</KeelaWhisper></div>}

        {/* MONTHLY FLOW */}
        <div style={secStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: th.ink }}>Monthly flow</span>
            <span style={{ fontSize: 12, color: th.ink2 }}><b style={{ color: th.ink }}>{fmt(cf.income)}</b> income</span>
          </div>
          <StackedBar height={14} segs={[
            { w: (cf.saved / flowTotal) * 100, color: th.green },
            { w: (expenses / flowTotal) * 100, color: th.loss },
            { w: (cf.variableBudget / flowTotal) * 100, color: th.amber },
          ]} />
          <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
            {[
              { c: th.green, l: `Saved ${cf.rate}%`, v: fmt(cf.saved) },
              { c: th.loss, l: 'Expenses', v: fmt(expenses) },
              { c: th.amber, l: 'Variable', v: fmt(cf.variableBudget) },
            ].map((f, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: f.c }} />
                  <span style={{ fontSize: 11, color: th.ink2, whiteSpace: 'nowrap' }}>{f.l}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: th.ink, marginTop: 5 }}>{f.v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: th.ink3, marginTop: 14 }}>
            {cf.rate === cf.target
              ? `On your ${cf.target} pact`
              : `${cf.rate > cf.target ? '▲ +' : '▼ −'}${Math.abs(cf.rate - cf.target)} vs ${cf.target} pact`}
          </div>
          {/* Vow timeline — visualize progress through the pact; months left is the headline */}
          <div style={{ marginTop: 12 }}>
            <Progress pct={(pactElapsed / pactTotal) * 100} height={8} />
            <div style={{ textAlign: 'right', marginTop: 7, fontSize: 11, color: th.ink3 }}>
              <b style={{ color: th.ink2, fontWeight: 700 }}>{pactLeft}</b> months left
            </div>
          </div>
        </div>

        {/* RUNWAY */}
        <div style={secStyle}>
          <div style={headStyle}>
            <span style={{ fontSize: 15, fontWeight: 700, color: th.ink }}>Runway</span>
            <button onClick={() => nav.goTab('assets')} style={{ border: 'none', background: 'none', fontSize: 12, color: th.ink2, cursor: 'pointer' }}>Net worth ›</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', color: th.ink }}>{runwayLabel}</span>
              <span style={{ fontSize: 12, color: th.ink2, maxWidth: 110, lineHeight: 1.3 }}>months of essentials covered</span>
            </div>
            <Sparkline values={series} w={320} h={48} width={92} height={34} color={th.green} style={{ flex: 'none' }} />
          </div>
          <div style={{ marginTop: 16 }}>
            <StackedBar height={12} segs={[
              { w: (liquid / (nw || 1)) * 100, color: th.green },
              { w: (earmarkedTotal / (nw || 1)) * 100, color: th.flat },
            ]} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: th.ink2 }}>
            <span><b style={{ color: th.green }}>{fmt(liquid)}</b> liquid · {freePct}% free</span>
            <span>Net worth <b style={{ color: th.ink }}>{fmt(nw)}</b> <b style={{ color: delta >= 0 ? th.gain : th.loss }}>{delta >= 0 ? '▲ ' : '▼ '}{fmt(Math.abs(delta))} · {delta >= 0 ? '+' : '−'}{fmt(Math.abs(deltaPct), 1)}%</b></span>
          </div>
          {earmarkedSegs.length > 0 && (
            <div style={{ fontSize: 11, color: th.ink3, marginTop: 7 }}>
              Earmarked: {earmarkedSegs.slice(0, 3).map((g) => g.name).join(' · ')}
              {earmarkedSegs.length > 3 ? ` · +${earmarkedSegs.length - 3} more` : ''}
            </div>
          )}
        </div>

        {/* SAVINGS GOALS — horizontal rail of ring cards */}
        <div style={{ marginTop: 24 }}>
          <div style={{ ...headStyle, padding: '0 2px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: th.ink }}>Savings goals</span>
            <button onClick={() => nav.goTab('buckets')} style={{ border: 'none', background: 'none', fontSize: 12, color: th.ink2, cursor: 'pointer' }}>
              {doneCount > 0 ? `${doneCount} done · all ›` : 'All ›'}
            </button>
          </div>
          {visibleGoals.length === 0 ? (
            <div style={{ fontSize: 12.5, color: th.ink3, fontStyle: 'italic', padding: '2px 2px' }}>No active goals — every bucket is full.</div>
          ) : (
            <div className="kscroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '4px -20px 0', padding: '2px 20px 8px' }}>
              {visibleGoals.map((g) => {
                const bal = goalBal(g)
                const pct = g.target > 0 ? Math.round((bal / g.target) * 100) : 0
                const funded = isFunded(g)
                return (
                  <button key={g.id} onClick={() => nav.openBucket(g.id)} style={{ flex: 'none', width: 142, background: th.card, border: `1px solid ${th.line}`, borderRadius: 22, padding: 16, textAlign: 'left', cursor: 'pointer' }}>
                    <Ring pct={funded ? 100 : pct} size={64} stroke={6} color={g.color} style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: g.color }}>{funded ? '✓' : `${pct}%`}</span>
                    </Ring>
                    <div style={{ fontSize: 13, fontWeight: 700, color: th.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: th.ink2, marginTop: 4 }}>{fmt(bal)}{funded ? ' left' : ` / ${fmt(g.target)}`}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* KEELA NOTE */}
        {latest && (
          <div style={{ marginTop: 24 }}>
            <div style={{ ...headStyle, padding: '0 2px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: th.ink }}>Keela&rsquo;s latest note</span>
              <button onClick={() => nav.goTab('keela')} style={{ border: 'none', background: 'none', fontSize: 12, color: th.ink2, cursor: 'pointer' }}>All notes ›</button>
            </div>
            <button onClick={() => nav.openMeeting(latest.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: th.accentSoft, border: 'none', borderRadius: 22, padding: '18px 20px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <span style={{ width: 20, height: 20, borderRadius: 7, background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mark size={11} color="#fff" /></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: th.accent }}>Keela</span>
                <span style={{ fontSize: 11, color: th.ink3, marginLeft: 'auto' }}>{fmtDate(latest.date)}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: th.ink, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{latest.summary}</div>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
