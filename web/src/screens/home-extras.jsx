import React from "react";
import { fmt } from "../lib/format";
import { Sheet, Field, SheetSave } from "../ui/sheets";
import { operationId } from "../data/writes";
import { parseDecimal, roundMoney } from "../lib/money.mjs";
export function IncomeSettingsSheet({ profile, income, onClose, onSave, nav }) {
  const [streams, setStreams] = React.useState(
    income.map((s) => ({ ...s, amount: String(s.amount) })),
  );
  const [save, setSave] = React.useState(profile.split.save),
    [payday, setPayday] = React.useState(String(profile.payday));
  const change = (id, k, v) =>
    setStreams((list) => list.map((s) => (s.id === id ? { ...s, [k]: v } : s)));
  const valid =
    streams.every(
      (s) => s.name.trim() && Number.isFinite(parseDecimal(s.amount)),
    ) &&
    /^\d{1,2}$/.test(payday) &&
    +payday >= 1 &&
    +payday <= 28;
  const total = roundMoney(
    streams
      .filter((s) => s.recurring)
      .reduce((a, s) => a + (parseDecimal(s.amount) || 0), 0),
  );
  return (
    <Sheet title="Settings" onClose={onClose}>
      {(close) => (
        <>
          <div className="c-setting-actions">
            <button
              type="button"
              className="c-button"
              onClick={nav.toggleTheme}
            >
              {nav.theme === "dark" ? "☀ Light theme" : "☾ Dark theme"}
            </button>
            <button
              type="button"
              className="c-button"
              onClick={async () => {
                close();
                await nav.signOut();
              }}
            >
              Sign out
            </button>
          </div>
          <details className="c-form-options">
            <summary>Income & savings pact · {save}% saved</summary>
            <p className="c-form-note">
              Recurring income: {fmt(total)} SAR / month
            </p>
            {streams.map((s) => (
              <div className="c-income-row" key={s.id}>
                <div className="c-form-grid">
                  <Field
                    label="Income name"
                    value={s.name}
                    disabled={s.id === "salary"}
                    onChange={(e) => change(s.id, "name", e.target.value)}
                  />
                  <Field
                    label="Amount · SAR"
                    inputMode="decimal"
                    value={s.amount}
                    onChange={(e) => change(s.id, "amount", e.target.value)}
                  />
                </div>
                {s.id !== "salary" && (
                  <div className="c-setting-actions">
                    <label className="c-check">
                      <input
                        type="checkbox"
                        checked={s.recurring}
                        onChange={(e) =>
                          change(s.id, "recurring", e.target.checked)
                        }
                      />
                      Recurring
                    </label>
                    <button
                      type="button"
                      data-draft
                      className="c-sheet-delete"
                      onClick={() =>
                        setStreams((list) => list.filter((x) => x.id !== s.id))
                      }
                    >
                      Remove {s.name || "stream"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              data-draft
              className="c-button c-text-button"
              onClick={() =>
                setStreams((list) => [
                  ...list,
                  { id: operationId(), name: "", amount: "", recurring: true },
                ])
              }
            >
              + Add income stream
            </button>
            <label className="c-field">
              <span>
                Save {save}% · live {100 - save}%
              </span>
              <input
                aria-label="Savings percentage"
                type="range"
                min="5"
                max="95"
                step="5"
                value={save}
                onChange={(e) => setSave(+e.target.value)}
              />
            </label>
            <Field
              label="Payday · day 1–28"
              inputMode="numeric"
              value={payday}
              onChange={(e) => setPayday(e.target.value)}
            />
            <SheetSave
              disabled={!valid}
              onClick={async () => {
                await onSave(
                  {
                    ...profile,
                    payday: +payday,
                    split: { save, live: 100 - save },
                  },
                  streams.map((s) => ({
                    ...s,
                    name: s.name.trim(),
                    amount: parseDecimal(s.amount),
                  })),
                );
                close();
              }}
            >
              Save settings
            </SheetSave>
          </details>
          <p className="c-form-note" style={{ marginTop: 18 }}>
            {profile.name} · Keela build {__BUILD_ID__} UTC
          </p>
        </>
      )}
    </Sheet>
  );
}
