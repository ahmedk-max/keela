import React from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { motion } from 'framer-motion';
import { operationId } from '../data/writes';
import { parseDecimal, validDate } from '../lib/money.mjs';
import { useTransition } from './motion';
import { useVisibleViewport } from './viewport';

const SheetContext = React.createContext(null);
export const useOperationId = () => React.useState(operationId)[0];
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const portalRoot = () => document.querySelector('#k-overlays') || document.querySelector('.k-root') || document.body;
const messageFor = (e) => e?.code === 'permission-denied'
  ? 'Your session could not save this change. Sign in again, then retry.'
  : e?.message || 'Couldn’t save. Your draft is still here. Try again.';

export function SheetHeader({ title, description, onClose, busy, fullHeight }) {
  return <header className="c-sheet-header">
    <div><Dialog.Title className="c-sheet-title" tabIndex={-1}>{title}</Dialog.Title>
      {description && <Dialog.Description id="sheet-description" className="c-form-note">{description}</Dialog.Description>}</div>
    <button type="button" className="c-icon-button c-sheet-close" onClick={onClose} disabled={busy}
      aria-label={fullHeight ? 'Close settings' : 'Close dialog'}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
  </header>;
}
export function SheetBody({ children }) {
  return <div className="c-sheet-body kscroll">{children}</div>;
}
export function SheetFooter({ children }) {
  return <div className="c-sheet-footer">{children}</div>;
}

// The form remains mounted beneath a confirmation. Its state and scroll position
// survive Keep editing, a rejected write, or a reconnect.
export function Confirmation({ open, title, description, actionLabel, cancelLabel = 'Cancel',
  onCancel, onConfirm, busy = false, error = '', returnFocus, destructive = true }) {
  const { transition, reduced } = useTransition('fade');
  const viewport = useVisibleViewport();
  const [present, setPresent] = React.useState(open);
  React.useEffect(() => {
    if (open) setPresent(true);
    else if (reduced) setPresent(false);
  }, [open, reduced]);
  return <AlertDialog.Root open={present} onOpenChange={(next) => { if (!next && open && !busy) onCancel(); }}>
    <AlertDialog.Portal container={portalRoot()}>
      <AlertDialog.Overlay asChild><motion.div className="c-confirm-overlay" style={viewport}
        initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: open ? 1 : 0 }} transition={transition} /></AlertDialog.Overlay>
      <AlertDialog.Content asChild aria-busy={busy}
        onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }}
        onCloseAutoFocus={(e) => {
          if (returnFocus?.current?.isConnected) { e.preventDefault(); returnFocus.current.focus({ preventScroll: true }); }
        }}>
        <motion.div className="c-confirm-dialog" style={viewport} data-closing={!open || undefined}
          initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: open ? 1 : 0, y: open || reduced ? 0 : 8 }} transition={transition}
          onAnimationComplete={() => { if (!open) setPresent(false); }}>
          <AlertDialog.Title className="c-sheet-title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="c-confirm-description">{description}</AlertDialog.Description>
          {error && <p className="c-sheet-error" role="alert">{error}</p>}
          <div className="c-confirm-actions">
            <AlertDialog.Cancel asChild><button className="c-button" disabled={busy}>{cancelLabel}</button></AlertDialog.Cancel>
            <button className={`c-button ${destructive ? 'c-danger' : 'c-primary'}`} disabled={busy} onClick={onConfirm}>
              {busy ? 'Working…' : actionLabel}
            </button>
          </div>
        </motion.div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}

