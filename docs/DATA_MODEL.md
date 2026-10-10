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
entry: { type: "deposit"|"withdrawal"|"spend", amount, note, date,
         balanceField?: "allocated"|"spent", revision?: number, createdAt?, updatedAt? }
```
_(from `savings_goals` + `goal_logs`)_

Bucket activity supports editing, deleting and moving an entry to another bucket.
Every correction updates the affected bucket totals and entry in a single Firestore
transaction. It adjusts only that entry's effect, preserving any opening balance.
Edits retain metadata and increment `revision`; stale forms must reopen before saving.
`goals/{sourceId}/entryChanges/{operationId}` holds the correction request, original
entry and previous totals, providing an audit record and an idempotent retry receipt.
These receipts are not activity entries and are not included in the activity subscription.

Deposits increase `allocated`, app withdrawals reduce `allocated`, and spending
increases `spent`. Older bridge withdrawals increased `spent` instead. New entries
record `balanceField` to disambiguate this; unmarked historical withdrawals require
the user to choose their original meaning before editing/deleting. Bucket balances
must remain nonnegative, and archived buckets must be restored before corrections.

## `portfolios/{id}` — investment portfolios (the grouping above holdings)
```
{ name, target, targetDate: "YYYY-MM", color, icon, note, createdAt }
```
A portfolio has a savings-style **goal** (`target` + `targetDate`); its balance is the sum of the
holdings (`assets`) that point to it via `portfolioId`. New in the overhaul.

## `assets/{id}` + subcollection `assets/{id}/entries/{id}` — holdings inside a portfolio
```
asset: { name, portfolioId, kind: "cash"|"position", category,
         units: number|null,   // null for cash
         allocated,            // SAR cost basis held = the holding's balance (units × avg cost)
         color, icon, note, createdAt }
entry: { type: "buy"|"sell"|"deposit"|"withdraw",
         units, price,         // per-unit, for buy/sell (positions)
         amount,               // SAR moved (buy: units×price; sell: proceeds; cash: the amount)
         costRemoved,          // sell only: cost basis removed = units × avg cost at sale
         note, date }
```
**Cost-basis only — no live prices, no mark-to-market, no P/L** (deliberate, to stay simple). A
holding's `allocated` is its net invested: **buy**/`deposit` raise it, **sell**/`withdraw` lower it.
A sell removes cost at the running average (`avg = allocated ÷ units`), so **avg cost is unchanged
by sells**; proceeds are recorded for reference but never turned into a gain/loss figure. `avgCost`
and per-portfolio roll-ups are computed in the client. Holdings with no/!matching `portfolioId`
fall into a synthetic default portfolio so nothing is orphaned. Everything is SAR.
_(from `assets` + `asset_logs`; `kind`/`units`/`portfolioId` are new — the old `goal`/`invested`/
`update`/`initial` fields are superseded by the portfolio `target` and the buy/sell log.)_

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
