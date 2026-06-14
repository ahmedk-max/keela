# Firestore data model

Single-user app. Top-level collections (no `users/{uid}` nesting needed — the rules lock everything to
one account). Document IDs are Firestore auto-IDs unless noted. Currency is **SAR**. Dates are ISO
strings (`YYYY-MM-DD`); timestamps are Firestore `Timestamp`.

> Mapping note: this replaces the old `savor.db` SQLite schema. The migration script
> (`scripts/migrate.mjs`) reads each table and writes the collections below. Integer PKs become
> auto-IDs; the old `goal_logs` / `asset_logs` join tables become **subcollections**.

## `profile` — one document, id `main`
```
{ currency: "SAR", salary: number, payday: 27,
  split: { save: 70, live: 30 },
  pactStart: "2024-10", pactEnd: "2027-10",
  updatedAt: Timestamp }
```
_(from `cashflow` + the pact constants in finance.md)_

## `income/{id}` — extra income streams
```
{ name, amount, icon, isRecurring: bool, createdAt }
```
_(from `other_income`)_

## `bills/{id}` — recurring fixed expenses & subscriptions
```
{ name, amount, category, type: "monthly"|"yearly",
  isSubscription: bool, billingDay: number|null, notes, icon, createdAt }
```
_(from `expenses`)_

## `transactions/{id}` — variable spending (the PWA writes these most)
```
{ name, amount, category, date: "YYYY-MM-DD", icon, notes, source: "app"|"keela"|"nl", createdAt }
```
_(from `expense_logs`; `source` is new — tracks who logged it)_

## `goals/{id}` + subcollection `goals/{id}/entries/{id}`
```
goal:  { name, target, allocated, spent, status: "active"|"completed"|"paused",
         targetDate, icon, color, createdAt }
entry: { type: "deposit"|"withdrawal", amount, note, date }
```
_(from `savings_goals` + `goal_logs`)_

## `assets/{id}` + subcollection `assets/{id}/entries/{id}`
```
asset: { name, category, goal, allocated, invested, icon, createdAt }
entry: { type: "initial"|"deposit"|"withdrawal"|"update"|"rebalance",
         amountChange, newBalance, note, date }
```
_(from `assets` + `asset_logs`)_

## `meetings/{id}` — Keela's session notes  (id = `YYYY-MM-DD`)
```
{ date, summary, body: "<markdown>", refs: [string], createdAt }
```
_(from `Personal/Finance/Meetings/*.md` — imported once, then cloud-only)_

## `memory/{id}` — Keela's memory
```
{ scope: "hot"|"archive", section, body: "<markdown>",
  private: bool,   // true = State of Mind / counsel — PWA must NOT render
  updatedAt }
```
_(from `Souls/memory/_keela-memory.md` + `_keela-archive.md`)_

## `snapshots/{monthKey}` — monthly history for trend charts  (id = `YYYY-MM`)
```
{ monthKey, netWorth, totalIncome, totalExpenses, savingsRate, dataJson, createdAt }
```
_(from `history_snapshots`; can be backfilled/derived)_

---

### Also carried over (lighter)
- `wishlist/{id}` — `{ name, amount, category, priority, url, notes, status }`
- `upcomingExpenses/{id}` — `{ name, amount, category, dueDate, isMandatory, isRecurring, status }`
- `salaryHistory/{id}` — `{ source, amount, effectiveFrom, effectiveTo, notes }`

### Computed in the client, not stored
Summary, insights, affordability, monthly history, the LLM prompt — all of the old server's SQL
aggregations become plain JS over these collections (data is tiny: ~100 transactions, 8 goals).
