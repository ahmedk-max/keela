import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DEMO, demoRaw } from "./demo";
import { stageMovement } from "../lib/ledger.mjs";

export const operationId = () => doc(collection(db, "_ids")).id;
const keyFor = (key: string) => (key === "upcomingExpenses" ? "upcoming" : key);
let failDemo = DEMO && new URLSearchParams(location.search).has("failSave");
type Change = { path: string; data?: any; remove?: boolean };
function demoRead(path: string): any {
  const [col, id, child, eid] = path.split("/");
  const raw = demoRaw as any;
  if (child === "entries") return raw.entries.find((x: any) => x.path === path);
  if (col === "profile") return raw.profile;
  return (raw[keyFor(col)] || []).find((x: any) => String(x.id) === id);
}
function demoCommit(changes: Change[]) {
  const raw = demoRaw as any;
  for (const { path, data, remove } of changes) {
    const [col, id, child] = path.split("/");
    if (child === "entries") {
      raw.entries = raw.entries.filter((x: any) => x.path !== path);
      if (!remove) raw.entries.push({ path, ...data });
    } else if (col === "profile") raw.profile = { ...raw.profile, ...data };
    else {
      const key = keyFor(col),
        old = demoRead(path);
      raw[key] = (raw[key] || []).filter((x: any) => String(x.id) !== id);
      if (!remove) raw[key].push({ ...old, ...data, id });
    }
  }
  window.dispatchEvent(new Event("keela:demo-change"));
}
export async function ensureWritable() {
  if (!navigator.onLine)
    throw new Error(
      "You’re offline. Your draft is kept here; reconnect to save.",
    );
  if (DEMO) {
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (failDemo) {
      failDemo = false;
      throw new Error("Couldn’t save. Your draft is still here. Try again.");
    }
  }
}
export async function saveRecord(
  col: string,
  id: string,
  fields: any,
  create = false,
) {
  await ensureWritable();
  const path = `${col}/${id}`;
  if (DEMO) {
    if (create && demoRead(path)) return id;
    demoCommit([{ path, data: fields }]);
    return id;
  }
  await runTransaction(db, async (tx) => {
    const ref = doc(db, path),
      snap = await tx.get(ref);
    if (create && snap.exists()) return;
    if (!create && !snap.exists())
      throw new Error("This record is no longer available. Reopen the list.");
    if (create) tx.set(ref, { ...fields, createdAt: serverTimestamp() });
    else tx.update(ref, fields);
  });
  return id;
}
export async function removeRecord(col: string, id: string) {
  await ensureWritable();
  if (DEMO) {
    demoCommit([{ path: `${col}/${id}`, remove: true }]);
    return;
  }
  const batch = writeBatch(db);
  batch.delete(doc(db, col, id));
  await batch.commit();
}
export async function recordMovement(
  path: string,
  id: string,
  input: any,
  derive: (parent: any, input: any) => any,
) {
  await ensureWritable();
  if (DEMO) {
    const changes: Change[] = [];
    await stageMovement(
      {
        read: async (p: string) => demoRead(p),
        update: (p: string, fields: any) =>
          changes.push({ path: p, data: fields }),
        create: (p: string, fields: any) =>
          changes.push({ path: p, data: fields }),
      },
      path,
      id,
      input,
      derive,
    );
    demoCommit(changes);
    return;
  }
  await runTransaction(db, async (tx) =>
    stageMovement(
      {
        read: async (p: string) => {
          const snap = await tx.get(doc(db, p));
          return snap.exists() ? snap.data() : null;
        },
        update: (p: string, fields: any) => tx.update(doc(db, p), fields),
        create: (p: string, fields: any) =>
          tx.set(doc(db, p), { ...fields, createdAt: serverTimestamp() }),
      },
      path,
      id,
      input,
      derive,
    ),
  );
}

export async function archiveGoal(id: string, archived: boolean) {
  await ensureWritable();
  const path = `goals/${id}`;
  const check = (g: any) => {
    if (!g) throw new Error("This bucket is no longer available.");
    if (
      archived &&
      Math.round(((g.allocated || 0) - (g.spent || 0)) * 100) !== 0
    )
      throw new Error(
        "Withdraw or record the remaining balance before archiving.",
      );
  };
  if (DEMO) {
    check(demoRead(path));
    demoCommit([{ path, data: { archived, pinned: false } }]);
    return;
  }
  await runTransaction(db, async (tx) => {
    const ref = doc(db, path),
      snap = await tx.get(ref);
    check(snap.exists() ? snap.data() : null);
    tx.update(ref, { archived, pinned: false });
  });
}
export async function createHolding(id: string, fields: any, opening: any) {
  await ensureWritable();
  const path = `assets/${id}`;
  if (DEMO) {
    if (demoRead(path)) return id;
    demoCommit([
      { path, data: fields },
      ...(opening ? [{ path: `${path}/entries/opening`, data: opening }] : []),
    ]);
    return id;
  }
  await runTransaction(db, async (tx) => {
    const ref = doc(db, path),
      snap = await tx.get(ref);
    if (snap.exists()) return;
    tx.set(ref, { ...fields, createdAt: serverTimestamp() });
    if (opening) tx.set(doc(db, `${path}/entries/opening`), opening);
  });
  return id;
}
export async function savePreferences(
  profile: any,
  streams: any[],
  previous: any[],
) {
  await ensureWritable();
  const salary = streams.find((s) => s.id === "salary");
  if (!salary) throw new Error("Salary must remain in your income settings.");
  const changes: Change[] = [
    {
      path: "profile/main",
      data: {
        salary: salary.amount,
        payday: profile.payday,
        split: profile.split,
      },
    },
  ];
  for (const s of streams.filter((s) => s.id !== "salary"))
    changes.push({
      path: `income/${s.id}`,
      data: { name: s.name, amount: s.amount, isRecurring: s.recurring },
    });
  for (const s of previous.filter(
    (s) => s.id !== "salary" && !streams.some((x) => x.id === s.id),
  ))
    changes.push({ path: `income/${s.id}`, remove: true });
  if (DEMO) {
    demoCommit(changes);
    return;
  }
  const batch = writeBatch(db);
  for (const c of changes) {
    const ref = doc(db, c.path);
    if (c.remove) batch.delete(ref);
    else batch.set(ref, c.data, { merge: true });
  }
  await batch.commit();
}
export async function saveCategoryBudget(category: string, amount: number) {
  await ensureWritable();
  const update = (p: any) => {
    const budgets = { ...(p.categoryBudgets || {}) };
    if (amount > 0) budgets[category] = amount;
    else delete budgets[category];
    return { categoryBudgets: budgets };
  };
  if (DEMO) {
    demoCommit([
      { path: "profile/main", data: update(demoRead("profile/main")) },
    ]);
    return;
  }
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "profile", "main"),
      snap = await tx.get(ref);
    if (!snap.exists())
      throw new Error("Your profile is unavailable. Reconnect and retry.");
    tx.update(ref, update(snap.data()));
  });
}
