import React from "react";
import { useTheme } from "../lib/theme";
import { fmt, fmtDay, monthsBetween, NOW_MONTH } from "../lib/format";
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
  cycleLabel,
} from "../ui/compact";
import { ContributionPlan } from "./Buckets";
import { getCat } from "../lib/icons";
import { Progress } from "../ui/primitives";

export function Home({ data, nav }) {
  const th = useTheme(),
    [plan, setPlan] = React.useState(false),
    cf = data.cashflow;
  const left = cf.variableBudget - cf.variableSpent,
    pct = cf.variableBudget
      ? (cf.variableSpent / cf.variableBudget) * 100
      : cf.variableSpent
        ? 100
        : 0;
  const flow = [
    {
      label: "Saving target",
      value: (cf.income * cf.target) / 100,
      color: th.accent,
    },
    { label: "Recurring", value: cf.fixed + cf.subs, color: th.amber },
    {
      label: "Spent",
      value: Math.min(cf.variableSpent, cf.variableBudget),
      color: th.rose,
    },
    { label: "Left to spend", value: Math.max(0, left), color: th.green },
  ];
  const current = data.goals.filter((g) => !g.archived),
    pinned = current.filter((g) => g.pinned),
    show = pinned.length ? pinned : current.slice(0, 3);
  const total = data.goals.reduce((s, g) => s + balanceOf(g), 0);
  const entries = data.goals
    .flatMap((g) => g.entries || [])
    .filter((e) => ["deposit", "withdrawal", "spend"].includes(e.type))
    .sort((a, b) => a.date.localeCompare(b.date));
  const delta = (e) => (e.type === "deposit" ? 1 : -1) * e.amount;
  let running = total - entries.reduce((s, e) => s + delta(e), 0);
  const monthly = new Map([["Opening", running]]);
  for (const e of entries) {
    running += delta(e);
    monthly.set(e.date.slice(0, 7), running);
  }
  const values = [...monthly.values()].slice(-12),
    labels = [...monthly.keys()].slice(-12);
  const pactTotal = Math.max(
      1,
      monthsBetween(data.profile.pactStart, data.profile.pactEnd),
    ),
    elapsed = Math.min(
      pactTotal,
      Math.max(0, monthsBetween(data.profile.pactStart, NOW_MONTH)),
    );
  const hours = new Date().getHours(),
    greeting =
      hours < 12
        ? "Good morning"
        : hours < 18
          ? "Good afternoon"
          : "Good evening";
  return (
    <Page
      title={`${greeting}, ${data.profile.name}`}
      subtitle={cycleLabel(cf)}
      nav={nav}
    >
      <Hero
        label={
          left < 0
            ? "Over everyday spending budget"
            : "Left for everyday spending"
        }
        amount={Math.abs(left)}
        subtitle={`${fmt(cf.variableSpent)} spent · ${fmt(cf.variableBudget)} budget`}
        ring={
          <MetricRing
            pct={pct}
            caption="used"
            dark
            color={left < 0 ? th.loss : th.amber}
            size={76}
          />
        }
      />
      <Section title="Monthly flow" detail={`${fmt(cf.income)} SAR income`}>
        <SplitBar items={flow} />
        <Legend items={flow} />
        <div className="c-meta" style={{ marginTop: 12 }}>
          <span>{cf.target}% saving target</span>
          <span>{elapsed} months on the pact</span>
        </div>
        {left < 0 && (
          <p className="c-form-note c-error-text">
            Spending is {fmt(-left)} SAR over the living allowance.
          </p>
        )}
      </Section>
      <Contribution data={data} onPlan={() => setPlan(true)} />
      <Section
        title="Recent spending"
        action={
          <Action small onClick={nav.addTx}>
            + Expense
          </Action>
        }
      >
        {data.txns.slice(0, 3).map((t) => (
          <div className="c-row" key={t.id}>
            <span className="c-tile">{getCat(t.cat)?.icon}</span>
            <button className="c-row-main" onClick={() => nav.editTx(t)}>
              <span className="c-row-content">
                <span className="c-row-title">
                  <span>{t.name}</span>
                  <Money value={-t.amount} />
                </span>
                <span className="c-meta">
                  <span>{t.cat}</span>
                  <span>{fmtDay(t.date)}</span>
                </span>
              </span>
            </button>
          </div>
        ))}
        {!data.txns.length && (
          <p className="c-muted">Your first expense will appear here.</p>
        )}
      </Section>
      <Section title="Savings over time" detail="SAR">
        <LineChart values={values} labels={[labels[0] || "Opening", "Now"]} />
      </Section>
      {data.meetings[0] && (
        <div className="c-note">
          <button
            className="c-row-main"
            onClick={() => nav.openMeeting(data.meetings[0].id)}
          >
            {data.meetings[0].summary || data.meetings[0].title}
          </button>
        </div>
      )}
      <Section
        title={pinned.length ? "Pinned buckets" : "Your buckets"}
        action={
          <Action small onClick={() => nav.goTab("buckets")}>
            All buckets
          </Action>
        }
      >
        {show.map((g) => (
          <BucketRow key={g.id} g={g} data={data} nav={nav} />
        ))}
        {!show.length && (
          <Action small onClick={nav.addBucket}>
            + Create your first bucket
          </Action>
        )}
      </Section>
      <details className="c-details">
        <summary>Net worth & the pact</summary>
        <div className="c-stat-row">
          <div>
            Recorded net worth
            <strong>
              <Money value={data.netWorth} />
            </strong>
          </div>
          <div>
            Months remaining<strong>{pactTotal - elapsed}</strong>
          </div>
        </div>
        <LineChart
          values={[...data.snapshots.map((s) => s.netWorth), data.netWorth]}
          labels={[data.snapshots[0]?.m || "Opening", "Now"]}
          label="Recorded net worth in SAR"
        />
        <Progress pct={(elapsed / pactTotal) * 100} height={7} />
        <p className="c-form-note">
          {data.profile.pactStart} → {data.profile.pactEnd} · {cf.target}%
          saving target
        </p>
      </details>
      {plan && <ContributionPlan data={data} onClose={() => setPlan(false)} />}
    </Page>
  );
}
