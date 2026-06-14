/* Keela — sign-in lock + loading gate (ported) */
import { Mark } from '../ui/primitives'

export function Lock({ onSignIn }) {
  return (
    <div className="k-lock">
      <Mark size={64} fill="var(--qahwa-accent)" style={{ width: 64, height: 64, marginBottom: 26 }} />
      <div className="k-lock-word">Keela</div>
      <div className="k-lock-sub">The seeing face</div>
      <div className="k-lock-line">
        &ldquo;I keep the numbers. You keep the pact. Sign in and I&rsquo;ll show you where we stand.&rdquo;
      </div>
      <div className="k-lock-foot">
        <button className="k-google" onClick={onSignIn}>
          <span className="k-num" style={{ border: '1px solid var(--qahwa-border-strong)', padding: '1px 6px', fontWeight: 700, fontSize: 12 }}>G</span>
          Continue with Google
        </button>
        <div className="k-micro" style={{ textAlign: 'center', letterSpacing: '0.04em' }}>
          One account. No password. Without it, the app shows nothing.
        </div>
      </div>
    </div>
  )
}

export function Loading() {
  return (
    <div className="k-lock" style={{ gap: 22 }}>
      <Mark size={46} fill="var(--qahwa-accent)" style={{ width: 46, height: 46, animation: 'kpulse 1.4s var(--qahwa-ease) infinite' }} />
      <div className="k-lock-sub" style={{ marginTop: 0 }}>Reading the numbers&hellip;</div>
      <style>{`@keyframes kpulse{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
    </div>
  )
}
