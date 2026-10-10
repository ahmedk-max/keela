// Shared by forms, the transactional write boundary and outcome tests.
export const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function parseDecimal(value, places = 2) {
  const s =
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    Number(value.toFixed(places)) === value
      ? value.toFixed(places)
      : String(value).trim();
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER / 100 ? n : NaN;
}
export function positiveMoney(value) {
  const n = parseDecimal(value);
  if (!(n > 0))
    throw new Error(
      "Enter an amount greater than zero, with up to two decimal places.",
    );
  return n;
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const d = new Date(value + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
/** @returns {import('./types').BucketPhase} */
export function bucketPhase(g) {
  if (g.archived) return "archived";
  const balance = roundMoney((g.allocated || 0) - (g.spent || 0));
  if (balance === 0 && (g.spent || 0) > 0) return "completed";
  if (g.status === "paused") return "paused";
  // An active goal can need replenishing after spending. Its funding intent
  // takes precedence over its activity history (e.g. an emergency fund).
  if (g.status !== "completed" && balance < (g.target || 0)) return "active";
  if ((g.spent || 0) > 0) return "inuse";
  if (
    g.status === "completed" ||
    (g.target > 0 && balance >= g.target)
  )
    return "ready";
  return "active";
}
export function bucketMovement(g, input) {
  if (!g)
    throw new Error(
      "This bucket is no longer available. Reopen your bucket list.",
    );
  if (g.archived)
    throw new Error("Restore this bucket before recording activity.");
  const amount = positiveMoney(input.amount);
  if (!["deposit", "withdrawal", "spend"].includes(input.type))
    throw new Error("Choose a valid bucket action.");
  if (!validDate(input.date)) throw new Error("Choose a valid date.");
  const allocated = g.allocated || 0,
    spent = g.spent || 0;
  if (
    input.type !== "deposit" &&
    Math.round(amount * 100) > Math.round((allocated - spent) * 100)
  ) {
    throw new Error(
      "The available balance has changed or is too low. Reduce the amount and try again.",
    );
  }
  const patch =
    input.type === "spend"
      ? { spent: roundMoney(spent + amount) }
      : {
          allocated: roundMoney(
            allocated + (input.type === "deposit" ? amount : -amount),
          ),
        };
  return {
    patch,
    entry: {
      type: input.type,
      balanceField: input.type === "spend" ? "spent" : "allocated",
      amount,
      date: input.date,
      note: input.note?.trim() || null,
    },
  };
}

// Older bridge withdrawals meant purchases, while app withdrawals released an
// allocation. Require an explicit original action for those unmarked records.
export function bucketEntryField(entry, originalAction) {
  if (entry.type === "deposit") return "allocated";
  if (entry.type === "spend") return "spent";
  if (entry.type !== "withdrawal") throw new Error("This activity type cannot be changed.");
  if (["allocated", "spent"].includes(entry.balanceField)) return entry.balanceField;
  if (originalAction === "spend") return "spent";
  if (originalAction === "withdrawal") return "allocated";
  throw new Error("Choose how the original withdrawal was recorded.");
}

// Apply only the changed entry's effect: historical opening balances and all
// unrelated activity must survive a correction. Validate the final totals, so
// replacing a deposit does not temporarily remove funds spent by later entries.
export function bucketEntryChange(source, before, input, target = null, originalAction = null) {
  for (const g of [source, ...(target ? [target] : [])]) {
    if (!g) throw new Error("This bucket is no longer available.");
    if (g.archived) throw new Error("Restore this bucket before changing its activity.");
  }
  const totals = (g) => ({ allocated: Math.round((g.allocated || 0) * 100), spent: Math.round((g.spent || 0) * 100) });
  const from = totals(source), to = target ? totals(target) : from;
  const field = bucketEntryField(before, originalAction);
  const old = Math.round(positiveMoney(before.amount) * 100);
  from[field] -= before.type === "withdrawal" && field === "allocated" ? -old : old;
  let entry = null;
  if (input) {
    // Use the same validation and canonical entry shape as a new movement.
    entry = bucketMovement({ allocated: positiveMoney(input.amount), spent: 0 }, input).entry;
    const amount = Math.round(entry.amount * 100);
    to[entry.balanceField] += entry.type === "withdrawal" ? -amount : amount;
  }
  const validate = (g) => {
    if (![g.allocated, g.spent, g.allocated - g.spent].every((n) => Number.isSafeInteger(n) && n >= 0))
      throw new Error("This change would leave a bucket below zero. Check the amount or its later activity.");
    return { allocated: g.allocated / 100, spent: g.spent / 100 };
  };
  return { sourcePatch: validate(from), targetPatch: target ? validate(to) : null, entry };
}
export function holdingMovement(h, input) {
  if (!h) throw new Error("This holding is no longer available.");
  if (!validDate(input.date)) throw new Error("Choose a valid date.");
  const basis = h.allocated || 0,
    held = h.units || 0;
  const entry = {
    type: input.type,
    date: input.date,
    note: input.note?.trim() || null,
    units: null,
    price: null,
    costRemoved: null,
  };
  if (input.type === "buy" || input.type === "sell") {
    if (h.kind === "cash")
      throw new Error("Use deposit or withdraw for cash holdings.");
    const units = parseDecimal(input.units, 8),
      price = parseDecimal(input.price, 8);
    if (!(units > 0 && price > 0))
      throw new Error("Enter valid positive units and price.");
    const amount = roundMoney(units * price);
    if (!(amount > 0) || !Number.isFinite(parseDecimal(amount)))
      throw new Error("The total must be at least 0.01 SAR.");
    if (input.type === "sell" && units > held)
      throw new Error("You cannot sell more units than you currently hold.");
    const costRemoved =
      input.type === "sell"
        ? units === held
          ? basis
          : roundMoney((basis / held) * units)
        : null;
    return {
      patch: {
        allocated: roundMoney(
          basis + (input.type === "buy" ? amount : -costRemoved),
        ),
        units: Number(
          (held + (input.type === "buy" ? units : -units)).toFixed(8),
        ),
      },
      entry: { ...entry, units, price, amount, costRemoved },
    };
  }
  if (!["deposit", "withdraw"].includes(input.type))
    throw new Error("Choose a valid holding action.");
  if (h.kind === "position")
    throw new Error("Use buy or sell for investment holdings.");
  const amount = positiveMoney(input.amount);
  if (
    input.type === "withdraw" &&
    Math.round(amount * 100) > Math.round(basis * 100)
  )
    throw new Error("The holding does not have enough available cash.");
  return {
    patch: {
      allocated: roundMoney(
        basis + (input.type === "deposit" ? amount : -amount),
      ),
    },
    entry: { ...entry, amount },
  };
}
export function assertSameOperation(saved, input) {
  for (const key of ["type", "amount", "units", "price", "date", "note"]) {
    const a = saved[key] ?? null,
      b = input[key] === "" ? null : (input[key] ?? null);
    if (a !== b)
      throw new Error(
        "This action was already saved with different details. Close this form and check its activity before adding another.",
      );
  }
}
