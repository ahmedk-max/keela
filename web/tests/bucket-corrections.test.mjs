import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketEntryChange, bucketMovement } from '../src/lib/money.mjs';
import { stageBucketEntryChange } from '../src/lib/ledger.mjs';

const purchase = { type: 'spend', amount: 1250, date: '2026-10-03', note: 'Appliances' };
const marriage = { allocated: 12000, spent: 4300 };
const kitchen = { allocated: 8000, spent: 2300 };

test('moving the appliance purchase preserves total funds and the purchase awaiting a refund', () => {
  const r = bucketEntryChange(marriage, purchase, purchase, kitchen);
  assert.deepEqual(r.sourcePatch, { allocated: 12000, spent: 3050 });
  assert.deepEqual(r.targetPatch, { allocated: 8000, spent: 3550 });
  assert.equal(r.sourcePatch.allocated - r.sourcePatch.spent, 8950);
  assert.equal(r.targetPatch.allocated - r.targetPatch.spent, 4450);
  assert.equal(r.sourcePatch.spent + r.targetPatch.spent, marriage.spent + kitchen.spent);
});
test('editing and deleting deposits, spending and withdrawals preserve opening funds and exact cents', () => {
  for (const type of ['deposit', 'withdrawal', 'spend']) {
    const initial = { allocated: 150.50, spent: 20.25 };
    const movement = bucketMovement(initial, { ...purchase, type, amount: 30.25 });
    const g = { ...initial, ...movement.patch };
    const deleted = bucketEntryChange(g, movement.entry, null);
    assert.deepEqual(deleted.sourcePatch, initial);
    const edited = bucketEntryChange(g, movement.entry, { ...movement.entry, amount: 40.55 });
    assert.deepEqual(edited.sourcePatch, { ...initial, ...bucketMovement(initial, { ...movement.entry, amount: 40.55 }).patch });
  }
});
test('changing the action reverses its original effect before applying the replacement', () => {
  const r = bucketEntryChange({ allocated: 100, spent: 60 }, { ...purchase, amount: 60 }, { ...purchase, type: 'withdrawal', amount: 40 });
  assert.deepEqual(r.sourcePatch, { allocated: 60, spent: 0 });
});
test('a deposit can be edited after later spending but cannot remove funds still needed', () => {
  const g = { allocated: 100, spent: 80 }, entry = { ...purchase, type: 'deposit', amount: 100 };
  assert.equal(bucketEntryChange(g, entry, { ...entry, note: 'Corrected note' }).sourcePatch.allocated, 100);
  assert.equal(bucketEntryChange(g, entry, { ...entry, amount: 90 }).sourcePatch.allocated, 90);
  assert.throws(() => bucketEntryChange(g, entry, null), /below zero/);
  assert.throws(() => bucketEntryChange(g, entry, { ...entry, amount: 79.99 }), /below zero/);
});
test('invalid, archived and insufficient destination changes leave the input records untouched', () => {
  const before = structuredClone([marriage, kitchen, purchase]);
  assert.throws(() => bucketEntryChange(marriage, purchase, { ...purchase, amount: 8000 }, kitchen), /below zero/);
  assert.throws(() => bucketEntryChange({ ...marriage, archived: true }, purchase, null), /Restore/);
  assert.throws(() => bucketEntryChange(marriage, purchase, purchase, { ...kitchen, archived: true }), /Restore/);
  for (const patch of [{ amount: -1 }, { amount: 1.111 }, { date: '2026-02-30' }, { type: 'refund' }])
    assert.throws(() => bucketEntryChange(marriage, purchase, { ...purchase, ...patch }));
  assert.deepEqual([marriage, kitchen, purchase], before);
});
test('unmarked legacy withdrawals require their original meaning; both interpretations undo correctly', () => {
  const old = { ...purchase, type: 'withdrawal', amount: 50 };
  assert.throws(() => bucketEntryChange({ allocated: 100, spent: 50 }, old, null), /original withdrawal/);
  assert.deepEqual(bucketEntryChange({ allocated: 100, spent: 50 }, old, null, null, 'spend').sourcePatch, { allocated: 100, spent: 0 });
  assert.deepEqual(bucketEntryChange({ allocated: 50, spent: 0 }, old, null, null, 'withdrawal').sourcePatch, { allocated: 100, spent: 0 });
});

