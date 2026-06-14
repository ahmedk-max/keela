/* Keela — her presence: notes + memory (read-only). Private memory NEVER renders. (ported) */
import { Markdown, Mark, Empty } from '../ui/primitives'
import { fmtDate } from '../lib/format'

function Masthead() {
  return (
    <div className="k-masthead">
      <div className="k-mast-row">
        <Mark size={24} fill="var(--qahwa-accent)" />
        <span className="k-mast-word">Keela</span>
        <span className="k-mast-sub">Read-only</span>
      </div>
      <p className="k-epigraph">&ldquo;I read the numbers like constellations &mdash; and write down what they spell.&rdquo;</p>
    </div>
  )
}

function Notes({ meetings, nav }) {
  if (!meetings.length) {
    return <Empty>No notes yet. Keela writes these from her other faces — the terminal and the Claude app.</Empty>
  }
  return (
    <div className="k-thread">
      {meetings.map((m, i) => (
        <button className={'k-entry' + (i === 0 ? ' recent' : '')} key={m.id} onClick={() => nav.openMeeting(m.id)}>
          <span className="k-entry-date">{fmtDate(m.date)}</span>
          <div className="k-entry-title">{m.title}</div>
          <div className="k-entry-sum">{m.summary}</div>
          <span className="k-entry-more">Read note <span style={{ fontSize: 12 }}>&rsaquo;</span></span>
        </button>
      ))}
    </div>
  )
}

function Memory({ memory }) {
  const pub = memory.filter((s) => !s.private && s.scope !== 'archive') // private + archive filtered out
  const privateCount = memory.filter((s) => s.private).length
  if (!pub.length && !privateCount) {
    return <Empty>No memory yet. What Keela learns about your patterns will gather here.</Empty>
  }
  return (
    <div className="k-mem">
      {pub.map((s) => (
        <div className="k-mem-sec" key={s.id}>
          <div className="k-mem-head"><span className="k-mem-dot" /><span className="k-mem-name">{s.section}</span></div>
          <Markdown text={s.body} />
        </div>
      ))}
      {privateCount > 0 && (
        <div className="k-sealed">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--qahwa-fg-3)" strokeWidth="1.2" aria-hidden="true">
            <rect x="4" y="9" width="12" height="8" />
            <path d="M6.5 9V6.6a3.5 3.5 0 0 1 7 0V9" />
            <circle cx="10" cy="12.6" r="1" fill="var(--qahwa-fg-3)" stroke="none" />
          </svg>
          <span className="k-sealed-t">State of mind &middot; sealed</span>
          <span className="k-sealed-d">Her private counsel stays with her other faces. By design, it never appears here.</span>
        </div>
      )}
    </div>
  )
}

export function Keela({ data, nav, sub, setSub }) {
  return (
    <div className="k-screen">
      <Masthead />
      <div className="k-ktabs">
        <button className={'k-ktab' + (sub === 'notes' ? ' on' : '')} onClick={() => setSub('notes')}>Session notes</button>
        <button className={'k-ktab' + (sub === 'memory' ? ' on' : '')} onClick={() => setSub('memory')}>Memory</button>
      </div>
      <div key={sub} style={{ marginTop: 4 }}>
        {sub === 'notes' ? <Notes meetings={data.meetings} nav={nav} /> : <Memory memory={data.memory} />}
      </div>
      <div className="k-sec div" style={{ marginTop: 30 }}>
        <button className="k-btn ghost full" style={{ marginBottom: 10 }} onClick={nav.toggleTheme}>
          THEME · {nav.theme === 'dark' ? 'DARK' : 'LIGHT'}
        </button>
        <button className="k-btn ghost full" onClick={nav.signOut}>SIGN OUT</button>
        <div className="k-micro" style={{ textAlign: 'center', marginTop: 12, letterSpacing: '0.04em' }}>
          {data.profile.name} &middot; signed in with Google
        </div>
      </div>
    </div>
  )
}

export function MeetingDetail({ m, onClose }) {
  return (
    <div className="k-detail">
      <div className="k-detail-bar"><button className="k-back" onClick={onClose}>&lsaquo; Keela</button></div>
      <div className="k-scroll">
        <div className="k-screen">
          <div className="k-read">
            <span className="k-read-date">{fmtDate(m.date)}</span>
            <h1 className="k-read-title">{m.title}</h1>
            <Markdown text={m.body} />
            <div className="k-read-sig">
              <Mark size={16} fill="var(--qahwa-accent)" />
              <span className="k-read-sig-word">Keela</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
