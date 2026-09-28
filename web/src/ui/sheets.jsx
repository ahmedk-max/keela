import React from "react";
import { createPortal } from "react-dom";
import { operationId } from "../data/writes";

const SheetContext = React.createContext(null);
export const useOperationId = () => React.useState(operationId)[0];
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function Sheet({ title, onClose, children }) {
  const [closing, setClosing] = React.useState(false),
    [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(""),
    [discard, setDiscard] = React.useState(false);
  const dirty = React.useRef(false),
    lock = React.useRef(false),
    exiting = React.useRef(false),
    alive = React.useRef(true);
  const timer = React.useRef(null),
    ref = React.useRef(null),
    latestClose = React.useRef(onClose),
    id = React.useId();
  latestClose.current = onClose;
  const close = React.useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      latestClose.current?.();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => latestClose.current?.(), 180);
  }, []);
  const requestClose = React.useCallback(() => {
    if (lock.current || exiting.current) return;
    if (dirty.current) {
      setDiscard(true);
      return;
    }
    close();
  }, [close]);
  React.useLayoutEffect(() => {
    alive.current = true;
    const opener = document.activeElement;
    const backgrounds = [
      ...document.querySelectorAll(".k-app,.k-detail,.k-tabbar"),
    ];
    const before = backgrounds.map((el) => el.inert);
    backgrounds.forEach((el) => {
      el.inert = true;
    });
    ref.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      backgrounds.forEach((el, i) => {
        el.inert =
          el.classList.contains("k-app") &&
          !!document.querySelector(".k-detail")
            ? true
            : before[i];
      });
      if (opener?.isConnected) opener.focus?.({ preventScroll: true });
    };
  }, []);
  React.useEffect(() => {
    const protect = (e) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, []);
  const run = async (action) => {
    if (lock.current || exiting.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setDiscard(false);
    try {
      await action();
      window.dispatchEvent(new Event("keela:saved"));
    } catch (e) {
      if (alive.current)
        setError(
          e?.code === "permission-denied"
            ? "Your session could not save this change. Sign in again, then retry."
            : e?.message ||
                "Couldn’t save. Your draft is still here. Try again.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const keydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose();
    }
    if (e.key !== "Tab") return;
    const controls = [
      ...ref.current.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]",
      ),
    ].filter((el) => el.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };
  return (
    <SheetContext.Provider value={{ run, busy, error, requestClose }}>
      {createPortal(
        <div
          className={`k-overlay${closing ? " out" : ""}`}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) requestClose();
          }}
          onKeyDown={keydown}
        >
          <section
            ref={ref}
            className="k-sheet c-sheet kscroll"
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            aria-busy={busy}
          >
            <div className="c-sheet-handle" aria-hidden="true" />
            <header className="c-sheet-header">
              <h2 id={id}>{title}</h2>
              <button
                className="c-sheet-close"
                onClick={requestClose}
                disabled={busy}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ref.current
                  ?.querySelector("[data-save]:not(:disabled)")
                  ?.click();
              }}
              onChangeCapture={() => {
                dirty.current = true;
                setDiscard(false);
              }}
              onClickCapture={(e) => {
                if (e.target.closest("[data-draft]")) dirty.current = true;
              }}
            >
              <fieldset disabled={busy}>
                {typeof children === "function" ? children(close) : children}
              </fieldset>
            </form>
            {busy && (
              <p className="c-form-note" role="status">
                Saving…
              </p>
            )}
            {error && (
              <p className="c-sheet-error" role="alert">
                {error}
              </p>
            )}
            {discard && (
              <div className="c-confirm" role="alert">
                Keep your unsaved changes?
                <div className="c-sheet-footer">
                  <button
                    className="c-button"
                    onClick={() => {
                      dirty.current = false;
                      close();
                    }}
                  >
                    Discard
                  </button>
                  <button
                    className="c-button c-primary"
                    onClick={() => setDiscard(false)}
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>,
        document.querySelector(".k-root") || document.body,
      )}
    </SheetContext.Provider>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  style,
  big,
  ...props
}) {
  const name =
    label ||
    (type === "date"
      ? "Date"
      : type === "month"
        ? "Target month"
        : placeholder || "Value");
  return (
    <label className={`c-field${big ? " amount" : ""}`}>
      <span>{name}</span>
      <input
        value={value}
        onChange={onChange}
        onInput={type === "month" || type === "date" ? onChange : undefined}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        style={style}
        {...props}
      />
    </label>
  );
}
export function SelectField({
  label,
  children,
  value,
  onChange,
  inline = false,
  disabled = false,
}) {
  return (
    <label className={`c-field${inline ? " inline" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
    </label>
  );
}
export function AmountField({ value, onChange, label = "Amount", ...props }) {
  return (
    <label className="c-field amount">
      <span>{label}</span>
      <div className="c-amount-wrap">
        <input
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          {...props}
        />
        <span>SAR</span>
      </div>
    </label>
  );
}
export function OptionalDetails({ date, setDate, note, setNote }) {
  return (
    <details className="c-form-options">
      <summary>
        {date === todayISO() ? "Today" : date} · add note or change date
      </summary>
      <Field
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Field
        label="Note · optional"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </details>
  );
}
export function SheetSave({ children, onClick, disabled = false, style }) {
  const { run, busy, error, requestClose } = React.useContext(SheetContext);
  return (
    <div className="c-sheet-footer">
      <button
        type="button"
        className="c-button"
        onClick={requestClose}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        type="button"
        data-save
        className="c-button c-primary"
        style={style}
        disabled={disabled || busy}
        onClick={() => run(onClick)}
      >
        {busy ? "Saving…" : error ? "Try again" : children}
      </button>
    </div>
  );
}
export function SheetDelete({
  children = "Delete",
  onClick,
  confirmLabel = "Confirm delete",
}) {
  const { run, busy } = React.useContext(SheetContext),
    [confirm, setConfirm] = React.useState(false);
  return confirm ? (
    <div className="c-confirm">
      <span>
        {confirmLabel === "Restore bucket"
          ? "This bucket will return to your current list with its history."
          : confirmLabel === "Archive bucket"
            ? "History will be kept. You can restore this bucket later."
            : "This removes the record. Review it before continuing."}
      </span>
      <div className="c-sheet-footer">
        <button
          type="button"
          className="c-button"
          onClick={() => setConfirm(false)}
        >
          Keep
        </button>
        <button
          type="button"
          className="c-button c-error-text"
          disabled={busy}
          onClick={() => run(onClick)}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      className="c-sheet-delete"
      disabled={busy}
      onClick={() => setConfirm(true)}
    >
      {children}
    </button>
  );
}
