/* Keela — her presence: notes + memory (read-only). Private memory NEVER renders.
   "Warm" language: masthead + featured note + constellation thread + sealed memory. */
import { useTheme } from '../lib/theme'
import { Mark, Markdown, Segmented, DetailShell, Empty, Icons } from '../ui/primitives'
import { fmtDate } from '../lib/format'

/* featured "Most recent" note — soft accentSoft circle bleeds off the top-right corner */
function FeaturedNote({ m, onOpen, th }) {
  return (
    <button onClick={onOpen} style={{
      position: 'relative', display: 'block', width: '100%', textAlign: 'left',
      border: `1px solid ${th.line}`, background: th.card, borderRadius: 26,
      padding: '22px 22px 17px', cursor: 'pointer', boxShadow: th.shadow, overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', top: -34, right: -34, width: 130, height: 130, borderRadius: '50%', background: th.accentSoft, opacity: 0.55 }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: th.accent, boxShadow: `0 0 0 4px ${th.accentSoft}` }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: th.accent }}>Most recent</span>
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: th.ink3 }}>{fmtDate(m.date)}</span>
      </div>
      <div style={{ position: 'relative', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.22, color: th.ink }}>{m.title}</div>
      {m.summary && <div style={{ position: 'relative', fontSize: 13, lineHeight: 1.62, color: th.ink2, marginTop: 10 }}>{m.summary}</div>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, marginTop: 17, paddingTop: 14, borderTop: `1px solid ${th.line}` }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: th.accent }}>Read the full note</span>
        <span style={{ fontSize: 15, lineHeight: 0, color: th.accent }}>→</span>
      </div>
    </button>
  )
}

function Notes({ meetings, nav, th }) {
  if (!meetings.length) {
    return <Empty>No notes yet. Keela writes these from her other faces — the terminal and the Claude app.</Empty>
  }
  const latest = meetings[0]
  const earlier = meetings.slice(1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <FeaturedNote m={latest} onOpen={() => nav.openMeeting(latest.id)} th={th} />

      {earlier.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '30px 2px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: th.ink3 }}>Earlier sessions</span>
            <span style={{ flex: 1, height: 1, background: th.line }} />
          </div>
          <div style={{ position: 'relative' }}>
            {/* constellation thread — vertical hairline behind the node dots */}
            <div style={{ position: 'absolute', left: 7, top: 26, bottom: 22, width: 1.5, background: th.line }} />
            {earlier.map((n) => (
              <button key={n.id} onClick={() => nav.openMeeting(n.id)} style={{
                position: 'relative', display: 'flex', gap: 17, alignItems: 'flex-start', width: '100%',
                textAlign: 'left', border: 'none', background: 'none', padding: '16px 0', cursor: 'pointer',
              }}>
                <span style={{ position: 'relative', zIndex: 1, flex: 'none', marginTop: 4, width: 15, height: 15, borderRadius: '50%', background: th.bg, border: `1.5px solid ${th.ink3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: th.ink3 }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: th.ink3 }}>{fmtDate(n.date)}</span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 800, letterSpacing: '-.01em', color: th.ink, margin: '5px 0', lineHeight: 1.3 }}>{n.title}</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, color: th.ink3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.summary}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Memory({ memory, th }) {
  const pub = memory.filter((s) => !s.private && s.scope !== 'archive') // private + archive never render
  const privateCount = memory.filter((s) => s.private).length
  if (!pub.length && !privateCount) {
    return <Empty>No memory yet. What Keela learns about your patterns will gather here.</Empty>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {pub.map((s) => (
        <div key={s.id} style={{ padding: '18px 0', borderBottom: `1px solid ${th.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: th.accent }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: th.ink2 }}>{s.section}</span>
          </div>
          <Markdown text={s.body} />
        </div>
      ))}
      {privateCount > 0 && (
        <div style={{ background: th.card2, borderRadius: 22, padding: 20, textAlign: 'center', marginTop: 18 }}>
          <span style={{ display: 'inline-flex', color: th.ink3 }}>{Icons.lock}</span>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: th.ink2, marginTop: 8 }}>State of mind · sealed</div>
          <div style={{ fontSize: 11.5, color: th.ink3, marginTop: 5, lineHeight: 1.5, maxWidth: 240, marginLeft: 'auto', marginRight: 'auto' }}>
            Her private counsel stays with her other faces. By design, it never appears here.
          </div>
        </div>
      )}
    </div>
  )
}

export function Keela({ data, nav, sub, setSub }) {
  const th = useTheme()
  const ghostBtn = {
    width: '100%', border: `1.5px solid ${th.line}`, background: 'none', borderRadius: 16,
    padding: 13, fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: th.ink2,
    cursor: 'pointer', fontFamily: 'inherit',
  }
  return (
    <div className="k-screen">
      <div style={{ padding: '0 20px' }}>
        {/* masthead */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 22px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Mark size={20} color="#fff" />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05, color: th.ink }}>Keela</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.02em', color: th.ink3, marginTop: 3 }}>Read-only companion</span>
          </span>
        </div>

        <Segmented
          options={[{ value: 'notes', label: 'Session notes' }, { value: 'memory', label: 'Memory' }]}
          value={sub} onChange={setSub} style={{ marginBottom: 20 }}
        />

        <div key={sub}>
          {sub === 'notes'
            ? <Notes meetings={data.meetings} nav={nav} th={th} />
            : <Memory memory={data.memory} th={th} />}
        </div>

        {/* footer — theme toggle / sign out / signed in with Google */}
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={nav.toggleTheme} style={ghostBtn}>THEME · {nav.theme === 'dark' ? 'DARK' : 'LIGHT'}</button>
          <button onClick={nav.signOut} style={ghostBtn}>SIGN OUT</button>
          <div style={{ textAlign: 'center', fontSize: 11, color: th.ink3, marginTop: 6 }}>
            {data.profile.name} · signed in with Google
          </div>
        </div>
      </div>
    </div>
  )
}

export function MeetingDetail({ m, onClose }) {
  const th = useTheme()
  return (
    <DetailShell onClose={onClose}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: th.accent }}>{fmtDate(m.date)}</span>
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: th.ink, margin: '10px 0 18px', lineHeight: 1.25 }}>{m.title}</h1>
      <Markdown text={m.body} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, paddingTop: 18, borderTop: `1px solid ${th.line}` }}>
        <span style={{ width: 18, height: 18, borderRadius: 6, background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mark size={10} color="#fff" />
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: th.accent }}>Keela</span>
      </div>
    </DetailShell>
  )
}
