import React from "react";
import { useTheme, SWATCHES } from "../lib/theme";
import { fmt, fmtDate } from "../lib/format";
import {
  bucketPhase,
  parseDecimal,
  validDate,
  roundMoney,
} from "../lib/money.mjs";
import { DetailShell, Empty } from "../ui/primitives";
import {
  Sheet,
  Field,
  SelectField,
  AmountField,
  OptionalDetails,
  SheetSave,
  SheetDelete,
  useOperationId,
  todayISO,
} from "../ui/sheets";
import {
  Page,
  Hero,
  Section,
  Action,
  Money,
  MetricRing,
  SplitBar,
  Legend,
  Contribution,
  BucketRow,
  LineChart,
  balanceOf,
  cycleAmount,
  cycleLabel,
  monthlyPlan,
  phaseLabel,
} from "../ui/compact";
import { entryMeta } from "../lib/icons";
import { balanceSeries } from "./bucket-extras";

export function Colours({ value, onChange }) {
  const palette = SWATCHES.includes(value) ? SWATCHES : [value, ...SWATCHES];
  return (
    <div className="c-swatches" role="group" aria-label="Colour">
      {palette.map((c) => (
        <button
          type="button"
          key={c}
          data-draft
          aria-label={`Colour ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
        >
          <i style={{ background: c }} />
        </button>
      ))}
    </div>
  );
}
export function ContributionPlan({ data, onClose }) {
  const budget = (data.cashflow.income * data.cashflow.target) / 100;
  const list = data.goals.filter((g) => monthlyPlan(g, data.cashflow) > 0);
  return (
    <Sheet title="Monthly contribution plan" onClose={onClose}>
      <p className="c-form-note">Save budget · {fmt(budget)} SAR</p>
      {list.map((g) => (
        <div className="c-row" key={g.id}>
          <div className="c-row-content">
            {g.name}
            <div className="c-meta">
              {fmt(cycleAmount(g, data.cashflow, "deposit"))} contributed this
              cycle
            </div>
          </div>
          <Money value={monthlyPlan(g, data.cashflow)} />
        </div>
      ))}
      {!list.length && (
        <p className="c-form-note">
          Set a monthly contribution in a bucket’s options to start your plan.
        </p>
      )}
      <p className="c-form-note">
        Edit a bucket to adjust its monthly contribution. Automatic plans use
        its target, deadline and balance at the start of the cycle.
      </p>
    </Sheet>
  );
}
export function Buckets({ data, nav, sub, setSub }) {
  const th = useTheme(),
    [plan, setPlan] = React.useState(false);
  const current = data.goals.filter((g) => !g.archived),
    total = current.reduce((s, g) => s + balanceOf(g), 0);
  const shown = data.goals.filter((g) =>
    sub === "archived"
      ? g.archived
      : !g.archived &&
        (sub === "all" ||
          (sub === "saving"
            ? ["saving", "ready"].includes(bucketPhase(g))
            : bucketPhase(g) === sub)),
  );
  const pinned = shown.filter((g) => g.pinned),
    others = shown.filter((g) => !g.pinned);
  const rows = (list, title) =>
    list.length > 0 && (
      <Section title={title} detail={String(list.length)}>
        {list.map((g) => (
          <BucketRow key={g.id} g={g} data={data} nav={nav} />
        ))}
      </Section>
    );
  return (
    <Page
      title="Buckets"
      subtitle={cycleLabel(data.cashflow)}
      action={
        <Action primary onClick={nav.addBucket}>
          + New
        </Action>
      }
    >
      <Hero label={`Held across ${current.length} buckets`} amount={total}>
        <SplitBar
          items={current
            .filter((g) => balanceOf(g) > 0)
            .map((g) => ({
              label: g.name,
              value: balanceOf(g),
              color: g.color,
            }))}
        />
        <div className="c-meta">
          <span>Saving, ready & in use</span>
          <span>All your plans</span>
        </div>
      </Hero>
      <Contribution data={data} onPlan={() => setPlan(true)} />
      <div className="c-filters" aria-label="Filter buckets">
        {[
          ["all", "All"],
          ["saving", "Saving"],
          ["inuse", "In use"],
        ].map(([v, l]) => (
          <button key={v} aria-pressed={sub === v} onClick={() => setSub(v)}>
            {l}
          </button>
        ))}
      </div>
      {sub === "inuse" && (
        <div className="c-note">
          <Money
            value={shown.reduce(
              (s, g) => s + cycleAmount(g, data.cashflow, "spend"),
              0,
            )}
          />{" "}
          SAR spent from these buckets this cycle.
          <br />
          <Money value={shown.reduce((s, g) => s + balanceOf(g), 0)} /> SAR
          remains available.
        </div>
      )}
      {rows(pinned, "Pinned")}
      {rows(
        others,
        sub === "archived"
          ? "Archived"
          : pinned.length
            ? "Other buckets"
            : "Buckets",
      )}
      {!shown.length && (
        <Empty>
          {sub === "archived"
            ? "No archived buckets."
            : "No buckets in this view. Create one to get started."}
        </Empty>
      )}
      <Action
        small
        onClick={() => setSub(sub === "archived" ? "all" : "archived")}
      >
        {sub === "archived" ? "Show current buckets" : "Archived"}
      </Action>
      {plan && <ContributionPlan data={data} onClose={() => setPlan(false)} />}
    </Page>
  );
}
export function BucketDetail({ g, data, onClose, onMove, onEdit, onSwitch }) {
  const th = useTheme(),
    [switching, setSwitching] = React.useState(false),
    phase = bucketPhase(g),
    balance = balanceOf(g),
    inuse = phase === "inuse";
  const pct = inuse
    ? g.allocated
      ? (balance / g.allocated) * 100
      : 0
    : g.target
      ? (balance / g.target) * 100
      : 0;
  const series = balanceSeries(g),
    cf = data.cashflow;
  return (
    <DetailShell
      onClose={onClose}
      right={
        <Action small onClick={() => onEdit(g.id)}>
          Options
        </Action>
      }
    >
      <button
        className="c-row-main"
        aria-label="Switch bucket"
        onClick={() => setSwitching(true)}
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 12,
          minHeight: 36,
        }}
      >
        <h1 style={{ margin: 0 }}>{g.name}</h1>
        <span aria-hidden="true">⌄</span>
      </button>
      <Hero
        label={inuse ? "Left to spend" : "Available balance"}
        amount={balance}
        subtitle={`${phaseLabel[phase]} · target ${fmt(g.target)}`}
        ring={
          <MetricRing
            pct={pct}
            caption={inuse ? "left" : "funded"}
            dark
            color={inuse ? th.green : g.color}
          />
        }
      />
      {!g.archived ? (
        <div className="c-actions">
          <Action primary onClick={() => onMove(g.id, "deposit")}>
            + Deposit
          </Action>
          <Action
            disabled={balance <= 0}
            onClick={() => onMove(g.id, "withdrawal")}
          >
            ↗ Withdraw
          </Action>
          <Action disabled={balance <= 0} onClick={() => onMove(g.id, "spend")}>
            Spend
          </Action>
        </div>
      ) : (
        <Action onClick={() => onEdit(g.id)}>Restore bucket</Action>
      )}
      {!g.archived && balance <= 0 && (
        <p className="c-form-note">
          Deposit first to enable withdrawals and spending.
        </p>
      )}
      <Section title="This cycle" detail="SAR">
        <Legend
          items={[
            {
              label: "Contributed",
              value: cycleAmount(g, cf, "deposit"),
              color: th.accent,
            },
            {
              label: "Spent",
              value: cycleAmount(g, cf, "spend"),
              color: th.amber,
            },
          ]}
        />
        <div className="c-stat-row">
          <div>
            Planned / month
            <strong>
              <Money value={monthlyPlan(g, cf)} />
            </strong>
          </div>
          <div>
            Target month<strong>{g.targetDate}</strong>
          </div>
        </div>
      </Section>
      {series.vals.length > 1 && (
        <Section title="Balance over time" detail="SAR">
          <LineChart
            values={series.vals}
            labels={["Opening", "Now"]}
            color={g.color}
          />
        </Section>
      )}
      <Section title="Activity" detail="SAR">
        {g.entries.length ? (
          g.entries.map((e, i) => {
            const meta = entryMeta(e.type, th);
            return (
              <div className="c-row" key={e.id || i}>
                <span className="c-tile" style={{ color: meta.color }}>
                  {meta.icon}
                </span>
                <div className="c-row-content">
                  <div className="c-row-title">
                    <span>{meta.label}</span>
                    <Money value={(e.type === "deposit" ? 1 : -1) * e.amount} />
                  </div>
                  <div className="c-meta">
                    <span>{e.note || "Recorded entry"}</span>
                    <span>{fmtDate(e.date)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <Empty>Your first deposit will appear here.</Empty>
        )}
      </Section>
      <details className="c-details">
        <summary>Bucket details</summary>
        <p className="c-form-note">{g.note || "No note added."}</p>
        <p className="c-form-note">
          {fmt(g.allocated)} allocated · {fmt(g.spent || 0)} spent
        </p>
        <Action small onClick={() => onEdit(g.id)}>
          Edit bucket
        </Action>
      </details>
      {switching && (
        <Sheet title="Switch bucket" onClose={() => setSwitching(false)}>
          {data.goals
            .filter((x) => !x.archived)
            .map((x) => (
              <div className="c-row" key={x.id}>
                <button
                  className="c-row-main"
                  onClick={() => {
                    onSwitch(x.id);
                    setSwitching(false);
                  }}
                  aria-current={x.id === g.id ? "true" : undefined}
                >
                  <span className="c-row-content">
                    <span className="c-row-title">
                      <span>
                        {x.name}
                        {x.id === g.id ? " ✓" : ""}
                      </span>
                      <Money value={balanceOf(x)} />
                    </span>
                    <span className="c-meta">{phaseLabel[bucketPhase(x)]}</span>
                  </span>
                </button>
              </div>
            ))}
        </Sheet>
      )}
    </DetailShell>
  );
}
export function BucketSheet({ goal, goals, mode, onClose, onSave }) {
  const [goalId, setGoalId] = React.useState(goal.id),
    [amount, setAmount] = React.useState(""),
    [date, setDate] = React.useState(todayISO),
    [note, setNote] = React.useState("");
  const op = useOperationId(),
    selected = (goals || [goal]).find((g) => g.id === goalId) || goal;
  const n = parseDecimal(amount),
    balance = balanceOf(selected),
    available =
      mode === "deposit" || Math.round(n * 100) <= Math.round(balance * 100);
  const valid = n > 0 && available && validDate(date) && !selected.archived;
  const label = {
    deposit: "Deposit",
    withdrawal: "Withdraw",
    spend: "Record spend",
  }[mode];
  const after = roundMoney(balance + (mode === "deposit" ? n : -n));
  return (
    <Sheet title={label} onClose={onClose}>
      {(close) => (
        <>
          <SelectField
            label="Bucket"
            inline
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            {(goals || [goal])
              .filter((g) => !g.archived)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {fmt(balanceOf(g))} SAR
                </option>
              ))}
          </SelectField>
          <AmountField value={amount} onChange={setAmount} />
          <div className="c-form-preview">
            <span>
              Balance after{" "}
              {mode === "deposit"
                ? "deposit"
                : mode === "spend"
                  ? "spending"
                  : "withdrawal"}
            </span>
            <span>
              <Money value={Number.isFinite(after) ? after : balance} /> SAR
            </span>
          </div>
          {!available && (
            <p role="alert" className="c-sheet-error">
              Only {fmt(balance)} SAR is available.
            </p>
          )}
          {amount && !Number.isFinite(n) && (
            <p role="alert" className="c-sheet-error">
              Use a positive amount with up to two decimal places.
            </p>
          )}
          {mode !== "deposit" && (
            <p className="c-form-note">
              {mode === "spend"
                ? "Records a purchase from this bucket. It stays separate from everyday spending."
                : "Releases an allocation without recording a purchase."}
            </p>
          )}
          <OptionalDetails
            date={date}
            setDate={setDate}
            note={note}
            setNote={setNote}
          />
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave(goalId, {
                operationId: op,
                type: mode,
                amount: n,
                date,
                note: note.trim(),
              });
              close();
            }}
          >
            {label}
          </SheetSave>
        </>
      )}
    </Sheet>
  );
}
export function EditBucketSheet({ goal, onClose, onSave, onArchive }) {
  const isNew = !goal.id,
    op = useOperationId();
  const [name, setName] = React.useState(goal.name || ""),
    [target, setTarget] = React.useState(
      goal.target ? String(goal.target) : "",
    ),
    [date, setDate] = React.useState(goal.targetDate || todayISO().slice(0, 7));
  const [status, setStatus] = React.useState(goal.status || "active"),
    [color, setColor] = React.useState(goal.color || SWATCHES[0]),
    [note, setNote] = React.useState(goal.note || ""),
    [pinned, setPinned] = React.useState(!!goal.pinned);
  const [plan, setPlan] = React.useState(
    goal.monthlyPlan != null ? String(goal.monthlyPlan) : "",
  );
  const valid =
    name.trim() &&
    parseDecimal(target) > 0 &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(date) &&
    (!plan || Number.isFinite(parseDecimal(plan)));
  return (
    <Sheet title={isNew ? "New bucket" : "Bucket options"} onClose={onClose}>
      {(close) => (
        <>
          <Field
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Next adventure"
            maxLength={80}
          />
          <div className="c-form-grid">
            <Field
              label="Target · SAR"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              placeholder="10000"
            />
            <Field
              label="Target month"
              type="month"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <details className="c-form-options">
            <summary>Monthly plan, colour & other options</summary>
            <Field
              label="Monthly contribution · SAR"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              inputMode="decimal"
              placeholder="Automatic from target"
            />
            <SelectField
              label="Stage"
              inline
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Saving / in use</option>
              <option value="completed">Ready to use</option>
              <option value="paused">Paused</option>
            </SelectField>
            <p className="c-form-note">
              Spending activity marks a current bucket as In use. Existing
              history is preserved.
            </p>
            <label
              className="c-form-note"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: 38,
                gap: 7,
              }}
            >
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin this bucket
            </label>
            <Colours value={color} onChange={setColor} />
            <Field
              label="Note · optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </details>
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave(goal.id, {
                operationId: op,
                name: name.trim(),
                target: parseDecimal(target),
                targetDate: date,
                status,
                color,
                note: note.trim(),
                pinned,
                monthlyPlan: plan ? parseDecimal(plan) : null,
              });
              close();
            }}
          >
            {isNew ? "Create bucket" : "Save changes"}
          </SheetSave>
          {!isNew && (
            <SheetDelete
              confirmLabel={goal.archived ? "Restore bucket" : "Archive bucket"}
              onClick={async () => {
                await onArchive(goal.id, !goal.archived);
                close();
              }}
            >
              {goal.archived ? "Restore bucket" : "Archive bucket"}
            </SheetDelete>
          )}
        </>
      )}
    </Sheet>
  );
}
