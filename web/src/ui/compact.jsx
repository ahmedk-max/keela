import React from "react";
import { Mark, Ring, Icons, StackedBar } from "./primitives";
import { useTheme } from "../lib/theme";
import { fmt, fmtDay, monthsBetween } from "../lib/format";
import { bucketPhase, roundMoney } from "../lib/money.mjs";

export const balanceOf = (g) => roundMoney((g.allocated || 0) - (g.spent || 0));
export const phaseLabel = {
  saving: "Saving",
  ready: "Ready to use",
  inuse: "In use",
  paused: "Paused",
  archived: "Archived",
};
export const inCycle = (entry, cf) =>
  entry.date >= cf.cycleStart && entry.date < cf.cycleEnd;
export const cycleAmount = (g, cf, type) =>
  roundMoney(
    (g.entries || [])
      .filter((e) => inCycle(e, cf) && e.type === type)
      .reduce((s, e) => s + e.amount, 0),
  );
export const cycleLabel = (cf) => {
  const end = new Date(cf.cycleEnd + "T12:00:00");
  end.setDate(end.getDate() - 1);
  const last = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return `${fmtDay(cf.cycleStart)} – ${fmtDay(last)}`;
};
export function monthlyPlan(g, cf) {
  const phase = bucketPhase(g);
  if (["paused", "archived", "ready"].includes(phase)) return 0;
  if (g.monthlyPlan != null) return g.monthlyPlan;
  if (phase === "inuse") return 0;
  const net =
    cycleAmount(g, cf, "deposit") -
    cycleAmount(g, cf, "withdrawal") -
    cycleAmount(g, cf, "spend");
  const opening = balanceOf(g) - net;
  return Math.ceil(
    Math.max(0, g.target - opening) /
      Math.max(1, monthsBetween(cf.cycleStart.slice(0, 7), g.targetDate)),
  );
}
export function Money({ value, large = false }) {
  return <span className={large ? "c-money" : "c-num"}>{fmt(value)}</span>;
}
export function Action({
  children,
  onClick,
  primary = false,
  small = false,
  ...props
}) {
  return (
    <button
      type="button"
      className={`c-button${primary ? " c-primary" : ""}${small ? " c-text-button" : ""}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
export function Page({ title, subtitle, action, nav, children }) {
  const th = useTheme();
  return (
    <div className="k-screen c-page">
      <div className="c-brand">
        <Mark size={26} color={th.accent} />
        <span>Keela</span>
      </div>
      <header className="c-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="c-muted">{subtitle}</p>}
        </div>
        {action ||
          (nav && (
            <button
              className="c-icon-button"
              aria-label="Settings"
              onClick={nav.openSettings}
            >
              {Icons.settings}
            </button>
          ))}
      </header>
      {children}
    </div>
  );
}
export function Hero({ label, amount, subtitle, ring, children }) {
  return (
    <section className="c-hero">
      <div className="c-hero-row">
        <div>
          <p>{label}</p>
          <div className="c-hero-amount">
            <Money value={amount} large />
            <span>SAR</span>
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {ring}
      </div>
      {children}
    </section>
  );
}
export function MetricRing({
  pct = 0,
  caption,
  size = 76,
  color,
  dark = false,
  small = false,
}) {
  const th = useTheme();
  return (
    <div
      className="c-ring"
      role="img"
      aria-label={`${Math.round(pct)}% ${caption || ""}`}
    >
      <Ring
        size={size}
        stroke={small ? 3 : 5.5}
        pct={pct}
        color={color}
        track={dark ? "rgba(255,255,255,.12)" : th.track}
        sweep={false}
      >
        <span className={small ? "c-ring-mini-value" : "c-ring-value"}>
          {Math.round(pct)}
          {!small && "%"}
        </span>
      </Ring>
      {caption && !small && <span className="c-ring-caption">{caption}</span>}
    </div>
  );
}
export function Section({ title, detail, action, children, className = "" }) {
  return (
    <section className={`c-section ${className}`}>
      <header>
        <h2>{title}</h2>
        {action || (detail && <span className="c-muted">{detail}</span>)}
      </header>
      {children}
    </section>
  );
}
export function Legend({ items }) {
  return (
    <div className="c-legend">
      {items.map((x) => (
        <div key={x.label}>
          <span>
            <i style={{ background: x.color }} />
            {x.label}
          </span>
          <Money value={x.value} />
        </div>
      ))}
    </div>
  );
}
export function SplitBar({ items, height = 9 }) {
  const total = items.reduce((s, x) => s + Math.max(0, x.value), 0);
  return (
    <div
      className="c-split"
      role="img"
      aria-label={items
        .map((x) => `${x.label}: ${fmt(x.value)} SAR`)
        .join(", ")}
    >
      <StackedBar
        height={height}
        segs={items.map((x) => ({
          w: total ? (Math.max(0, x.value) / total) * 100 : 0,
          color: x.color,
        }))}
        animate={false}
      />
    </div>
  );
}
export function Contribution({ data, onPlan }) {
  const th = useTheme(),
    cf = data.cashflow;
  const added = roundMoney(
    data.goals.reduce((s, g) => s + cycleAmount(g, cf, "deposit"), 0),
  );
  const plan = data.goals.reduce((s, g) => s + monthlyPlan(g, cf), 0);
  const budget = roundMoney((cf.income * cf.target) / 100);
  return (
    <Section
      title="Monthly contribution"
      action={
        onPlan && (
          <Action small onClick={onPlan}>
            Plan ›
          </Action>
        )
      }
    >
      <div className="c-value-line">
        <span>
          <strong className="c-medium">
            <Money value={added} />
          </strong>
          <span className="c-muted"> / {fmt(plan)} planned</span>
        </span>
        <span className="c-muted">
          {plan ? Math.round((added / plan) * 100) : 0}%
        </span>
      </div>
      <SplitBar
        items={[
          {
            label: "Contributed",
            value: Math.min(added, plan),
            color: th.accent,
          },
          {
            label: "Still to add",
            value: Math.max(0, plan - added),
            color: th.track,
          },
        ]}
      />
      <div className="c-meta">
        <span>{fmt(Math.max(0, plan - added))} left to contribute</span>
        <span>{cycleLabel(cf)}</span>
      </div>
      <div className="c-stat-row">
        <div>
          Planned / month
          <strong>
            <Money value={plan} />
          </strong>
        </div>
        <div>
          Save budget
          <strong>
            <Money value={budget} />
          </strong>
        </div>
        <div>
          {budget >= plan ? "Headroom" : "Shortfall"}
          <strong className={budget < plan ? "c-error-text" : ""}>
            <Money value={Math.abs(budget - plan)} />
          </strong>
        </div>
      </div>
    </Section>
  );
}
export function BucketRow({ g, data, nav }) {
  const th = useTheme(),
    phase = bucketPhase(g),
    balance = balanceOf(g),
    used = phase === "inuse";
  const pct = Math.max(
    0,
    Math.min(
      100,
      used
        ? g.allocated
          ? (balance / g.allocated) * 100
          : 0
        : g.target
          ? (balance / g.target) * 100
          : 0,
    ),
  );
  const plan = monthlyPlan(g, data.cashflow);
  return (
    <div className="c-row c-bucket-row">
      <button
        className="c-row-main"
        aria-label={`Open ${g.name}`}
        onClick={() => nav.openBucket(g.id)}
      >
        <MetricRing
          pct={pct}
          size={36}
          color={used ? th.green : g.color}
          small
        />
        <span className="c-row-content">
          <span className="c-row-title">
            <span>{g.name}</span>
            <Money value={balance} />
          </span>
          <span className="c-meta">
            <span>{phaseLabel[phase]}</span>
            <span>
              {used ? `${fmt(g.spent)} spent` : `of ${fmt(g.target)}`}
            </span>
          </span>
          {plan > 0 && <span className="c-meta">{fmt(plan)} /mo planned</span>}
        </span>
      </button>
      {!g.archived && (
        <button
          className="c-quick-add"
          aria-label={`Deposit to ${g.name}`}
          onClick={() => nav.moveBucket(g.id, "deposit")}
        >
          +
        </button>
      )}
    </div>
  );
}
export function LineChart({
  values,
  labels,
  color,
  label = "Balance over time in SAR",
}) {
  const th = useTheme(),
    ref = React.useRef(null),
    [width, setWidth] = React.useState(280);
  React.useLayoutEffect(() => {
    const observer = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const v = values.filter(Number.isFinite),
    W = Math.max(180, width),
    left = 40,
    right = W - 6,
    top = 12,
    bottom = 88;
  const min = Math.min(0, ...v),
    max = Math.max(1, ...v) * 1.1,
    span = max - min || 1;
  const x = (i) =>
    v.length < 2
      ? (left + right) / 2
      : left + (i * (right - left)) / (v.length - 1);
  const y = (n) => bottom - ((n - min) / span) * (bottom - top);
  const d = v.map((n, i) => `${i ? "L" : "M"}${x(i)} ${y(n)}`).join(" "),
    c = color || th.accent;
  const axis = (n) =>
    Math.abs(n) >= 1000
      ? `${fmt(n / 1000, Math.abs(n) >= 10000 ? 0 : 1)}k`
      : fmt(n, 0);
  return (
    <div ref={ref} className="c-chart">
      <svg
        width="100%"
        height="116"
        viewBox={`0 0 ${W} 116`}
        role="img"
        aria-label={`${label}: ${v.map((n) => fmt(n)).join(", ")}`}
      >
        <line x1={left} x2={right} y1={bottom} y2={bottom} stroke={th.line} />
        <text x="0" y={top + 4}>
          {axis(max)}
        </text>
        <text x="0" y={bottom + 3}>
          {axis(min)}
        </text>
        {v.length > 1 && (
          <path
            d={`${d} L${right} ${y(0)} L${left} ${y(0)} Z`}
            fill={c}
            opacity=".09"
          />
        )}
        <path d={d} fill="none" stroke={c} strokeWidth="2" />
        {v.map((n, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(n)}
            r={i === v.length - 1 ? 3 : 2}
            fill={c}
          />
        ))}
        <text x={left} y="110">
          {labels?.[0] || ""}
        </text>
        <text x={right} y="110" textAnchor="end">
          {labels?.[1] || "Now"}
        </text>
      </svg>
      {v.length < 2 && (
        <p className="c-muted">
          More history will appear as balances are recorded.
        </p>
      )}
    </div>
  );
}
export function MonthlySpending({ data }) {
  const th = useTheme(),
    [selected, setSelected] = React.useState(5),
    cf = data.cashflow;
  const cycles = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(cf.cycleStart + "T12:00:00");
    date.setMonth(date.getMonth() - 5 + i);
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      label: date.toLocaleDateString("en", { month: "short" }),
      start: iso(date),
      amount: roundMoney(
        data.txns
          .filter((t) => t.date >= iso(date) && t.date < iso(end))
          .reduce((s, t) => s + t.amount, 0),
      ),
    };
  });
  const max =
    Math.max(cf.variableBudget, ...cycles.map((c) => c.amount), 1) * 1.15;
  return (
    <Section title="Monthly spending" detail="SAR · payday cycles">
      <div className="c-month-bars">
        <div
          className="c-budget-line"
          style={{ bottom: `${38 + (cf.variableBudget / max) * 96}px` }}
        >
          <span>Budget {fmt(cf.variableBudget)}</span>
        </div>
        {cycles.map((c, i) => (
          <button
            key={c.start}
            onClick={() => setSelected(i)}
            aria-pressed={i === selected}
            aria-label={`${c.label} spending ${fmt(c.amount)} SAR`}
          >
            <span className="c-month-column">
              <i
                style={{
                  height: `${(c.amount / max) * 96}px`,
                  background: i === selected ? th.accent : th.amber,
                  opacity: i === selected ? 1 : 0.45,
                }}
              />
            </span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <div className="c-meta" aria-live="polite">
        <span>
          {cycles[selected].label} ·{" "}
          {selected === 5 ? "cycle so far" : "completed cycle"}
        </span>
        <Money value={cycles[selected].amount} />
      </div>
    </Section>
  );
}
