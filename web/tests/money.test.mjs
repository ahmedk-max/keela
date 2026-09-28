import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDecimal,
  roundMoney,
  validDate,
  bucketMovement,
  holdingMovement,
  bucketPhase,
  assertSameOperation,
} from "../src/lib/money.mjs";
const date = "2026-09-28";
test("strict currency input retains cents and rejects malformed or negative values", () => {
  assert.equal(parseDecimal("500.25"), 500.25);
  for (const s of [
    "-20",
    "1.2.3",
    "1e3",
    "NaN",
    "Infinity",
    "1.234",
    "",
    " ",
    "1,000",
  ])
    assert.ok(Number.isNaN(parseDecimal(s)), s);
  assert.equal(parseDecimal(0.00000001, 8), 0.00000001);
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
});
test("new zero bucket accepts deposits, withdrawals and spending with exact cents", () => {
  let g = { allocated: 0, spent: 0, target: 1000, status: "active" };
  for (const [type, amount] of [
    ["deposit", 500.25],
    ["withdrawal", 100.25],
    ["spend", 50],
  ]) {
    const result = bucketMovement(g, { type, amount, date });
    g = { ...g, ...result.patch };
    assert.equal(result.entry.amount, amount);
  }
  assert.deepEqual(
    {
      allocated: g.allocated,
      spent: g.spent,
      balance: roundMoney(g.allocated - g.spent),
    },
    { allocated: 400, spent: 50, balance: 350 },
  );
  assert.equal(bucketPhase(g), "active");
  assert.throws(
    () => bucketMovement(g, { type: "withdrawal", amount: 350.01, date }),
    /balance/,
  );
  assert.equal(
    bucketMovement(g, { type: "spend", amount: 350, date }).patch.spent,
    400,
  );
});
test("archived/missing buckets and invalid dates cannot accept movements", () => {
  assert.throws(
    () => bucketMovement(null, { type: "deposit", amount: 1, date }),
    /available/,
  );
  assert.throws(
    () =>
      bucketMovement({ archived: true }, { type: "deposit", amount: 1, date }),
    /Restore/,
  );
  assert.throws(
    () =>
      bucketMovement({}, { type: "deposit", amount: 1, date: "2026-02-30" }),
    /date/,
  );
  assert.equal(
    bucketPhase({ target: 100, allocated: 100, spent: 0, status: "active" }),
    "ready",
  );
  assert.equal(bucketPhase({ status: "completed", spent: 20 }), "inuse");
});
test("cash movements enforce the current balance down to the cent", () => {
  const h = { kind: "cash", allocated: 10.25 };
  assert.equal(
    holdingMovement(h, { type: "withdraw", amount: 10.25, date }).patch
      .allocated,
    0,
  );
  assert.throws(
    () => holdingMovement(h, { type: "withdraw", amount: 10.26, date }),
    /cash/,
  );
  assert.throws(
    () => holdingMovement(h, { type: "buy", units: 1, price: 10, date }),
    /cash/,
  );
});
test("sales remove average cost, record proceeds, and fully close fractional positions", () => {
  const h = { kind: "position", allocated: 300.03, units: 3 };
  const sale = holdingMovement(h, {
    type: "sell",
    units: 1,
    price: 120.5,
    date,
  });
  assert.deepEqual(sale.patch, { allocated: 200.02, units: 2 });
  assert.equal(sale.entry.amount, 120.5);
  assert.equal(sale.entry.costRemoved, 100.01);
  const rest = holdingMovement(
    { ...h, ...sale.patch },
    { type: "sell", units: 2, price: 121, date },
  );
  assert.deepEqual(rest.patch, { allocated: 0, units: 0 });
  assert.throws(
    () =>
      holdingMovement(h, { type: "sell", units: 3.00000001, price: 120, date }),
    /more units/,
  );
  const micro = holdingMovement(
    { kind: "position", allocated: 0, units: 0 },
    { type: "buy", units: 0.00000001, price: 1000000, date },
  );
  assert.deepEqual(micro.patch, { allocated: 0.01, units: 0.00000001 });
});
test("stable operation retry matches original payload and rejects changed payload", () => {
  const input = { type: "deposit", amount: 10.25, date, note: "" };
  const saved = bucketMovement({ allocated: 0 }, input).entry;
  assert.doesNotThrow(() => assertSameOperation(saved, input));
  assert.throws(
    () => assertSameOperation(saved, { ...input, amount: 10.26 }),
    /already saved/,
  );
});
