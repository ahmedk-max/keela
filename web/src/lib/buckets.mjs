import { bucketPhase, roundMoney } from "./money.mjs";

export { bucketPhase };
export const balanceOf = (g) => roundMoney((g.allocated || 0) - (g.spent || 0));
export const phaseLabel = {
  active: "Active",
  ready: "Ready",
  inuse: "In use",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};
export const phaseOrder = ["active", "ready", "inuse", "paused", "completed"];
export const inCycle = (entry, cf) =>
  entry.date >= cf.cycleStart && entry.date < cf.cycleEnd;
export const cycleAmount = (g, cf, type) =>
  roundMoney(
    (g.entries || [])
      .filter((e) => inCycle(e, cf) && e.type === type)
      .reduce((sum, e) => sum + e.amount, 0),
  );

export function paydayCycle(payday = 27, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), payday);
  if (now.getDate() < payday) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { cycleStart: iso(start), cycleEnd: iso(end) };
}

export function deadlineMonth(value) {
  const month = typeof value === "string" ? value.slice(0, 7) : "";
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
}
const monthIndex = (month) => {
  const [year, m] = month.split("-").map(Number);
  return year * 12 + m - 1;
};

// null means a deadline is needed, not a zero funding requirement.
export function monthlyRequired(g, cf) {
  if (bucketPhase(g) !== "active") return 0;
  const remaining = Math.max(0, roundMoney((g.target || 0) - balanceOf(g)));
  if (!remaining) return 0;
  const deadline = deadlineMonth(g.targetDate),
    start = deadlineMonth(cf.cycleStart);
  if (!deadline || !start) return null;
  const months = Math.max(1, monthIndex(deadline) - monthIndex(start));
  return Math.ceil(remaining / months);
}

export function contributionSummary(goals, cf) {
  const rows = goals.map((goal) => ({
    goal,
    required: monthlyRequired(goal, cf),
  }));
  const required = rows.reduce((sum, row) => sum + (row.required ?? 0), 0);
  const missingDeadlines = rows.filter((row) => row.required === null).length;
  const budget = Math.round((cf.income * cf.target) / 100);
  return {
    rows,
    required,
    missingDeadlines,
    budget,
    remaining: budget - required,
    percent: budget > 0 ? Math.round((required / budget) * 100) : null,
    deposited: roundMoney(
      goals.reduce((sum, g) => sum + cycleAmount(g, cf, "deposit"), 0),
    ),
  };
}

export function compareBuckets(a, b) {
  return (
    Number(!!b.pinned) - Number(!!a.pinned) ||
    (deadlineMonth(a.targetDate) || "9999-12").localeCompare(
      deadlineMonth(b.targetDate) || "9999-12",
    ) ||
    (a.name || "").localeCompare(b.name || "") ||
    String(a.id).localeCompare(String(b.id))
  );
}
export function groupBuckets(goals) {
  return phaseOrder.map((phase) => ({
    phase,
    label: phaseLabel[phase],
    goals: goals.filter((g) => bucketPhase(g) === phase).sort(compareBuckets),
  }));
}
