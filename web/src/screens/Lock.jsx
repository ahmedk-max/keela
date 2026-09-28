import React from 'react';
import { Mark } from '../ui/primitives';

export function Lock({ onSignIn, denied }) {
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState('');
  const lock = React.useRef(false);
  return <div className="c-lock">
    <div className="c-lock-brand"><Mark size={48} /><h1>Keela</h1><p>The seeing face</p></div>
    <p className="c-lock-quote">“I keep the numbers. You keep the pact.”</p>
    <div className="c-lock-actions">
      <p className="c-muted">Your financial life, thoughtfully kept.</p>
      {(denied || error) && <p className="c-sheet-error" role="alert">{denied ? 'This account isn’t authorized. Sign in with your personal account.' : error}</p>}
      <button className="c-button c-primary" disabled={busy} onClick={async () => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError('');
        try { await onSignIn(); }
        catch { setError('Sign-in didn’t finish. Please try again.'); }
        finally { lock.current = false; setBusy(false); }
      }}>{busy && <span className="c-spinner" aria-hidden="true" />}{busy ? 'Signing in…' : denied ? 'Try another account' : 'Continue with Google'}</button>
      <span className="c-form-note">Only your authorized account can access Keela.</span>
    </div>
  </div>;
}
export function Loading() {
  return <div className="c-state-page" role="status" aria-label="Loading your records">
    <Mark size={40} color="var(--c-accent)" /><h1>Reading the numbers</h1><p className="c-muted">Your records will be ready in a moment.</p>
    <div className="c-loading-lines" aria-hidden="true"><i /><i /><i /></div>
  </div>;
}
