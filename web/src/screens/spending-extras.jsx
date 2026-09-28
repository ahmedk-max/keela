/* Keela — Spending extras: month-over-month stats derivation + the add/edit
   sheets (transaction, recurring bill, upcoming, wishlist, per-category budget).
   "Warm" soft-rounded language; inline-styled from `th`, mirrors home-extras.jsx. */
import React from "react";
import { useTheme, tint } from "../lib/theme";
import { fmt } from "../lib/format";
import { CAT, getCat } from "../lib/icons";
import {
  Sheet,
  Field,
  SheetSave,
  SheetDelete,
  AmountField,
  SelectField,
  OptionalDetails,
  useOperationId,
} from "../ui/sheets";
import { parseDecimal, validDate, roundMoney } from "../lib/money.mjs";

const CATEGORIES = [
  "Food",
  "Groceries",
  "Transport",
  "Shopping",
  "Travel",
  "Entertainment",
  "Health",
  "Personal",
  "Gifts",
  "Bills",
  "Other",
];

/* ---------- date helpers (ISO YYYY-MM-DD) ---------- */
const D = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const isoOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const addMonths = (iso, n) => {
  const dt = D(iso);
  dt.setMonth(dt.getMonth() + n);
  return isoOf(dt);
};
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000);
const TODAY = isoOf(new Date());

function cumulative(txns, startIso, len) {
  const arr = new Array(len).fill(0);
  for (const t of txns) {
    const i = daysBetween(startIso, t.date);
    if (i >= 0 && i < len) arr[i] += t.amount;
  }
  for (let i = 1; i < len; i++) arr[i] += arr[i - 1];
  return arr;
}

/* Month-over-month spending stats. Colours stay as hex from CAT so the donut /
   category bars read identically in light + dark (CAT hues are mid-tone). */
export function spendStats(data) {
  const { txns, cashflow } = data;
  const { cycleStart, cycleEnd, variableBudget } = cashflow;
  const prevStart = addMonths(cycleStart, -1);
  const len = Math.max(1, daysBetween(cycleStart, cycleEnd));
  const prevLen = Math.max(1, daysBetween(prevStart, cycleStart));

  const cur = txns.filter((t) => t.date >= cycleStart && t.date < cycleEnd);
  const prev = txns.filter((t) => t.date >= prevStart && t.date < cycleStart);

  const curTotal = roundMoney(cur.reduce((s, t) => s + t.amount, 0));
  const prevTotal = roundMoney(prev.reduce((s, t) => s + t.amount, 0));

  const elapsed = Math.min(
    len,
    Math.max(1, daysBetween(cycleStart, TODAY) + 1),
  );

  const curCum = cumulative(cur, cycleStart, len);
  const prevCum = cumulative(prev, prevStart, Math.max(len, prevLen));

  // per-day (non-cumulative) spend for the current cycle — drives the bars
  const curDaily = new Array(len).fill(0);
  for (const t of cur) {
    const i = daysBetween(cycleStart, t.date);
    if (i >= 0 && i < len) curDaily[i] += t.amount;
  }
  const prevAtNow = prevCum[Math.min(elapsed - 1, prevCum.length - 1)] || 0;
  const paceVal = (curCum[elapsed - 1] || 0) - prevAtNow; // + = spending faster than last cycle

  const dailyAvg = curTotal / elapsed;
  const projected = Math.round(dailyAvg * len);

  // category breakdown (current cycle), top 5 + Other; carry icon for the donut badges
  const map = {};
  for (const t of cur) map[t.cat] = (map[t.cat] || 0) + t.amount;
  const meta = (name) => getCat(name) || CAT.Other;
  let cats = Object.entries(map)
    .map(([cat, amount]) => ({
      cat,
      amount: roundMoney(amount),
      color: meta(cat).color,
      icon: meta(cat).icon,
    }))
    .sort((a, b) => b.amount - a.amount);
  if (cats.length > 6) {
    const rest = cats.slice(5).reduce((s, c) => s + c.amount, 0);
    cats = [
      ...cats.slice(0, 5),
      {
        cat: "Other",
        amount: rest,
        color: CAT.Other.color,
        icon: CAT.Other.icon,
      },
    ];
  }

  return {
    curTotal,
    prevTotal,
    budget: variableBudget,
    len,
    elapsed,
    cycleStart,
    cycleEnd,
    curCum,
    prevCum,
    curDaily: curDaily.map(roundMoney),
    prevAtNow,
    paceVal,
    dailyAvg,
    projected,
    cats,
    daysLeft: Math.max(0, len - elapsed),
  };
}

