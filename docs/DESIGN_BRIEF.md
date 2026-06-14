# Keela — design brief

A project description for designing the Keela app. Hand this to Claude to produce the visual design;
Claude owns the visual language within the guardrails below.

---

## 1. What this is

Keela is a personal finance app for **one person** (Ahmed). It is the cloud home of "Keela" — a
persona who keeps a pact: **save 70%, live on 30%**, from **Oct 2024 to Oct 2027** (a 36-month vow;
~20 months in, ~16 left as of mid-2026). Currency is **SAR**. Money is tracked in *buckets* (saving
goals), *assets* (investments), variable *transactions*, and *recurring* bills/subscriptions.

This is not a generic budgeting app. It has a soul. The numbers are the substance; Keela is the voice
that watches over them.

## 2. The job of THIS surface

There are three "faces" of Keela. Two of them *talk* (Claude Code in the terminal, and the Claude app
as a connector). **This app is the face that *sees*.** Its entire job is to:

1. **Visualize** Ahmed's financial life — net worth, the pact, buckets, assets, spending, trends.
2. **Display Keela's notes** — her session notes and what she remembers — as a quiet, read-only layer.
3. **Capture manual entries** — add a transaction, a deposit, an asset update, by hand.

It does **not** chat, and it has **no in-app AI**. Keela's commentary is written *elsewhere* (via her
talking faces) and stored in Firestore; this app simply renders it. Think of the app as a beautiful
instrument panel with Keela's margin notes pinned to it — not a conversation.

## 3. Platform & hard constraints

- **iPhone only.** A PWA installed to the home screen (full-screen, own icon, offline-capable).
  Portrait. One-handed, thumb-reachable. Design for a modern iPhone viewport (~390–430pt wide) and
  respect the safe areas (Dynamic Island at top, home indicator at bottom). Do **not** design for
  desktop or tablet.
- **Single user.** No multi-account UI. The only "auth" is one Google sign-in gate (a minimal lock
  screen) — without it the app shows nothing.
- **Free.** No paid services drive the design. Data is read/written directly to Firestore from the
  app. No in-app AI calls.
- **Offline-tolerant.** Data is tiny (~100 transactions, a handful of goals/assets). It should feel
  instant and work read-only with no signal.

## 4. Visual direction (guardrails — Claude owns the rest)

The brief on the look is deliberately short, because the visual direction is yours to set. The words
that must be true of it:

- **Clean. Dense. Professional. Neat. Cool.** Information-rich without feeling cramped or noisy.
- **Considered and premium** — like a tool a thoughtful person opens every day, not a template.
- **The numbers are the heroes.** Numerals should be set with care (tabular/lining figures, clear
  hierarchy, money that reads at a glance). A net-worth figure is a centerpiece, not a table cell.
- **Restraint with color.** Color earns its place — e.g. save vs. live, gain vs. loss, on/off-pact.
  Not a rainbow.