function database() {
  let version = 0;
  const docs = new Map([
    ['goals/marriage', structuredClone(marriage)], ['goals/kitchen', structuredClone(kitchen)],
    ['goals/marriage/entries/appliances', structuredClone(purchase)],
    ['goals/kitchen/entries/original', { ...purchase, amount: 2000, note: 'Original purchase awaiting refund' }],
  ]);
  const run = async (id, expected, next, destination = 'marriage', options = {}) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = version, changes = [];
      let writing = false;
      const tx = {
        read: async (path) => { assert.equal(writing, false, 'Firestore requires all reads before writes'); return structuredClone(docs.get(path)); },
        update: (path, patch) => { writing = true; changes.push([path, { ...docs.get(path), ...patch }]); },
        create: (path, data) => { writing = true; changes.push([path, data]); },
        remove: (path) => { writing = true; changes.push([path, null]); },
      };
      await stageBucketEntryChange(tx, 'marriage', 'appliances', id, expected, next, destination);
      if (current !== version) continue;
      if (options.fail) throw new Error('commit failed');
      changes.forEach(([path, data]) => data ? docs.set(path, data) : docs.delete(path));
      version++;
      if (options.loseAcknowledgement) throw new Error('acknowledgement lost');
      return;
    }
    throw new Error('conflict limit');
  };
  return { docs, run };
}
test('failed moves publish neither totals, entry changes nor a receipt', async () => {
  const db = database(), before = structuredClone(db.docs);
  await assert.rejects(db.run('move', purchase, purchase, 'kitchen', { fail: true }), /commit failed/);
  assert.deepEqual(db.docs, before);
});
test('a move is atomic, keeps metadata and is safe to retry after a lost acknowledgement', async () => {
  const db = database();
  db.docs.get('goals/marriage/entries/appliances').provenance = 'original';
  await assert.rejects(db.run('move', purchase, purchase, 'kitchen', { loseAcknowledgement: true }), /acknowledgement/);
  const receipt = db.docs.get('goals/marriage/entryChanges/move');
  // Firestore does not preserve JS insertion order when returning maps.
  receipt.request = Object.fromEntries(Object.entries(receipt.request).reverse());
  await db.run('move', purchase, purchase, 'kitchen');
  assert.equal(db.docs.has('goals/marriage/entries/appliances'), false);
  assert.equal(db.docs.get('goals/kitchen/entries/appliances').provenance, 'original');
  assert.equal(db.docs.get('goals/kitchen/entries/original').amount, 2000);
  assert.equal(db.docs.get('goals/marriage').spent, 3050);
  assert.equal(db.docs.get('goals/kitchen').spent, 3550);
  await assert.rejects(db.run('move', purchase, { ...purchase, amount: 10 }, 'kitchen'), /already saved/);
});
test('deleting twice with the same operation restores the funds once', async () => {
  const db = database();
  await db.run('delete', purchase, null);
  await db.run('delete', purchase, null);
  assert.equal(db.docs.get('goals/marriage').spent, 3050);
  await assert.rejects(db.run('another-delete', purchase, null), /changed or was removed/);
});
test('concurrent edits reject the stale writer rather than overwriting a newer correction', async () => {
  const db = database();
  const result = await Promise.allSettled([
    db.run('edit-one', purchase, { ...purchase, amount: 5000 }),
    db.run('edit-two', purchase, { ...purchase, amount: 4000 }),
  ]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  const entry = db.docs.get('goals/marriage/entries/appliances');
  assert.equal(db.docs.get('goals/marriage').spent, 3050 + entry.amount);
  assert.equal(entry.revision, 1);
});
test('moving into a missing bucket or colliding entry never discards the source', async () => {
  const db = database();
  await assert.rejects(db.run('missing', purchase, purchase, 'missing'), /no longer available/);
  db.docs.set('goals/kitchen/entries/appliances', { ...purchase, amount: 1 });
  await assert.rejects(db.run('collision', purchase, purchase, 'kitchen'), /already exists/);
  assert.equal(db.docs.get('goals/marriage').spent, 4300);
});
