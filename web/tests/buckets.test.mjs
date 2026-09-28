import test from "node:test";
import assert from "node:assert/strict";
import {
  bucketPhase,
  balanceOf,
  monthlyRequired,
  contributionSummary,
  groupBuckets,
  paydayCycle,
  cycleAmount,
  deadlineMonth,
} from "../src/lib/buckets.mjs";
import { bucketMovement } from "../src/lib/money.mjs";

const cf = {
  income: 19884.29,
  target: 70,
  cycleStart: "2026-09-27",
  cycleEnd: "2026-10-27",
};
const goal = (patch = {}) => ({
  id: "reserve",
  name: "Reserve",
  status: "active",
  target: 50000,
  allocated: 26889.29,
  spent: 16389,
  targetDate: "2027-06",
  entries: [],
  ...patch,
});

test("active replenishment survives spending history and computes the required share of the savings budget", () => {
  const g = goal();
  assert.equal(bucketPhase(g), "active");
  assert.equal(balanceOf(g), 10500.29);
  assert.equal(monthlyRequired(g, cf), 4389);
  const s = contributionSummary(
    [g, goal({ id: "kitchen", target: 10000, allocated: 30000, spent: 20000 })],
    cf,
  );
  assert.equal(s.required, 4389);
  assert.equal(s.budget, 13919);
  assert.equal(s.percent, 32);
  assert.equal(s.remaining, 9530);
});

test("requirements follow live balances and ignore personal plans and deposited totals", () => {
  const original = goal({
    monthlyPlan: 0,
    entries: [{ type: "deposit", date: "2026-09-27", amount: 3000 }],
  });
  assert.equal(monthlyRequired(original, cf), 4389);
  assert.equal(monthlyRequired(goal({ monthlyPlan: 99999 }), cf), 4389);
  const funded = {
    ...original,
    ...bucketMovement(original, {
      type: "deposit",
      amount: 9000,
      date: "2026-09-28",
    }).patch,
  };
  assert.equal(monthlyRequired(funded, cf), 3389);
  const withdrawn = {
    ...funded,
    ...bucketMovement(funded, {
      type: "withdrawal",
      amount: 9000,
      date: "2026-09-28",
    }).patch,
  };
  assert.equal(monthlyRequired(withdrawn, cf), 4389);
  assert.equal(contributionSummary([original], cf).deposited, 3000);
  assert.equal(monthlyRequired(goal({ target: 60000 }), cf), 5500);
});

test("new empty buckets stay active; depletion completes and deposits reopen used buckets", () => {
  const empty = goal({ allocated: 0, spent: 0 });
  assert.equal(bucketPhase(empty), "active");
  const used = goal({ allocated: 1000, spent: 1000, status: "completed" });
  assert.equal(bucketPhase(used), "completed");
  assert.equal(monthlyRequired(used, cf), 0);
  assert.equal(
    bucketPhase({
      ...used,
      ...bucketMovement(used, {
        type: "deposit",
        amount: 1,
        date: "2026-09-28",
      }).patch,
    }),
    "inuse",
  );
  assert.equal(
    bucketPhase({ ...used, status: "active", allocated: 1001 }),
    "active",
  );
  assert.equal(
    bucketPhase(goal({ allocated: 1000.0000000000001, spent: 1000 })),
    "completed",
  );
});

test("funding intent distinguishes ready, in use and paused without changing stored statuses", () => {
  assert.equal(bucketPhase(goal({ allocated: 50000, spent: 0 })), "ready");
  assert.equal(
    bucketPhase(goal({ status: "completed", allocated: 50000, spent: 1000 })),
    "inuse",
  );
  assert.equal(
    bucketPhase(goal({ target: 10000, allocated: 30000, spent: 20000 })),
    "inuse",
  );
  for (const patch of [
    { status: "paused" },
    { archived: true },
    { status: "completed" },
  ]) {
    const g = goal(patch),
      before = structuredClone(g);
    assert.equal(monthlyRequired(g, cf), 0);
    assert.deepEqual(g, before);
  }
  assert.equal(
    bucketPhase(goal({ archived: true, allocated: 1000, spent: 1000 })),
    "archived",
  );
});

test("missing deadlines stay unknown, while due and overdue targets require the remaining amount", () => {
  for (const targetDate of [null, undefined, "", "2027-13", "invalid"]) {
    assert.equal(monthlyRequired(goal({ targetDate }), cf), null);
  }
  for (const targetDate of ["2026-09", "2025-12-19"]) {
    assert.equal(monthlyRequired(goal({ targetDate }), cf), 39500);
  }
  const s = contributionSummary([goal(), goal({ targetDate: null })], cf);
  assert.equal(s.required, 4389);
  assert.equal(s.missingDeadlines, 1);
  assert.equal(deadlineMonth("2027-06-19"), "2027-06");
  assert.equal(monthlyRequired(goal({ targetDate: "2027-06-19" }), cf), 4389);
});

test("zero budgets, over-budget requirements and all-funded targets remain finite", () => {
  const zero = contributionSummary([goal()], { ...cf, income: 0 });
  assert.equal(zero.percent, null);
  assert.equal(zero.remaining, -4389);
  assert.equal(
    contributionSummary([goal()], { ...cf, income: 1000 }).percent,
    627,
  );
  const funded = contributionSummary(
    [goal({ allocated: 50000, spent: 0 })],
    cf,
  );
  assert.equal(funded.required, 0);
  assert.equal(funded.remaining, funded.budget);
});

test("payday rollover changes the requirement without a new financial write", () => {
  const before = paydayCycle(27, new Date(2026, 9, 26));
  const after = paydayCycle(27, new Date(2026, 9, 27));
  assert.equal(before.cycleStart, "2026-09-27");
  assert.equal(after.cycleStart, "2026-10-27");
  assert.equal(monthlyRequired(goal(), { ...cf, ...before }), 4389);
  assert.equal(monthlyRequired(goal(), { ...cf, ...after }), 4938);
  assert.deepEqual(paydayCycle(27, new Date(2027, 0, 2)), {
    cycleStart: "2026-12-27",
    cycleEnd: "2027-01-27",
  });
  assert.deepEqual(paydayCycle(28, new Date(2028, 1, 29)), {
    cycleStart: "2028-02-28",
    cycleEnd: "2028-03-28",
  });
  const entries = ["2026-09-26", "2026-09-27", "2026-10-26", "2026-10-27"].map(
    (date) => ({ type: "deposit", amount: 1.25, date }),
  );
  assert.equal(cycleAmount({ entries }, cf, "deposit"), 2.5);
});

test("groups order lifecycle first, then pins, deadlines and names without mutating the input", () => {
  const goals = [
    goal({ id: "z", name: "Zebra", targetDate: "2027-01" }),
    goal({ id: "a", name: "Alpha", targetDate: "2027-01" }),
    goal({ id: "p", pinned: true }),
    goal({ id: "missing", targetDate: null }),
    goal({ id: "ready", allocated: 50000, spent: 0 }),
    goal({ id: "used", status: "completed" }),
    goal({ id: "paused", status: "paused" }),
    goal({ id: "done", allocated: 100, spent: 100 }),
    goal({ id: "archive", archived: true }),
  ];
  const before = structuredClone(goals),
    groups = groupBuckets(goals);
  assert.deepEqual(
    groups.map((g) => g.phase),
    ["active", "ready", "inuse", "paused", "completed"],
  );
  assert.deepEqual(
    groups[0].goals.map((g) => g.id),
    ["p", "a", "z", "missing"],
  );
  assert.equal(groups.flatMap((g) => g.goals).length, 8);
  assert.deepEqual(goals, before);
});
