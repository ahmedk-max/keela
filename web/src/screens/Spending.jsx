import React from "react";
import { useTheme } from "../lib/theme";
import { fmt, fmtDay } from "../lib/format";
import { getCat, subLogo } from "../lib/icons";
import {
  Page,
  Hero,
  Section,
  Action,
  Money,
  MetricRing,
  MonthlySpending,
  SplitBar,
  cycleLabel,
} from "../ui/compact";
import { Empty, Bars } from "../ui/primitives";
import { spendStats } from "./spending-extras";
export {
  TxSheet,
  BillSheet,
  UpcomingSheet,
  WishlistSheet,
  CategoryBudgetSheet,
} from "./spending-extras";

function ExpenseRow({ t, nav }) {
  return (
    <div className="c-row">
      <span className="c-tile">{getCat(t.cat)?.icon}</span>
      <button className="c-row-main" onClick={() => nav.editTx(t)}>
        <span className="c-row-content">
          <span className="c-row-title">
            <span>{t.name}</span>
            <Money value={-t.amount} />
          </span>
          <span className="c-meta">
            <span>
              {t.cat}
              {t.source === "keela" ? " · Keela" : ""}
            </span>
            <span>{fmtDay(t.date)}</span>
          </span>
        </span>
      </button>
    </div>
  );
}
export function Spending({ data, nav, sub, setSub }) {
  const th = useTheme(),
    cf = data.cashflow,
    stats = spendStats(data),
    [allHistory, setAllHistory] = React.useState(false);
  const recurring = data.bills.filter((b) => b.type === "monthly"),
    annual = data.bills.filter((b) => b.type === "yearly"),
    monthly = recurring.reduce((s, b) => s + b.amount, 0);
  const txns = allHistory ? data.txns : data.cycleTxns;
  const categories = Object.entries(
    data.cycleTxns.reduce(
      (out, t) => ({ ...out, [t.cat]: (out[t.cat] || 0) + t.amount }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const action =
    sub === "tx"
      ? nav.addTx
      : sub === "recurring"
        ? nav.addBill
        : nav.addUpcoming;
  const name = sub === "tx" ? "Expense" : sub === "recurring" ? "Bill" : "Plan";
  const billRows = (list) =>
    list.map((b) => {
      const logo = b.sub ? subLogo(b.name) : null;
      return (
        <div className="c-row" key={b.id}>
          <span className="c-tile" style={{ color: logo?.color }}>
            {logo?.icon || getCat(b.cat)?.icon}
          </span>
          <button className="c-row-main" onClick={() => nav.editBill(b)}>
            <span className="c-row-content">
              <span className="c-row-title">
                <span>{b.name}</span>
                <Money value={b.amount} />
              </span>
              <span className="c-meta">
                <span>{b.sub ? "Subscription" : b.cat}</span>
                <span>
                  {b.day ? `Day ${b.day} · ` : ""}
                  {b.type}
                </span>
              </span>
            </span>
          </button>
        </div>
      );
    });
  return (
    <Page
      title="Spending"
      subtitle={cycleLabel(cf)}
      action={
        <Action primary onClick={action}>
          + {name}
        </Action>
      }
    >
      <div className="c-filters" aria-label="Spending views">
        {[
          ["tx", "Transactions"],
          ["recurring", "Recurring"],
          ["upcoming", "Upcoming"],
        ].map(([v, l]) => (
          <button key={v} aria-pressed={sub === v} onClick={() => setSub(v)}>
            {l}
          </button>
        ))}
      </div>
      {sub === "tx" ? (
        <>
          <Hero
            label="Spent this cycle"
            amount={cf.variableSpent}
            subtitle={`${fmt(Math.abs(cf.variableBudget - cf.variableSpent))} ${cf.variableSpent > cf.variableBudget ? "over" : "left of"} ${fmt(cf.variableBudget)}`}
            ring={
              <MetricRing
                pct={
                  cf.variableBudget
                    ? (cf.variableSpent / cf.variableBudget) * 100
                    : cf.variableSpent
                      ? 100
                      : 0
                }
                caption="of budget"
                color={th.amber}
                dark
              />
            }
          />
          <MonthlySpending data={data} />
          <Section title="Where it went" detail="Tap to set a budget">
            {categories.map(([cat, amount]) => {
              const cap = data.profile.categoryBudgets[cat] || 0,
                over = cap > 0 && amount > cap;
              return (
                <div key={cat}>
                  <button
                    className="c-category"
                    aria-label={`${cat}, ${fmt(amount)} SAR${cap ? `, budget ${fmt(cap)}` : ""}`}
                    onClick={() => nav.editCatBudget(cat, cap)}
                  >
                    <span>{cat}</span>
                    <span className="c-category-track">
                      <i
                        style={{
                          width: `${cf.variableSpent ? (amount / cf.variableSpent) * 100 : 0}%`,
                          background: over
                            ? th.loss
                            : getCat(cat)?.color || th.accent,
                        }}
                      />
                    </span>
                    <Money value={amount} />
                  </button>
                  {cap > 0 && (
                    <p className={`c-form-note${over ? " c-error-text" : ""}`}>
                      {fmt(Math.max(0, cap - amount))} left of {fmt(cap)}
                      {over ? ` · ${fmt(amount - cap)} over` : ""}
                    </p>
                  )}
                </div>
              );
            })}
            {!categories.length && (
              <p className="c-muted">No spending recorded in this cycle.</p>
            )}
          </Section>
          <Section title="Daily spending" detail="Current cycle">
            <div
              role="img"
              aria-label={`Daily spending in SAR: ${stats.curDaily.join(", ")}`}
            >
              <Bars
                values={stats.curDaily}
                elapsedIdx={stats.elapsed}
                color={th.accent}
                peakColor={th.accentPress}
              />
            </div>
            <div className="c-meta">
              <span>{fmtDay(cf.cycleStart)}</span>
              <span>Average {fmt(stats.dailyAvg, 0)}/day</span>
              <span>{stats.daysLeft} days left</span>
            </div>
          </Section>
          <Section
            title="Transactions"
            action={
              <Action small onClick={() => setAllHistory((v) => !v)}>
                {allHistory ? "This cycle" : "All history"}
              </Action>
            }
          >
            {txns.map((t) => (
              <ExpenseRow key={t.id} t={t} nav={nav} />
            ))}
            {!txns.length && <Empty>No expenses in this view.</Empty>}
          </Section>
          <details className="c-details">
            <summary>Cycle comparison</summary>
            <div className="c-stat-row">
              <div>
                Last cycle
                <strong>
                  <Money value={stats.prevTotal} />
                </strong>
              </div>
              <div>
                Projected
                <strong>
                  {stats.elapsed < 5 ? (
                    "Early days"
                  ) : (
                    <Money value={stats.projected} />
                  )}
                </strong>
              </div>
              <div>
                Daily average
                <strong>
                  <Money value={Math.round(stats.dailyAvg)} />
                </strong>
              </div>
            </div>
          </details>
        </>
      ) : sub === "recurring" ? (
        <>
          <Hero
            label="Monthly recurring"
            amount={monthly}
            subtitle={`${recurring.length} recurring payments`}
          >
            <SplitBar
              items={recurring.map((b, i) => ({
                label: b.name,
                value: b.amount,
                color: [th.accent, th.amber, th.green, th.blue, th.rose][i % 5],
              }))}
            />
          </Hero>
          <Section title="Renewal calendar" detail="Monthly billing day">
            {billRows(
              [...recurring].sort((a, b) => (a.day || 32) - (b.day || 32)),
            )}
            {!recurring.length && <Empty>Add a recurring bill to start.</Empty>}
          </Section>
          {annual.length > 0 && (
            <Section
              title="Yearly payments"
              detail={`${fmt(annual.reduce((s, b) => s + b.amount, 0))} SAR/year`}
            >
              {billRows(annual)}
              <p className="c-form-note">
                Yearly payments are shown separately from the monthly recurring
                budget.
              </p>
            </Section>
          )}
        </>
      ) : (
        <>
          <Hero
            label="Planned outflows"
            amount={data.upcoming.reduce((s, u) => s + u.amount, 0)}
            subtitle={`${data.upcoming.length} scheduled expenses`}
          />
          <Section title="Scheduled" detail="Due date">
            {data.upcoming.map((u) => (
              <div className="c-row" key={u.id}>
                <button
                  className="c-row-main"
                  onClick={() => nav.editUpcoming(u)}
                >
                  <span className="c-row-content">
                    <span className="c-row-title">
                      <span>{u.name}</span>
                      <Money value={u.amount} />
                    </span>
                    <span className="c-meta">
                      <span>{u.date ? fmtDay(u.date) : "No date"}</span>
                      <span>One-off</span>
                    </span>
                  </span>
                </button>
              </div>
            ))}
            {!data.upcoming.length && (
              <p className="c-muted">Nothing scheduled.</p>
            )}
          </Section>
          <Section
            title="Wishlist"
            action={
              <Action small onClick={nav.addWishlist}>
                + Wish
              </Action>
            }
          >
            {data.wishlist.map((w) => (
              <div className="c-row" key={w.id}>
                <button
                  className="c-row-main"
                  onClick={() => nav.editWishlist(w)}
                >
                  <span className="c-row-content c-row-title">
                    <span>{w.name}</span>
                    <Money value={w.amount} />
                  </span>
                </button>
              </div>
            ))}
          </Section>
        </>
      )}
    </Page>
  );
}