export function TxSheet({ tx, txns, onClose, onSave, onDelete }) {
  const op = useOperationId();
  const [amount, setAmount] = React.useState(tx ? String(tx.amount) : ""),
    [name, setName] = React.useState(tx?.name || "");
  const [cat, setCat] = React.useState(tx?.cat || "Food"),
    [date, setDate] = React.useState(tx?.date || TODAY),
    [note, setNote] = React.useState(tx?.note || "");
  const valid = parseDecimal(amount) > 0 && name.trim() && validDate(date);
  return (
    <Sheet title={tx ? "Edit expense" : "Add expense"} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field
            label="Paid to / what for"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tamimi Markets"
          />
          <SelectField
            label="Category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {[...new Set([cat, ...CATEGORIES])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <OptionalDetails
            date={date}
            setDate={setDate}
            note={note}
            setNote={setNote}
          />
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave({
                operationId: op,
                name: name.trim(),
                amount: parseDecimal(amount),
                cat,
                date,
                note: note.trim(),
              });
              close();
            }}
          >
            {tx ? "Save changes" : "Add expense"}
          </SheetSave>
          {tx && (
            <SheetDelete
              onClick={async () => {
                await onDelete(tx.id);
                close();
              }}
            />
          )}
        </>
      )}
    </Sheet>
  );
}
export function BillSheet({ bill, onClose, onSave, onDelete }) {
  const op = useOperationId(),
    [name, setName] = React.useState(bill?.name || ""),
    [amount, setAmount] = React.useState(bill ? String(bill.amount) : "");
  const [category, setCategory] = React.useState(bill?.cat || "Bills"),
    [type, setType] = React.useState(bill?.type || "monthly"),
    [sub, setSub] = React.useState(!!bill?.sub),
    [day, setDay] = React.useState(bill?.day ? String(bill.day) : "");
  const valid =
    name.trim() &&
    parseDecimal(amount) > 0 &&
    (!day || (/^\d{1,2}$/.test(day) && +day >= 1 && +day <= 31));
  return (
    <Sheet title={bill ? "Edit recurring" : "Add recurring"} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field
            label="Name"
            placeholder="e.g. Netflix"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="c-form-grid">
            <SelectField
              label="Frequency"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </SelectField>
            <Field
              label="Billing day · optional"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              inputMode="numeric"
              placeholder="1–31"
            />
          </div>
          <details className="c-form-options">
            <summary>Category & subscription</summary>
            <Field
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <label className="c-check">
              <input
                type="checkbox"
                checked={sub}
                onChange={(e) => setSub(e.target.checked)}
              />
              Subscription
            </label>
          </details>
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave({
                operationId: op,
                name: name.trim(),
                amount: parseDecimal(amount),
                category: category.trim() || "Bills",
                type,
                sub,
                billingDay: day ? +day : null,
              });
              close();
            }}
          >
            {bill ? "Save changes" : "Add recurring"}
          </SheetSave>
          {bill && (
            <SheetDelete
              onClick={async () => {
                await onDelete(bill.id);
                close();
              }}
            />
          )}
        </>
      )}
    </Sheet>
  );
}
export function UpcomingSheet({ item, onClose, onSave, onDelete }) {
  const op = useOperationId(),
    [name, setName] = React.useState(item?.name || ""),
    [amount, setAmount] = React.useState(item ? String(item.amount) : ""),
    [dueDate, setDate] = React.useState(item?.date || TODAY);
  return (
    <Sheet title={item ? "Edit upcoming" : "Plan an expense"} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDate(e.target.value)}
          />
          <SheetSave
            disabled={
              !(name.trim() && parseDecimal(amount) > 0 && validDate(dueDate))
            }
            onClick={async () => {
              await onSave({
                operationId: op,
                name: name.trim(),
                amount: parseDecimal(amount),
                dueDate,
                category: item?.category || "other",
              });
              close();
            }}
          >
            {item ? "Save changes" : "Add upcoming"}
          </SheetSave>
          {item && (
            <SheetDelete
              onClick={async () => {
                await onDelete(item.id);
                close();
              }}
            />
          )}
        </>
      )}
    </Sheet>
  );
}
export function WishlistSheet({ item, onClose, onSave, onDelete }) {
  const op = useOperationId(),
    [name, setName] = React.useState(item?.name || ""),
    [amount, setAmount] = React.useState(item ? String(item.amount) : "");
  return (
    <Sheet title={item ? "Edit wish" : "Add a wish"} onClose={onClose}>
      {(close) => (
        <>
          <AmountField value={amount} onChange={setAmount} />
          <Field
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SheetSave
            disabled={!(name.trim() && parseDecimal(amount) > 0)}
            onClick={async () => {
              await onSave({
                operationId: op,
                name: name.trim(),
                amount: parseDecimal(amount),
              });
              close();
            }}
          >
            {item ? "Save changes" : "Add to wishlist"}
          </SheetSave>
          {item && (
            <SheetDelete
              onClick={async () => {
                await onDelete(item.id);
                close();
              }}
            />
          )}
        </>
      )}
    </Sheet>
  );
}
export function CategoryBudgetSheet({ cat, cap, onClose, onSave }) {
  const [amount, setAmount] = React.useState(cap ? String(cap) : "");
  const num = amount === "" ? 0 : parseDecimal(amount);
  return (
    <Sheet title={`${cat} budget`} onClose={onClose}>
      {(close) => (
        <>
          <AmountField
            label="Per payday cycle"
            value={amount}
            onChange={setAmount}
          />
          <p className="c-form-note">
            Leave empty to remove this category limit.
          </p>
          <SheetSave
            disabled={!Number.isFinite(num)}
            onClick={async () => {
              await onSave(cat, num);
              close();
            }}
          >
            Save budget
          </SheetSave>
        </>
      )}
    </Sheet>
  );
}