export function Sheet({ title, description, onClose, children, draft, fullHeight = false }) {
  const [closing, setClosing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [discard, setDiscard] = React.useState(false);
  const [footer, setFooter] = React.useState(null);
  const [online, setOnline] = React.useState(() => navigator.onLine);
  const ref = React.useRef(null), opener = React.useRef(document.activeElement), fieldFocus = React.useRef(null);
  const lock = React.useRef(false), exiting = React.useRef(false), alive = React.useRef(true);
  const pendingClose = React.useRef(null), latestClose = React.useRef(onClose);
  const initial = React.useRef(JSON.stringify(draft));
  const dirty = React.useRef(false);
  dirty.current = !closing && JSON.stringify(draft) !== initial.current;
  latestClose.current = onClose;
  const { reduced, transition } = useTransition();
  const viewport = useVisibleViewport();
  const finish = React.useCallback(() => {
    if (!alive.current || !exiting.current) return;
    exiting.current = false;
    latestClose.current?.();
    pendingClose.current?.();
  }, []);
  const close = React.useCallback((after) => {
    if (exiting.current) return;
    exiting.current = true;
    dirty.current = false;
    pendingClose.current = typeof after === 'function' ? after : null;
    setDiscard(false);
    setClosing(true);
  }, []);
  // Reduced motion does not depend on an animation event ever firing.
  React.useEffect(() => { if (closing && reduced) finish(); }, [closing, reduced, finish]);
  const requestClose = React.useCallback(() => {
    if (lock.current || exiting.current) return;
    if (dirty.current) setDiscard(true);
    else close();
  }, [close]);
  React.useEffect(() => {
    alive.current = true;
    const connectivity = () => setOnline(navigator.onLine);
    const protect = (e) => { if (dirty.current || lock.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    window.addEventListener('beforeunload', protect);
    return () => {
      alive.current = false;
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      window.removeEventListener('beforeunload', protect);
    };
  }, []);
  const run = async (action) => {
    if (lock.current || exiting.current || !navigator.onLine) return false;
    lock.current = true;
    setBusy(true); setError(''); setDiscard(false);
    try {
      await action();
      window.dispatchEvent(new Event('keela:saved'));
      return true;
    } catch (e) {
      if (alive.current) setError(messageFor(e));
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return <SheetContext.Provider value={{ run, busy, error, requestClose, close, footer, online, dirty: dirty.current }}>
    <Dialog.Root open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <Dialog.Portal forceMount container={portalRoot()}>
        <Dialog.Overlay asChild forceMount>
          <motion.div className="c-sheet-overlay" style={viewport} initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: closing ? 0 : 1 }} transition={transition} />
        </Dialog.Overlay>
        <Dialog.Content asChild forceMount aria-describedby={description ? 'sheet-description' : undefined}
          onOpenAutoFocus={(e) => { e.preventDefault(); ref.current?.querySelector('.c-sheet-title')?.focus({ preventScroll: true }); }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            // A creation may have opened a new detail; never return to an inert screen.
            const target = opener.current;
            if (target?.isConnected && !target.closest('[inert]')) target.focus?.({ preventScroll: true });
          }}
          onEscapeKeyDown={(e) => { e.preventDefault(); if (!discard) requestClose(); }}
          onPointerDownOutside={(e) => { e.preventDefault(); if (!discard) requestClose(); }}>
          <motion.section ref={ref} className={`c-sheet${fullHeight ? ' c-sheet-full' : ''}`} style={viewport}
            aria-busy={busy} data-closing={closing || undefined}
            initial={reduced ? false : { y: '100%' }} animate={{ y: closing && !reduced ? '100%' : 0 }}
            transition={transition} onAnimationComplete={() => { if (closing) finish(); }}
            onFocusCapture={(e) => { if (e.target.matches('input,select,textarea,[data-draft]')) fieldFocus.current = e.target; }}>
            <SheetHeader title={title} description={description} onClose={requestClose} busy={busy} fullHeight={fullHeight} />
            <form className="c-sheet-form" noValidate onSubmit={(e) => {
              e.preventDefault(); ref.current?.querySelector('[data-save]:not(:disabled)')?.click();
            }}>
              <SheetBody><fieldset disabled={busy}>{typeof children === 'function' ? children(close) : children}</fieldset></SheetBody>
              <div ref={setFooter} className="c-sheet-footer-host" />
            </form>
          </motion.section>
        </Dialog.Content>
      </Dialog.Portal>
      <Confirmation open={discard} title="Discard changes?"
        description="Your changes haven’t been saved. Keep editing to finish, or discard this draft."
        actionLabel="Discard changes" cancelLabel="Keep editing" onCancel={() => setDiscard(false)} onConfirm={() => close()} returnFocus={fieldFocus} />
    </Dialog.Root>
  </SheetContext.Provider>;
}

function fieldMessage({ value, required, type, inputMode, precision = 2, min, max }) {
  if (!String(value ?? '').trim()) return required ? 'This field is required.' : '';
  if (type === 'date' && !validDate(value)) return 'Choose a valid date.';
  if (type === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return 'Choose a valid month.';
  if (inputMode === 'decimal' || inputMode === 'numeric') {
    const n = inputMode === 'numeric'
      ? (/^\d+$/.test(String(value).trim()) ? Number(value) : NaN)
      : parseDecimal(value, precision);
    if (!Number.isFinite(n)) return inputMode === 'numeric' ? 'Enter a whole number.' : `Use a positive number with up to ${precision} decimal places.`;
    if (min != null && n < min) return `Enter ${min} or more.`;
    if (max != null && n > max) return `Enter ${max} or less.`;
  }
  return '';
}
export function Field({ label, value, onChange, placeholder, type = 'text', inputMode, style, big, hint, error,
  required = false, precision = 2, min, max, ...props }) {
  const id = React.useId(), [touched, setTouched] = React.useState(false);
  const name = label || (type === 'date' ? 'Date' : type === 'month' ? 'Target month' : placeholder || 'Value');
  const validation = fieldMessage({ value, required, type, inputMode, precision, min, max });
  const issue = error || ((touched || String(value ?? '').length > 0) ? validation : '');
  return <div className={`c-field${big ? ' amount' : ''}`}>
    <label htmlFor={id}>{name}{required && <span className="c-required" aria-hidden="true"> *</span>}</label>
    <input id={id} value={value} onChange={onChange} onInput={type === 'month' || type === 'date' ? onChange : undefined}
      onBlur={() => setTouched(true)} placeholder={placeholder} type={type} inputMode={inputMode}
      style={style} aria-required={required || undefined} aria-invalid={!!issue} aria-describedby={issue || hint ? `${id}-help` : undefined} {...props} />
    {(issue || hint) && <span id={`${id}-help`} className={issue ? 'c-field-error' : 'c-field-hint'}>{issue || hint}</span>}
  </div>;
}
export function SelectField({ label, children, value, onChange, inline = false, disabled = false, hint }) {
  const id = React.useId();
  return <div className={`c-field${inline ? ' inline' : ''}`}>
    <label htmlFor={id}>{label}</label><select id={id} value={value} onChange={onChange} disabled={disabled}
      aria-describedby={hint ? `${id}-help` : undefined}>{children}</select>
    {hint && <span id={`${id}-help`} className="c-field-hint">{hint}</span>}
  </div>;
}
export function AmountField({ value, onChange, label = 'Amount', error, optional = false, ...props }) {
  return <div className="c-currency-field">
    <Field label={label} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal"
      placeholder="0.00" big required={!optional} min={optional ? 0 : 0.01} error={error} {...props} />
    <span className="c-currency" aria-hidden="true">SAR</span>
  </div>;
}
export function OptionalDetails({ date, setDate, note, setNote }) {
  return <details className="c-form-options">
    <summary><span>{date === todayISO() ? 'Today' : date}</span><span className="c-muted">Date & note</span></summary>
    <Field label="Date" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
    <Field label="Note · optional" value={note} onChange={(e) => setNote(e.target.value)} />
  </details>;
}
export function SheetSave({ children, onClick, disabled = false, disabledReason = 'Complete the required fields to continue.', style }) {
  const { run, busy, error, requestClose, footer, online } = React.useContext(SheetContext);
  const id = React.useId();
  if (!footer) return null;
  const reason = !online ? 'You’re offline. Reconnect to save; your draft will stay here.' : disabled ? disabledReason : '';
  return createPortal(<SheetFooter>
    {error && <p className="c-sheet-error" role="alert">{error}</p>}
    {reason && <p className="c-form-note" id={id}>{reason}</p>}
    <div className="c-sheet-actions">
      <button type="button" className="c-button" onClick={requestClose} disabled={busy}>Cancel</button>
      <button type="button" data-save className="c-button c-primary" style={style}
        disabled={disabled || busy || !online} aria-describedby={reason ? id : undefined} onClick={() => run(onClick)}>
        {busy && <span className="c-spinner" aria-hidden="true" />}{busy ? 'Saving…' : error ? 'Try again' : children}
      </button>
    </div>
    <span className="sr-only" role="status">{busy ? 'Saving your changes' : ''}</span>
  </SheetFooter>, footer);
}
export function SheetDelete({ children = 'Delete', onClick, confirmLabel = 'Delete record', disabled = false, description }) {
  const { run, busy, error, online } = React.useContext(SheetContext), [confirm, setConfirm] = React.useState(false);
  const trigger = React.useRef(null);
  const archive = confirmLabel === 'Archive bucket', restore = confirmLabel === 'Restore bucket';
  return <div className="c-destructive-zone">
    <button ref={trigger} type="button" className="c-sheet-delete" disabled={disabled || busy || !online} onClick={() => setConfirm(true)}>{children}</button>
    <Confirmation open={confirm} title={`${confirmLabel}?`} actionLabel={confirmLabel}
      description={description || (restore ? 'This bucket will return to your current list with its history.' : archive
        ? 'History will be kept. You can restore this bucket later.' : 'This record will be permanently removed. This cannot be undone.')}
      onCancel={() => setConfirm(false)} onConfirm={async () => { if (await run(onClick)) setConfirm(false); }}
      busy={busy} error={error} returnFocus={trigger} destructive={!restore && !archive} />
  </div>;
}