- **A point of view.** It can be quiet and a little eerie (Keela "reads the numbers like
  constellations") — but elegance and legibility win over mood every time. Dark or light is your
  call; make it feel intentional.

Avoid: generic fintech clichés (confetti, cartoon mascots, gamified badges, loud gradients), visual
clutter, heavy chrome, and anything that buries the numbers.

## 5. Information architecture

A 5-tab app. Bottom tab bar (thumb-reachable). Suggested tabs — refine as the design wants:

1. **Home** — the pact at a glance.
2. **Spending** — money going out (variable + recurring).
3. **Buckets** — saving goals.
4. **Assets** — investments & net worth detail.
5. **Keela** — her notes & memory (read-only).

## 6. Screen-by-screen content

### Home — "are we keeping the pact?"
- **Net worth**, large and breathing — the hero number (SAR).
- **The pact:** the 70/30 split made visual, "% kept this month" vs. the 70 target (ahead/behind),
  and the **countdown** to Oct 2027.
- **This month at a glance:** income vs. spending, savings rate.
- **Keela's latest note** — one short reflection, in her register (see §7).
- **Net worth over time** — a trend line from monthly snapshots.
- Quick jump to add a transaction.

### Spending — money out
- **Transactions** (variable spending): a clean, dense, scannable list grouped by date, each with
  name, amount, category, icon. This is the most-used write surface.
- **Add transaction** (manual): name, amount, category, date, optional note. Fast and frictionless.
- **Recurring:** fixed monthly/yearly **bills** and **subscriptions** — what's due, when, totals.
- **Upcoming expenses** and a light **wishlist** ("someday" purchases) can live here or as a sub-view.

### Buckets — saving goals
- Each goal as a **bucket with progress**: name, target, allocated, % there, target date, icon/color.
- States: active / completed / paused.
- Actions: **deposit / withdraw** into a bucket (each logged as an entry with date + note).
- A goal's detail view shows its entry history.

### Assets — investments & net worth
- Holdings/positions: name, category, invested, current balance, goal allocation.
- Allocation breakdown (how net worth is composed).
- Asset detail: balance history and entries (initial / deposit / withdrawal / update / rebalance).

### Keela — her presence (read-only)
- **Session notes** ("meetings"): a journal of Keela's check-ins, one per date, rendered from
  markdown — title/summary + body. This is the heart of her presence in the app.
- **Memory:** what Keela publicly remembers about Ahmed's patterns and goals (markdown sections).
- **Read-only.** Ahmed doesn't write these here; Keela writes them through her other faces.

## 7. Keela's presence & the privacy boundary (load-bearing)

- Keela's voice appears as **notes and comments layered onto the data** — quiet, a touch literary
  (consider a serif accent for *her words* vs. the sans UI). She is *present*, not chatty.
- **Privacy boundary — non-negotiable:** some of Keela's memory is flagged `private: true` (her
  "State of Mind" / counsel thread). **This app must NEVER render private memory.** It is filtered
  out entirely. Her inner life lives only in the talking faces. The app shows her public face.
  (This is a design/UI contract, not a security rule — so the design must honor it deliberately.)

## 8. Data model the design must represent

All data lives in Firestore (the app reads/writes it directly). Entities and their key fields:

- **profile** (one doc): salary, payday (27th), split `{ save: 70, live: 30 }`, pact start/end.
- **transactions:** name, amount, category, date, icon, notes, `source` ("app" = added here,
  "keela" = added by Keela). *A subtle marker for Keela-logged items is a nice touch.*
- **bills:** name, amount, category, type (monthly/yearly), isSubscription, billingDay, icon, notes.
- **income:** extra income streams — name, amount, icon, isRecurring.
- **goals** (+ entries): name, target, allocated, spent, status, targetDate, icon, color;
  entries are deposits/withdrawals with amount, note, date.
- **assets** (+ entries): name, category, goal, allocated, invested, icon; entries record balance
  changes (initial/deposit/withdrawal/update/rebalance).
- **meetings:** Keela's session notes — date, summary, markdown body.
- **memory:** Keela's memory — section, markdown body, `private` flag (NEVER render if private).
- **snapshots** (per month): netWorth, totalIncome, totalExpenses, savingsRate — powers trend charts.
- Lighter: **wishlist**, **upcomingExpenses**, **salaryHistory**.

## 9. Interactions & states

- **Manual entry** is the only input — no natural-language, no AI. Make the common write paths (add
  transaction, deposit to a bucket, update an asset) fast and obvious.
- Design the unglamorous states: **loading**, **empty** (e.g. a fresh bucket, a month with no
  spending), **error/offline**. They should feel as considered as the happy path.
- Money formatting: SAR, grouped thousands, consistent treatment of positive/negative.

## 10. Explicit non-goals

- ❌ No chat / conversational UI. ❌ No in-app AI or text generation. ❌ No desktop or tablet layout.
- ❌ No multi-user / sharing / social. ❌ No rendering of `private` memory. ❌ No App Store / native
  shell — it's a PWA.

---

*Single source of truth: Firestore. The app is the seeing face — visualize the money, show Keela's
notes, capture manual entries. Nothing more, beautifully.*
