import React from 'react';
import { fmt } from '../lib/format';
import { Sheet, Field, SheetSave, Confirmation } from '../ui/sheets';
import { operationId } from '../data/writes';
import { parseDecimal, roundMoney } from '../lib/money.mjs';

export function IncomeSettingsSheet({ profile, income, onClose, onSave, nav }) {
  const [streams, setStreams] = React.useState(income.map((s) => ({ ...s, amount: String(s.amount) })));
  const [save, setSave] = React.useState(profile.split.save), [payday, setPayday] = React.useState(String(profile.payday));
  const [signingOut, setSigningOut] = React.useState(false), [signOutBusy, setSignOutBusy] = React.useState(false), [signOutError, setSignOutError] = React.useState('');
  const signOutRef = React.useRef(null), signOutLock = React.useRef(false);
  const change = (id, k, v) => setStreams((list) => list.map((s) => s.id === id ? { ...s, [k]: v } : s));
  const valid = streams.every((s) => s.name.trim() && Number.isFinite(parseDecimal(s.amount))) && /^\d{1,2}$/.test(payday) && +payday >= 1 && +payday <= 28;
  const total = roundMoney(streams.filter((s) => s.recurring).reduce((a, s) => a + (parseDecimal(s.amount) || 0), 0));
  return <Sheet title="Settings" fullHeight onClose={onClose} draft={{ streams, save, payday }}>
    {(close) => <>
      <section className="c-settings-section">
        <h3>Appearance</h3>
        <p className="c-form-note">Choose the look that feels right for you.</p>
        <div className="c-appearance" role="group" aria-label="Appearance">
          {['light', 'dark'].map((theme) => <button type="button" className="c-appearance-option" key={theme}
            aria-pressed={nav.theme === theme} onClick={() => { if (nav.theme !== theme) nav.toggleTheme(); }}>
            <span className={`c-appearance-sample ${theme}`} aria-hidden="true"><i /><i /><i /></span>
            <span>{theme === 'light' ? 'Light' : 'Dark'}</span><span aria-hidden="true">{nav.theme === theme ? '✓' : ''}</span>
          </button>)}
        </div>
      </section>
      <section className="c-settings-section">
        <h3>Income & savings</h3>
        <p className="c-form-note">{fmt(total)} SAR recurring income per month</p>
        {streams.map((s) => <div className="c-income-row" key={s.id}>
          <div className="c-form-grid">
            <Field label="Income name" required value={s.name} disabled={s.id === 'salary'} onChange={(e) => change(s.id, 'name', e.target.value)} />
            <Field label="Amount · SAR" required inputMode="decimal" value={s.amount} onChange={(e) => change(s.id, 'amount', e.target.value)} />
          </div>
          {s.id !== 'salary' && <div className="c-setting-actions">
            <label className="c-check"><input type="checkbox" checked={s.recurring} onChange={(e) => change(s.id, 'recurring', e.target.checked)} />Recurring</label>
            <button type="button" className="c-sheet-delete" onClick={() => setStreams((list) => list.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name || 'income stream'}`}>Remove</button>
          </div>}
        </div>)}
        <button type="button" className="c-button c-text-button" onClick={() => setStreams((list) => [...list, { id: operationId(), name: '', amount: '', recurring: true }])}>+ Add income stream</button>
        <label className="c-field c-range-field"><span>Savings pact</span>
          <span className="c-range-values"><strong>Save {save}%</strong><span>Live {100 - save}%</span></span>
          <input aria-label="Savings percentage" type="range" min="5" max="95" step="5" value={save}
            style={{ '--range-progress': `${(save - 5) / 90 * 100}%` }} onChange={(e) => setSave(+e.target.value)} />
        </label>
        <Field label="Payday" hint="Day of the month, from 1 to 28." required min={1} max={28} inputMode="numeric" value={payday} onChange={(e) => setPayday(e.target.value)} />
      </section>
      <section className="c-settings-section">
        <h3>Account</h3><p className="c-form-note">{profile.name || 'Your personal account'}</p>
        <button ref={signOutRef} type="button" className="c-button" onClick={() => setSigningOut(true)}>Sign out</button>
        <details className="c-form-options"><summary>About Keela</summary><p className="c-form-note">Keela build {__BUILD_ID__} UTC</p></details>
      </section>
      <SheetSave disabled={!valid} disabledReason="Give each income stream a name and amount, and set payday between 1 and 28."
        onClick={async () => {
          await onSave({ ...profile, payday: +payday, split: { save, live: 100 - save } },
            streams.map((s) => ({ ...s, name: s.name.trim(), amount: parseDecimal(s.amount) })));
          close();
        }}>Save settings</SheetSave>
      <Confirmation open={signingOut} title="Sign out of Keela?" actionLabel="Sign out" destructive={false}
        description="You’ll need to sign in again to see your records. Any unsaved settings will be discarded."
        onCancel={() => setSigningOut(false)} returnFocus={signOutRef} busy={signOutBusy} error={signOutError}
        onConfirm={async () => {
          if (signOutLock.current) return;
          signOutLock.current = true; setSignOutBusy(true); setSignOutError('');
          try { await nav.signOut(); close(); }
          catch { setSignOutError('Couldn’t sign out. Try again.'); }
          finally { signOutLock.current = false; setSignOutBusy(false); }
        }} />
    </>}
  </Sheet>;
}
