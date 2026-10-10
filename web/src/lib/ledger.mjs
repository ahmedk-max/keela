import { assertSameOperation, bucketEntryChange } from "./money.mjs";

// The adapter stages both writes in one database transaction. Read the entry
// first so a retried acknowledgement never applies the balance change twice.
export async function stageMovement(
  transaction,
  path,
  operationId,
  input,
  derive,
) {
  const entryPath = `${path}/entries/${operationId}`;
  const prior = await transaction.read(entryPath);
  if (prior) {
    assertSameOperation(prior, input);
    return false;
  }
  const parent = await transaction.read(path);
  const { patch, entry } = derive(parent, input);
  transaction.update(path, patch);
  transaction.create(entryPath, entry);
  return true;
}

export const entrySnapshot = (entry) => ({
  type: entry.type, amount: entry.amount, date: (entry.date || "").slice(0, 10),
  note: entry.note?.trim() || null, revision: entry.revision || 0,
  balanceField: entry.balanceField || null,
});
const stableJSON = (value) => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v);

// Receipts make edits, deletes and moves safe to retry even after the original
// entry has moved/disappeared. All reads precede all writes for Firestore.
export async function stageBucketEntryChange(tx, sourceId, entryId, operationId, expected, input, destinationId = sourceId, originalAction = null) {
  const sourcePath = `goals/${sourceId}`, entryPath = `${sourcePath}/entries/${entryId}`;
  const receiptPath = `${sourcePath}/entryChanges/${operationId}`;
  const request = { entryId, expected: entrySnapshot(expected), input: input ? entrySnapshot(input) : null, destinationId, originalAction };
  const receipt = await tx.read(receiptPath);
  if (receipt) {
    if (stableJSON(receipt.request) !== stableJSON(request))
      throw new Error("This correction was already saved with different details. Reopen the activity list.");
    return false;
  }
  const before = await tx.read(entryPath);
  if (!before || JSON.stringify(entrySnapshot(before)) !== JSON.stringify(request.expected))
    throw new Error("This entry has changed or was removed. Reopen the activity list before trying again.");
  const source = await tx.read(sourcePath);
  const moving = !!input && destinationId !== sourceId;
  const targetPath = `goals/${destinationId}`, targetEntryPath = `${targetPath}/entries/${entryId}`;
  const target = moving ? await tx.read(targetPath) : null;
  if (moving && !target) throw new Error("The destination bucket is no longer available.");
  if (moving && await tx.read(targetEntryPath)) throw new Error("An entry with this ID already exists in the destination bucket.");
  const { sourcePatch, targetPatch, entry } = bucketEntryChange(source, before, input, target, originalAction);
  tx.update(sourcePath, sourcePatch);
  if (moving) tx.update(targetPath, targetPatch);
  if (!entry || moving) tx.remove(entryPath);
  if (entry) tx.create(moving ? targetEntryPath : entryPath, { ...before, ...entry, revision: (before.revision || 0) + 1 });
  tx.create(receiptPath, {
    request, before, sourceBefore: { allocated: source.allocated || 0, spent: source.spent || 0 },
    ...(target ? { targetBefore: { allocated: target.allocated || 0, spent: target.spent || 0 } } : {}),
  });
  return true;
}
