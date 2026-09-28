import test from "node:test";
import assert from "node:assert/strict";
import { stageMovement } from "../src/lib/ledger.mjs";
import { bucketMovement } from "../src/lib/money.mjs";

// Optimistic transaction adapter: conflicting reads restart, failed commits
// publish no staged writes. The application uses Firestore's runTransaction.
function database() {
  let version = 0;
  const docs = new Map([["goals/test", { allocated: 100, spent: 0 }]]);
  const run = async (
    id,
    input,
    { failCommit = false, loseAcknowledgement = false } = {},
  ) => {
    for (let attempts = 0; attempts < 5; attempts++) {
      const before = version,
        staged = [];
      await stageMovement(
        {
          read: async (path) => docs.get(path),
          update: (path, patch) =>
            staged.push([path, { ...docs.get(path), ...patch }]),
          create: (path, entry) => staged.push([path, entry]),
        },
        "goals/test",
        id,
        input,
        bucketMovement,
      );
      if (before !== version) continue;
      if (failCommit) throw new Error("commit failed");
      for (const [path, doc] of staged) docs.set(path, doc);
      version++;
      if (loseAcknowledgement) throw new Error("acknowledgement lost");
      return;
    }
    throw new Error("conflict limit");
  };
  return { docs, run };
}
const input = { type: "withdrawal", amount: 75, date: "2026-09-28", note: "" };
test("a failed transaction publishes neither balance nor activity", async () => {
  const db = database();
  await assert.rejects(
    db.run("one", input, { failCommit: true }),
    /commit failed/,
  );
  assert.equal(db.docs.size, 1);
  assert.equal(db.docs.get("goals/test").allocated, 100);
});
test("two concurrent withdrawals cannot both spend the same balance", async () => {
  const db = database(),
    results = await Promise.allSettled([
      db.run("one", input),
      db.run("two", input),
    ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(db.docs.get("goals/test").allocated, 25);
  assert.equal(db.docs.size, 2);
});
test("retry after a lost acknowledgement records one movement only", async () => {
  const db = database();
  await assert.rejects(
    db.run("one", input, { loseAcknowledgement: true }),
    /acknowledgement lost/,
  );
  await db.run("one", input);
  assert.equal(db.docs.get("goals/test").allocated, 25);
  assert.equal(db.docs.size, 2);
  await assert.rejects(
    db.run("one", { ...input, amount: 20 }),
    /already saved/,
  );
  assert.equal(db.docs.get("goals/test").allocated, 25);
});
