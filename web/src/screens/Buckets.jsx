import React from "react";
import { LayoutGroup } from "framer-motion";
import {
  contributionSummary,
  monthlyRequired,
  groupBuckets,
  compareBuckets,
} from "../lib/buckets.mjs";
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
export function ContributionPlan({ data, onClose, onEdit }) {
  const summary = contributionSummary(data.goals, data.cashflow);
  const list = summary.rows.filter(
    ({ goal, required }) =>
      required === null ||
      required > 0 ||
      cycleAmount(goal, data.cashflow, "deposit") > 0 ||
      (!goal.archived && goal.monthlyPlan != null),
  );
  return (
    <Sheet title="Monthly contribution" onClose={onClose}>
      {(close) => <>
      <div className="c-stat-row c-plan-summary">
        <div>
          Required / month
          <strong>
            <Money value={summary.required} />
            {summary.missingDeadlines ? "+" : ""}
          </strong>
        </div>
        <div>
          {data.cashflow.target}% budget
          <strong>
            <Money value={summary.budget} />
          </strong>
        </div>
        <div>
          Deposited this cycle
          <strong>
            <Money value={summary.deposited} />
          </strong>
        </div>
      </div>
      {list
        .sort((a, b) => compareBuckets(a.goal, b.goal))
        .map(({ goal: g, required }) => (
          <div className="c-row" key={g.id}>
            <div className="c-row-content">
              <div className="c-row-title">
                <span>{g.name}</span>
                {required === null ? (
                  <Action
                    small
                    onClick={() => {
                      close(() => onEdit?.(g.id));
                    }}
                  >
                    Set deadline
                  </Action>
                ) : (
                  <Money value={required} />
                )}
              </div>
              <div className="c-meta">
                <span>{g.targetDate || "No deadline"}</span>
                <span>
                  {fmt(cycleAmount(g, data.cashflow, "deposit"))} deposited
                </span>
              </div>
              {g.monthlyPlan != null && (
                <p className="c-form-note">
                  Your plan: {fmt(g.monthlyPlan)} /mo
                </p>
              )}
            </div>
          </div>
        ))}
      {!list.length && (
        <p className="c-form-note">No active funding requirements.</p>
      )}
      <details className="c-details">
        <summary>How it is calculated</summary>
        <p className="c-form-note">
          Remaining targets divided by months to their deadlines, using current
          balances. Due and overdue targets are needed now. Deposits and your
          saved plan are shown separately.
        </p>
      </details>
      </>}
    </Sheet>
  );
}
function RestoreBucket({ g, nav }) {
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  const locked = React.useRef(false);
  return (
    <div className="c-archive-item">
      <BucketRow
        g={g}
        data={{ cashflow: {} }}
        nav={nav}
        trailing={
          <Action
            small
            disabled={busy}
            aria-label={`Restore ${g.name}`}
            onClick={async () => {
              if (locked.current) return;
              locked.current = true;
              setBusy(true);
              setError("");
              try {
                await nav.restoreBucket(g.id);
                document.querySelector(".c-archive-back")?.focus();
                window.dispatchEvent(new Event("keela:saved"));
              } catch (e) {
                setError(
                  e.message || "Couldn’t restore this bucket. Try again.",
                );
              } finally {
                locked.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? "Restoring…" : "Restore"}
          </Action>
        }
      />
      {error && (
        <p className="c-form-note c-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Buckets({ data, nav, sub, setSub }) {
  const [plan, setPlan] = React.useState(false),
    [menu, setMenu] = React.useState(false);
  const menuDestination = React.useRef(null);
  const groups = groupBuckets(data.goals);
  const current = data.goals.filter(
    (g) => !g.archived && bucketPhase(g) !== "completed",
  );
  const archived = data.goals.filter((g) => g.archived).sort(compareBuckets);
  if (sub === "archived")
    return (
      <Page
        title="Archive"
        action={
          <button
            className="c-button c-archive-back"
            onClick={() => setSub("all")}
          >
            ‹ Back
          </button>
        }
      >
        <Section title="Archived buckets" detail={String(archived.length)}>
          {archived.map((g) => (
            <RestoreBucket key={g.id} g={g} nav={nav} />
          ))}
          {!archived.length && <Empty>No archived buckets.</Empty>}
        </Section>
      </Page>
    );
  return (
    <Page
      title="Buckets"
      action={
        <div className="c-header-actions">
          <Action primary onClick={nav.addBucket}>
            + New
          </Action>
          <button
            className="c-icon-button c-more"
            aria-label="Bucket menu"
            aria-haspopup="dialog"
            onClick={() => setMenu(true)}
          >
            •••
          </button>
        </div>
      }
    >
      <Hero
        label="Held in buckets"
        amount={current.reduce((sum, g) => sum + balanceOf(g), 0)}
      >
        <SplitBar
          items={current
            .filter((g) => balanceOf(g) > 0)
            .map((g) => ({
              label: g.name,
              value: balanceOf(g),
              color: g.color,
            }))}
        />
      </Hero>
      <Contribution data={data} onPlan={() => setPlan(true)} />
      <LayoutGroup id="buckets">
        {groups
          .filter((group) => group.goals.length)
          .map((group) => (
            <Section
              key={group.phase}
              title={group.label}
              detail={String(group.goals.length)}
              collapsible={["paused", "completed"].includes(group.phase)}
            >
              {group.goals.map((g) => (
                <BucketRow
                  key={g.id}
                  g={g}
                  data={data}
                  nav={nav}
                  showPhase={false}
                  animateLayout
                />
              ))}
            </Section>
          ))}
      </LayoutGroup>
      {!groups.some((g) => g.goals.length) && (
        <Empty>Create a bucket to get started.</Empty>
      )}
      {plan && (
        <ContributionPlan
          data={data}
          onClose={() => setPlan(false)}
          onEdit={nav.editBucket}
        />
      )}
      {menu && (
        <Sheet
          title="Buckets"
          onClose={() => {
            setMenu(false);
            const destination = menuDestination.current;
            menuDestination.current = null;
            if (destination === "archive") setSub("archived");
            if (destination === "settings") nav.openSettings();
          }}
        >
          {(close) => (
            <>
              <button
                className="c-row c-row-main"
                onClick={() => {
                  menuDestination.current = "archive";
                  close();
                }}
              >
                <span className="c-row-content">Archive</span>
                <span className="c-muted">{archived.length}</span>
                <span aria-hidden="true">›</span>
              </button>
              <button
                className="c-row c-row-main"
                onClick={() => {
                  menuDestination.current = "settings";
                  close();
                }}
              >
                <span className="c-row-content">Settings</span>
                <span aria-hidden="true">›</span>
              </button>
            </>
          )}
        </Sheet>
      )}
    </Page>
  );
}
export function BucketDetail({ g, data, onClose, onMove, onEdit, onSwitch }) {
  const th = useTheme(),
    [switching, setSwitching] = React.useState(false),
    phase = bucketPhase(g),
    balance = balanceOf(g),
    inuse = phase === "inuse";
  const pct =
    phase === "completed"
      ? 100
      : inuse
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
          minHeight: 44,
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
            caption={phase === "completed" ? "used" : inuse ? "left" : "funded"}
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
            Required / month
            <strong>
              {monthlyRequired(g, cf) === null ? (
                <Action small onClick={() => onEdit(g.id)}>
                  Set deadline
                </Action>
              ) : (
                <Money value={monthlyRequired(g, cf)} />
              )}
            </strong>
          </div>
          <div>
            Target month<strong>{g.targetDate || "Not set"}</strong>
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
          {(close) => <>
          {data.goals
            .filter((x) => !x.archived)
            .map((x) => (
              <div className="c-row" key={x.id}>
                <button
                  className="c-row-main"
                  onClick={() => {
                    close(() => onSwitch(x.id));
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
          </>}
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
    <Sheet title={label} onClose={onClose} draft={{ goalId, amount, date, note }}>
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
          <AmountField value={amount} onChange={setAmount} error={amount && n > 0 && !available ? `Only ${fmt(balance)} SAR is available.` : undefined} />
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
            disabledReason={!available && n > 0 ? `Enter no more than ${fmt(balance)} SAR.` : "Enter an amount and a valid date to continue."}
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
    [date, setDate] = React.useState(goal.targetDate || "");
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
    (!date || /^\d{4}-(0[1-9]|1[0-2])$/.test(date)) &&
    (!plan || Number.isFinite(parseDecimal(plan)));
  return (
    <Sheet title={isNew ? "New bucket" : "Bucket options"} onClose={onClose} draft={{ name, target, date, status, color, note, pinned, plan }}>
      {(close) => (
        <>
          <Field
            label="Name" required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Next adventure"
            maxLength={80}
          />
          <div className="c-form-grid">
            <Field
              label="Target · SAR" required min={0.01}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              placeholder="10000"
            />
            <Field
              label="Target month · optional"
              type="month"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <details className="c-form-options">
            <summary>Monthly plan, colour & other options</summary>
            <Field
              label="Your monthly plan · SAR"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              inputMode="decimal"
              placeholder="Optional personal plan"
            />
            <SelectField
              label="Funding status"
              inline
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active funding</option>
              <option value="completed">Funding finished</option>
              <option value="paused">Paused</option>
            </SelectField>
            <p className="c-form-note">
              Active funding includes replenishment. Used-up buckets appear in
              Completed automatically.
            </p>
            <label
              className="c-form-note"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: 44,
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
                targetDate: date || null,
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
          {!isNew && !goal.archived && balanceOf(goal) !== 0 && <p className="c-form-note">Withdraw or spend the remaining balance before archiving.</p>}
          {!isNew && (
            <SheetDelete
              disabled={!goal.archived && balanceOf(goal) !== 0}
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
