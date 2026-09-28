import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mark, Ring, Icons, StackedBar } from "./primitives";
import { useTheme } from "../lib/theme";
import { fmt, fmtDay } from "../lib/format";
import { roundMoney } from "../lib/money.mjs";
import {
  balanceOf,
  bucketPhase,
  phaseLabel,
  monthlyRequired,
  contributionSummary,
} from "../lib/buckets.mjs";
export { balanceOf, phaseLabel, cycleAmount } from "../lib/buckets.mjs";

export const cycleLabel = (cf) => {
  const end = new Date(cf.cycleEnd + "T12:00:00");
  end.setDate(end.getDate() - 1);
  const last = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return `${fmtDay(cf.cycleStart)} – ${fmtDay(last)}`;
};
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
  const th = useTheme(),
    reduced = useReducedMotion();
  return (
    <motion.div
      className="k-screen c-page"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.18 }}
    >
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
    </motion.div>
  );
}
export function Hero({ label, amount, subtitle, ring, children }) {
  return (
    <section
      className={`c-hero${fmt(amount).length > 9 ? " c-hero-large-amount" : ""}${fmt(amount).length > 15 ? " c-hero-full-amount" : ""}`}
    >
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
export function Section({
  title,
  detail,
  action,
  children,
  className = "",
  collapsible = false,
}) {
  const [open, setOpen] = React.useState(!collapsible);
  const id = React.useId(),
    reduced = useReducedMotion();
  return (
    <section className={`c-section ${className}`}>
      <header>
        {collapsible ? (
          <h2 className="c-section-heading">
            <button
              className="c-section-toggle"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpen(!open)}
            >
              <span>{title}</span>
              <span className="c-muted">{detail}</span>
              <span className="c-chevron" data-open={open} aria-hidden="true">
                ⌄
              </span>
            </button>
          </h2>
        ) : (
          <>
            <h2>{title}</h2>
            {action || (detail && <span className="c-muted">{detail}</span>)}
          </>
        )}
      </header>
      {collapsible ? (
        <div id={id}>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                style={{ overflow: "hidden" }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
export function Legend({ items }) {
  return (
    <div
      className={`c-legend${items.some((x) => fmt(x.value).length > 9) ? " c-legend-wide" : ""}`}
    >
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
  const { required, budget, remaining, percent, missingDeadlines } =
    contributionSummary(data.goals, cf);
  const incomplete = missingDeadlines > 0;
  return (
    <Section
      title="Monthly contribution"
      action={
        onPlan && (
          <Action small onClick={onPlan}>
            Breakdown ›
          </Action>
        )
      }
    >
      <div className="c-contribution-values">
        <div>
          <span className="c-muted">
            Required monthly{incomplete ? " · known targets" : ""}
          </span>
          <strong className="c-medium">
            <Money value={required} />
            {incomplete ? "+" : ""}
          </strong>
        </div>
        <div>
          <span className="c-muted">{cf.target}% savings budget</span>
          <strong className="c-medium">
            <Money value={budget} />
          </strong>
        </div>
      </div>
      <div
        className="c-requirement-track"
        role="img"
        aria-label={`${fmt(required)} SAR required of ${fmt(budget)} SAR savings budget${incomplete ? "; incomplete: missing deadlines" : ""}`}
      >
        <i
          style={{
            width: `${budget > 0 ? Math.min(100, (required / budget) * 100) : required > 0 ? 100 : 0}%`,
            background: remaining < 0 ? th.loss : th.accent,
          }}
        />
      </div>
      <div className="c-meta">
        <span>
          {percent == null
            ? "No savings budget"
            : `${incomplete ? "At least " : ""}${percent}% needed`}
        </span>
        <span className={remaining < 0 ? "c-error-text" : ""}>
          {incomplete ? (remaining < 0 ? "At least " : "Up to ") : ""}
          {fmt(Math.abs(remaining))}{" "}
          {remaining < 0 ? "shortfall" : "budget remaining"}
        </span>
      </div>
      {incomplete && (
        <p className="c-form-note">
          {missingDeadlines}{" "}
          {missingDeadlines === 1 ? "bucket needs" : "buckets need"} a deadline.
        </p>
      )}
    </Section>
  );
}
export function BucketRow({
  g,
  data,
  nav,
  showPhase = true,
  animateLayout = false,
  trailing,
}) {
  const reduced = useReducedMotion();
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
  const required = monthlyRequired(g, data.cashflow);
  return (
    <motion.div
      className="c-row c-bucket-row"
      layout={animateLayout && !reduced ? "position" : false}
      layoutId={animateLayout && !reduced ? `bucket-${g.id}` : undefined}
      transition={{ duration: reduced ? 0 : 0.22 }}
    >
      <button
        className="c-row-main"
        aria-label={`Open ${g.name}`}
        onClick={() => nav.openBucket(g.id)}
      >
        {phase === "completed" ? (
          <span className="c-complete-mark" aria-label="Completed">
            ✓
          </span>
        ) : (
          <MetricRing
            pct={pct}
            size={36}
            color={used ? th.green : g.color}
            small
          />
        )}
        <span className="c-row-content">
          <span className="c-row-title">
            <span>{g.name}</span>
            <Money value={balance} />
          </span>
          <span className="c-meta">
            <span>
              {g.pinned && <span aria-label="Pinned">◆ </span>}
              {showPhase
                ? phaseLabel[phase]
                : phase === "active"
                  ? required === null
                    ? "Set deadline"
                    : `${fmt(required)} /mo required`
                  : phase === "completed"
                    ? "Fully used"
                    : used
                      ? `${fmt(g.spent)} of ${fmt(g.allocated)} spent`
                      : g.targetDate || "No deadline"}
            </span>
            <span>
              {used
                ? showPhase
                  ? `${fmt(g.spent)} spent`
                  : ""
                : phase === "completed"
                  ? `${fmt(g.spent)} spent`
                  : `of ${fmt(g.target)}`}
            </span>
          </span>
        </span>
      </button>
      {trailing ||
        (!g.archived && phase !== "completed" && (
          <button
            className="c-quick-add"
            aria-label={`Deposit to ${g.name}`}
            onClick={() => nav.moveBucket(g.id, "deposit")}
          >
            +
          </button>
        ))}
    </motion.div>
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
