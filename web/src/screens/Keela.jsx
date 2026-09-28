/* Public notes and memory only. Private bodies never enter the rendered tree. */
import { Mark, Markdown, DetailShell, Empty, Icons } from '../ui/primitives';
import { Page, Section } from '../ui/compact';
import { fmtDate } from '../lib/format';

function Notes({ meetings, nav }) {
  if (!meetings.length) return <Empty>No notes yet. Keela’s reflections will appear here after your next check-in.</Empty>;
  const [latest, ...earlier] = meetings;
  return <>
    <button className="c-featured-note" onClick={() => nav.openMeeting(latest.id)}>
      <span className="c-note-meta"><span>Latest reflection</span><time>{fmtDate(latest.date)}</time></span>
      <strong>{latest.title}</strong>
      {latest.summary && <span className="c-note-summary">{latest.summary}</span>}
      <span className="c-note-link">Read the full note <span aria-hidden="true">→</span></span>
    </button>
    {earlier.length > 0 && <Section title="Earlier sessions">
      {earlier.map((n) => <button key={n.id} className="c-note-row c-row-main" onClick={() => nav.openMeeting(n.id)}>
        <span className="c-note-node" aria-hidden="true" />
        <span className="c-row-content"><time className="c-muted">{fmtDate(n.date)}</time><strong>{n.title}</strong><span className="c-note-excerpt">{n.summary}</span></span>
        <span className="c-row-chevron" aria-hidden="true">›</span>
      </button>)}
    </Section>}
  </>;
}
function Memory({ memory }) {
  const pub = memory.filter((s) => !s.private && s.scope !== 'archive');
  const hasPrivate = memory.some((s) => s.private);
  if (!pub.length && !hasPrivate) return <Empty>No memory yet. Your patterns and goals will gather here.</Empty>;
  return <>
    {pub.map((s) => <section className="c-memory-section" key={s.id}><h2>{s.section}</h2><Markdown text={s.body} /></section>)}
    {hasPrivate && <div className="c-sealed"><span aria-hidden="true">{Icons.lock}</span><strong>State of mind · sealed</strong><p>Private counsel stays private and never appears here.</p></div>}
  </>;
}
export function Keela({ data, nav, sub, setSub }) {
  return <Page title="Your companion" nav={nav}>
    <div className="c-filters" role="group" aria-label="Companion views">
      {[{ value: 'notes', label: 'Session notes' }, { value: 'memory', label: 'Memory' }].map((x) => <button key={x.value} aria-pressed={sub === x.value} onClick={() => setSub(x.value)}>{x.label}</button>)}
    </div>
    {sub === 'notes' ? <Notes meetings={data.meetings} nav={nav} /> : <Memory memory={data.memory} />}
  </Page>;
}
export function MeetingDetail({ m, onClose }) {
  return <DetailShell onClose={onClose}><article className="c-note-article">
    <time className="c-note-date">{fmtDate(m.date)}</time><h1>{m.title}</h1><Markdown text={m.body} />
    <footer><Mark size={24} /><span>Keela</span></footer>
  </article></DetailShell>;
}
