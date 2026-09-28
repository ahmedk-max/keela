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
export function bucketPhase(g) {
  if (g.archived) return "archived";
  if (g.status === "paused") return "paused";
  if ((g.spent || 0) > 0) return "inuse";
  if (
    g.status === "completed" ||
    (g.target > 0 && (g.allocated || 0) >= g.target)
  )
    return "ready";
  return "saving";
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
      amount,
      date: input.date,
      note: input.note?.trim() || null,
    },
  };
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
