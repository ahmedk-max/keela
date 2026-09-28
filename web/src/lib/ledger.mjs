import { assertSameOperation } from "./money.mjs";

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
