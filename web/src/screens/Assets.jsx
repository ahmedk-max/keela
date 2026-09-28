import React from "react";
import { useTheme, SWATCHES } from "../lib/theme";
import { Empty, DetailShell } from "../ui/primitives";
import {
  Page,
  Hero,
  Section,
  Action,
  Money,
  MetricRing,
  Legend,
  SplitBar,
  LineChart,
} from "../ui/compact";
import {
  Sheet,
  Field,
  SheetSave,
  SheetDelete,
  AmountField,
  SelectField,
  OptionalDetails,
  useOperationId,
  todayISO,
} from "../ui/sheets";
import { fmt, fmtDate } from "../lib/format";
import {
  parseDecimal,
  roundMoney,
  holdingMovement,
  validDate,
} from "../lib/money.mjs";
import { pfProgress, pfMonthlyNeeded, holdingSeries } from "./assets-extras";
import { Colours } from "./Buckets";
const unitsStr = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(n || 0);
const holdSub = (h) =>
  h.kind === "cash"
    ? "Cash balance"
    : h.units != null
      ? `${unitsStr(h.units)} units · avg ${unitsStr(h.avgCost)} SAR`
      : "Cost basis";
function Allocation({ items }) {
  const parts = items
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  return parts.length ? (
    <Section title="Allocation">
      <SplitBar items={parts} />
      <div className="c-allocation-legend">
        {parts.map((part) => (
          <div key={part.label}>
            <span>
              <i style={{ background: part.color }} />
              {part.label}
            </span>
            <span className="c-muted">
              {Math.round(
                (part.value / parts.reduce((sum, x) => sum + x.value, 0)) * 100,
              )}
              %
            </span>
            <Money value={part.value} />
          </div>
        ))}
      </div>
    </Section>
  ) : null;
}
export function Assets({ data, nav }) {
  const th = useTheme(),
    portfolios = data.portfolios,
    total = roundMoney(data.assets.reduce((s, h) => s + h.current, 0));
  const parts = portfolios.map((p) => ({
      label: p.name,
      value: p.value,
      color: p.color,
    })),
    largest = [...parts].sort((a, b) => b.value - a.value)[0];
  return (
    <Page title="Assets" nav={nav}>
      <Hero
        label="Cost basis"
        amount={total}
        subtitle={`${data.assets.length} holdings · ${portfolios.length} portfolios`}
        ring={
          largest &&
          total > 0 && (
            <MetricRing
              pct={(largest.value / total) * 100}
              caption={largest.label}
              color={largest.color}
              dark
            />
          )
        }
      />
      <Allocation items={parts} />
      <Section
        title="Portfolios"
        action={
          <Action small onClick={nav.addPortfolio}>
            + New
          </Action>
        }
      >
        {portfolios.length ? (
          portfolios.map((p) => (
            <button
              key={p.id}
              className="c-row c-row-main"
              style={{ width: "100%" }}
              onClick={() => nav.openPortfolio(p.id)}
            >
              <span className="c-portfolio-mark" style={{ color: p.color }}>
                <span aria-hidden="true">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
              </span>
              <span className="c-row-content">
                <span className="c-row-title">
                  <span>{p.name}</span>
                  <Money value={p.value} />
                </span>
                <span className="c-meta">
                  <span>
                    {p.count} {p.count === 1 ? "holding" : "holdings"}
                  </span>
                  <span>
                    {p.target > 0 ? `${pfProgress(p)}% of target` : ""}
                  </span>
                </span>
              </span>
              <span className="c-row-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))
        ) : (
          <Empty>Create a portfolio to start tracking your holdings.</Empty>
        )}
      </Section>
    </Page>
  );
}
export function PortfolioDetail({
  p,
  onClose,
  onEdit,
  onAddHolding,
  onOpenHolding,
}) {
  return (
    <DetailShell
      onClose={onClose}
      right={
        !p.isDefault && (
          <Action small onClick={() => onEdit(p.id)}>
            Options
          </Action>
        )
      }
    >
      <h1>{p.name}</h1>
      <Hero
        label="Cost basis"
        amount={p.value}
        subtitle={`${p.count} ${p.count === 1 ? "holding" : "holdings"}`}
        ring={
          p.target > 0 && (
            <MetricRing
              pct={pfProgress(p)}
              caption="of goal"
              color={p.color}
              dark
            />
          )
        }
      />
      {p.target > 0 && (
        <div className="c-stat-row">
          <div>
            Target<strong>{fmt(p.target)}</strong>
          </div>
          <div>
            Monthly to goal<strong>{fmt(pfMonthlyNeeded(p))}</strong>
          </div>
          <div>
            Target month<strong>{p.targetDate || "—"}</strong>
          </div>
        </div>
      )}
      <Allocation
        items={p.holdings.map((h) => ({
          label: h.name,
          value: h.current,
          color: h.color,
        }))}
      />
      <Section
        title="Holdings"
        action={
          <Action small onClick={onAddHolding}>
            + Add
          </Action>
        }
      >
        {p.holdings.length ? (
          p.holdings.map((h) => (
            <button
              key={h.id}
              className="c-row c-row-main"
              style={{ width: "100%" }}
              onClick={() => onOpenHolding(h.id)}
            >
              <span className="c-tile" style={{ color: h.color }}>
                ●
              </span>
              <span className="c-row-content">
                <span className="c-row-title">
                  <span>{h.name}</span>
                  <Money value={h.current} />
                </span>
                <span className="c-meta">{holdSub(h)}</span>
              </span>
              <span className="c-row-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))
        ) : (
          <Empty>Add a cash holding or investment position.</Empty>
        )}
      </Section>
      {p.note && <p className="c-note">{p.note}</p>}
    </DetailShell>
  );
}
export function HoldingDetail({ h, portfolio, onClose, onEdit, onAct }) {
  const cash = h.kind === "cash",
    events = [...h.entries].sort((a, b) => b.date.localeCompare(a.date));
  const legacySales = events.some(
    (e) => e.type === "sell" && e.costRemoved == null,
  );
  return (
    <DetailShell
      onClose={onClose}
      right={
        <Action small onClick={onEdit}>
          Options
        </Action>
      }
    >
      <h1>{h.name}</h1>
      <Hero
        label={cash ? "Cash balance" : "Cost basis"}
        amount={h.current}
        subtitle={cash ? undefined : holdSub(h)}
        ring={
          <MetricRing
            pct={portfolio.value ? (h.current / portfolio.value) * 100 : 0}
            caption="of portfolio"
            color={h.color}
            dark
          />
        }
      />
      <div className="c-actions two">
        <Action primary onClick={() => onAct(cash ? "deposit" : "buy")}>
          + {cash ? "Deposit" : "Buy"}
        </Action>
        <Action
          disabled={cash ? h.current <= 0 : !(h.units > 0)}
          onClick={() => onAct(cash ? "withdraw" : "sell")}
        >
          ↗ {cash ? "Withdraw" : "Sell"}
        </Action>
      </div>
      {!legacySales && (
        <Section title={cash ? "Balance over time" : "Cost basis over time"}>
          <LineChart values={holdingSeries(h)} color={h.color} />
        </Section>
      )}
      {legacySales && (
        <p className="c-note">
          Earlier sales do not include cost removed, so the balance history is
          unavailable.
        </p>
      )}
      <Section title="Activity" detail={`${events.length} entries`}>
        {events.length ? (
          events.map((e, i) => (
            <div className="c-row" key={e.id || i}>
              <span className="c-row-content">
                <span className="c-row-title">
                  <span>{e.type[0].toUpperCase() + e.type.slice(1)}</span>
                  <Money value={e.amount} />
                </span>
                <span className="c-meta">
                  <span>
                    {fmtDate(e.date)}
                    {e.units != null
                      ? ` · ${unitsStr(e.units)} @ ${unitsStr(e.price)}`
                      : ""}
                  </span>
                  <span>{e.type === "sell" ? "Proceeds" : ""}</span>
                </span>
                {(e.note || (e.type === "sell" && e.costRemoved != null)) && (
                  <details className="c-activity-details">
                    <summary>Details</summary>
                    {e.type === "sell" && e.costRemoved != null && (
                      <p className="c-form-note">
                        Cost removed {fmt(e.costRemoved)} SAR
                      </p>
                    )}
                    {e.note && <p className="c-form-note">{e.note}</p>}
                  </details>
                )}
              </span>
            </div>
          ))
        ) : (
          <Empty>No activity yet.</Empty>
        )}
      </Section>
      {h.note && <p className="c-note">{h.note}</p>}
    </DetailShell>
  );
}
export function PortfolioSheet({ portfolio, onClose, onSave, onDelete }) {
  const op = useOperationId(),
    [name, setName] = React.useState(portfolio?.name || ""),
    [target, setTarget] = React.useState(
      portfolio?.target ? String(portfolio.target) : "",
    ),
    [date, setDate] = React.useState(portfolio?.targetDate || ""),
    [color, setColor] = React.useState(portfolio?.color || SWATCHES[0]),
    [note, setNote] = React.useState(portfolio?.note || "");
  const num = target === "" ? 0 : parseDecimal(target),
    valid =
      name.trim() && Number.isFinite(num) && (!date || validDate(date + "-01"));
  return (
    <Sheet
      title={portfolio ? "Edit portfolio" : "New portfolio"}
      onClose={onClose}
    >
      {(close) => (
        <>
          <Field
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="c-form-grid">
            <Field
              label="Target · SAR · optional"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Field
              label="Target month · optional"
              type="month"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <details className="c-form-options">
            <summary>Colour & note</summary>
            <Colours value={color} onChange={setColor} />
            <Field
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </details>
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave(portfolio?.id, {
                operationId: op,
                name: name.trim(),
                target: num,
                targetDate: date,
                color,
                note: note.trim(),
              });
              close();
            }}
          >
            {portfolio ? "Save changes" : "Create portfolio"}
          </SheetSave>
          {portfolio && (
            <>
              <p className="c-form-note">
                Deleting a portfolio keeps its holdings under Unsorted.
              </p>
              <SheetDelete
                onClick={async () => {
                  await onDelete(portfolio.id);
                  close();
                }}
              />
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
export function HoldingSheet({
  holding,
  portfolioId,
  portfolios,
  onClose,
  onSave,
  onDelete,
}) {
  const op = useOperationId(),
    [name, setName] = React.useState(holding?.name || ""),
    [kind, setKind] = React.useState(holding?.kind || "position"),
    [pf, setPf] = React.useState(
      portfolioId === "_default" ? "" : portfolioId || "",
    ),
    [category, setCategory] = React.useState(holding?.cat || "other"),
    [color, setColor] = React.useState(holding?.color || SWATCHES[0]),
    [note, setNote] = React.useState(holding?.note || "");
  const [units, setUnits] = React.useState(""),
    [price, setPrice] = React.useState(""),
    [cash, setCash] = React.useState("");
  const u = units === "" ? 0 : parseDecimal(units, 8),
    p = price === "" ? 0 : parseDecimal(price, 8),
    a =
      kind === "cash"
        ? cash === ""
          ? 0
          : parseDecimal(cash)
        : roundMoney(u * p);
  const valid =
    name.trim() &&
    (holding || kind === "cash"
      ? Number.isFinite(a)
      : Number.isFinite(a) &&
        ((u === 0 && p === 0) || (u > 0 && p > 0 && a > 0)));
  return (
    <Sheet title={holding ? "Edit holding" : "Add holding"} onClose={onClose}>
      {(close) => (
        <>
          <Field
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="c-form-grid">
            <SelectField
              label="Portfolio"
              value={pf}
              onChange={(e) => setPf(e.target.value)}
            >
              <option value="">Unsorted</option>
              {portfolios
                .filter((x) => !x.isDefault)
                .map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
            </SelectField>
            <SelectField
              label="Type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={!!holding}
            >
              <option value="position">Investment</option>
              <option value="cash">Cash</option>
            </SelectField>
          </div>
          {!holding && (
            <details className="c-form-options">
              <summary>Opening balance · optional</summary>
              {kind === "cash" ? (
                <AmountField value={cash} onChange={setCash} />
              ) : (
                <>
                  <div className="c-form-grid">
                    <Field
                      label="Units"
                      inputMode="decimal"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                    />
                    <Field
                      label="Price / unit · SAR"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <p className="c-form-note">
                    Opening cost {Number.isFinite(a) ? fmt(a) : "—"} SAR
                  </p>
                </>
              )}
            </details>
          )}
          <details className="c-form-options">
            <summary>Category, colour & note</summary>
            <Field
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Colours value={color} onChange={setColor} />
            <Field
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </details>
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave(holding?.id, {
                operationId: op,
                name: name.trim(),
                kind,
                portfolioId: pf,
                category,
                color,
                note: note.trim(),
                opening: { amount: a, units: u, price: p },
              });
              close();
            }}
          >
            {holding ? "Save changes" : "Add holding"}
          </SheetSave>
          {holding && (holding.entries.length || holding.current !== 0) ? (
            <p className="c-form-note">
              Holdings with activity are kept to preserve their history.
            </p>
          ) : (
            holding && (
              <SheetDelete
                onClick={async () => {
                  await onDelete(holding.id);
                  close();
                }}
              />
            )
          )}
        </>
      )}
    </Sheet>
  );
}
export function ActivitySheet({ holding, mode, onClose, onSave }) {
  const op = useOperationId(),
    position = mode === "buy" || mode === "sell",
    [amount, setAmount] = React.useState(""),
    [units, setUnits] = React.useState(""),
    [price, setPrice] = React.useState(""),
    [date, setDate] = React.useState(todayISO()),
    [note, setNote] = React.useState("");
  const u = parseDecimal(units, 8),
    p = parseDecimal(price, 8),
    num = position ? roundMoney(u * p) : parseDecimal(amount);
  const entry = {
    type: mode,
    amount: num,
    units: position ? u : null,
    price: position ? p : null,
    date,
    note: note.trim(),
  };
  let valid = true,
    message = "";
  try {
    holdingMovement({ ...holding, allocated: holding.costBasis }, entry);
  } catch (e) {
    valid = false;
    if (amount || units || price) message = e.message;
  }
  return (
    <Sheet
      title={`${mode[0].toUpperCase() + mode.slice(1)} · ${holding.name}`}
      onClose={onClose}
    >
      {(close) => (
        <>
          {position ? (
            <>
              <div className="c-form-grid">
                <Field
                  label="Units"
                  inputMode="decimal"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                />
                <Field
                  label="Price / unit · SAR"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <p className="c-form-preview">
                {mode === "sell" ? "Sale proceeds" : "Purchase cost"}
                <strong>{Number.isFinite(num) ? fmt(num) : "—"} SAR</strong>
              </p>
            </>
          ) : (
            <AmountField value={amount} onChange={setAmount} />
          )}
          <p className="c-form-note">
            {position
              ? `${unitsStr(holding.units)} units held · ${fmt(holding.costBasis)} SAR cost basis`
              : `${fmt(holding.current)} SAR available`}
          </p>
          {message && <p className="c-form-note c-error-text">{message}</p>}
          <OptionalDetails
            date={date}
            setDate={setDate}
            note={note}
            setNote={setNote}
          />
          <SheetSave
            disabled={!valid}
            onClick={async () => {
              await onSave(holding.id, { ...entry, operationId: op });
              close();
            }}
          >
            Record {mode}
          </SheetSave>
        </>
      )}
    </Sheet>
  );
}
