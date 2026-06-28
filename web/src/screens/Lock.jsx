/* Keela — sign-in lock + loading gate ("Warm" language) */
import { useTheme } from '../lib/theme'
import { Mark } from '../ui/primitives'

export function Lock({ onSignIn, denied }) {
  const th = useTheme()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '0 32px 40px', textAlign: 'center', background: th.bg, position: 'relative' }}>
      <span style={{ width: 76, height: 76, borderRadius: 26, background: th.accent, display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 26, boxShadow: th.shadow }}>
        <Mark size={42} color="#fff" />
      </span>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: th.ink }}>Keela</div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: th.ink3, marginTop: 12 }}>The seeing face</div>
      <div style={{ fontSize: 15, lineHeight: 1.6, fontStyle: 'italic', color: th.ink2, marginTop: 34, maxWidth: 270, textWrap: 'pretty' }}>
        &ldquo;I keep the numbers. You keep the pact. Sign in and I&rsquo;ll show you where we stand.&rdquo;
      </div>
      <div style={{ position: 'absolute', left: 32, right: 32, bottom: 'max(40px, calc(env(safe-area-inset-bottom) + 28px))',
        display: 'flex', flexDirection: 'column', gap: 14 }}>
        {denied && (
          <div style={{ borderRadius: 14, padding: '12px 14px', background: th.accentSoft,
            fontSize: 12.5, lineHeight: 1.5, color: th.loss, fontWeight: 600 }}>
            That account isn&rsquo;t authorized. Keela is private to one account.
          </div>
        )}
        <button onClick={onSignIn} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: 15, borderRadius: 16, border: `1px solid ${th.line}`, background: th.card, color: th.ink,
          fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, border: `1px solid ${th.line}`, display: 'grid',
            placeItems: 'center', fontWeight: 800, fontSize: 12 }}>G</span>
          {denied ? 'Try another account' : 'Continue with Google'}
        </button>
        <div style={{ fontSize: 11, color: th.ink3, letterSpacing: '0.02em', lineHeight: 1.5 }}>
          One account. No password. Without it, the app shows nothing.
        </div>
      </div>
    </div>
  )
}

export function Loading() {
  const th = useTheme()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 20, background: th.bg }}>
      <Mark size={46} color={th.accent} style={{ animation: 'kpulse 1.4s ease-in-out infinite' }} />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: th.ink3 }}>Reading the numbers&hellip;</div>
      <style>{`@keyframes kpulse{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
    </div>
  )
}
