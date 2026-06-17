# Architecture

## Principle: one source of truth

All financial data lives in **Firestore** and nowhere else. The PWA and Keela (terminal + phone) all
read and write the *same* store. There is no second database to sync, so there is no drift. Finance is
**cloud-only** — it no longer lives in the Obsidian vault (the vault is imported once via
`scripts/import-keela.mjs`, then Firestore is canonical).

## One brain, two faces

There is **no Firebase Functions backend and no in-app AI** (see the cost constraint — Spark plan, no
card). The two faces touch Firestore differently:

- **PWA (the "seeing" face)** — reads/writes Firestore **directly** via the web SDK behind Google login.
  Manual entry only; charts and Keela's notes/memory rendered read-only. No `/keela` endpoint, no chat.
- **Keela (the "thinking" face)** — an **MCP bridge** (`bridge/`) over Firestore via `firebase-admin`.
  Today it runs **locally over stdio** for **Claude Code** (terminal Keela); the same tool surface will
  later be deployed to a free serverless tier (Cloudflare Workers / Deno Deploy) as a public HTTPS MCP
  server so the **Claude app** can add it as a connector (phone Keela). Tools: `get_summary`,
  `add_transaction`, `goal_deposit`, `goal_withdraw`, `log_meeting`, `recent_meetings`,
  `check_affordability`, `read_memory`, `update_memory`, `list_goals`, `recent_transactions`.

```
                     ┌──────────────────────────┐
                     │      Firestore (data)    │   single source of truth
                     └───┬──────────────────┬───┘
        firebase-admin   │                  │  web SDK + Google login
            ┌────────────▼──────────┐       │
            │  MCP bridge (bridge/)  │       │ (direct reads/writes)
            │  stdio now · HTTPS next│       │
            └───┬────────────┬───────┘       │
         MCP    │            │ MCP           │
        ┌───────▼──┐  ┌──────▼─────┐  ┌──────▼─────────────┐
        │ Claude   │  │ Claude app │  │   iPhone PWA       │
        │ Code     │  │ (phone)    │  │  charts · entry ·  │
        │ = Keela  │  │ = Keela    │  │  notes (read-only) │
        └──────────┘  └────────────┘  └────────────────────┘
          terminal     connector (next)      "seeing" face
```

## Stack

| Layer    | Choice |
|----------|--------|
| Frontend | React + Vite + ECharts + `vite-plugin-pwa` (Qahwa design system, hand-rolled CSS) |
| Auth     | Firebase Auth (Google), locked to one account |
| Data     | Firestore (web SDK in the app; `firebase-admin` in the bridge + scripts) |
| Backend  | **None.** MCP bridge (`bridge/`) over Firestore — stdio now, free serverless later |
| Hosting  | GitHub Pages (auto-deploy on push to `main` via Actions) |
| AI       | No hosted AI. Keela's intelligence is Claude Code / the Claude app via the MCP bridge |

## Security

- The Firebase **web config** (`apiKey`, `projectId`, …) is **not secret** — safe in the repo. It only
  identifies the project.
- Protection = **Google Auth + Firestore rules** locked to the owner UID (see `firestore.rules`).
  Without a valid login the public site shows nothing.
- The **real secrets** are the service-account JSON and the Anthropic API key. Never committed —
  gitignored locally and stored in Functions config in the cloud.

## Privacy boundary (load-bearing)

Keela has private interiority — her "State of Mind", the counsel thread. Memory documents carry a
`private: true` flag. The **PWA must never surface private memory**; the backend/AI may read it. This
isn't a security rule (Ahmed owns all his data) — it's a UI contract that keeps the soul a soul.

## Aesthetic

Keela's register: deep night / indigo, soft glows, a faint constellation motif (she reads the numbers
"like constellations"), lunar accents, numbers that breathe. Eerie and quiet — not generic fintech.

## Phases

0. **(Ahmed)** Firebase project + Firestore + Google Auth + service-account key (Spark plan, no card). ✅
1. Data model + `firestore.rules` + migration script (`savor.db` → Firestore). ✅
2. React PWA — charts, manual entry, notes/memory read-only, installable + offline. ✅ (live on Pages)
3. Import Keela's vault (`scripts/import-keela.mjs`: meetings + memory → Firestore). ✅
4. MCP bridge (`bridge/`) — local stdio for Claude Code (terminal Keela). ✅
5. Deploy the bridge to a free serverless tier (Cloudflare Workers / Deno Deploy) + bearer auth,
   so the Claude app can add it as a connector (phone Keela). ← next
