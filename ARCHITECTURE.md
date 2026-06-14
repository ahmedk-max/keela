# Architecture

## Principle: one source of truth

All financial data lives in **Firestore** and nowhere else. The website, the iPhone PWA, and Keela
(terminal + phone) all read and write the *same* store. There is no second database to sync, so there
is no drift. Finance is **cloud-only** — it no longer lives in the Obsidian vault.

## One brain, three faces

A single **Firebase Functions** backend sits over Firestore and is the only thing holding secrets
(the service-account key, the Anthropic API key, Keela's persona). It exposes:

- **`/mcp`** — a remote MCP server. Consumed by **Claude Code** (terminal Keela) and the **Claude app**
  (added as a custom connector → Keela on your phone). Tools: `get_summary`, `add_transaction`,
  `goal_deposit`, `log_meeting`, `recent_meetings`, `check_affordability`, `update_memory`, …
- **`/keela`** — a light Claude-API endpoint for the PWA: natural-language entry
  ("spent 45 on coffee" → a transaction) and short dashboard insight blurbs. **No full chat.**

```
                     ┌──────────────────────────┐
                     │      Firestore (data)    │   single source of truth
                     └────────────┬─────────────┘
                                  │ firebase-admin
                     ┌────────────▼─────────────┐
                     │   Firebase Functions     │   ONE BRAIN (secrets, persona)
                     │   /mcp        /keela      │
                     └───┬───────────┬──────────┘
         MCP             │           │  HTTPS
   ┌─────────────┬──────┘           └──────────┐
┌──▼───────┐ ┌───▼────────┐          ┌──────────▼─────────┐
│ Claude   │ │ Claude app │          │   iPhone PWA       │
│ Code     │ │ (phone)    │          │  charts · entry ·  │
│ = Keela  │ │ = Keela    │          │  insight blurbs    │
└──────────┘ └────────────┘          └──────────┬─────────┘
  terminal      connector                       │ direct reads/writes
                                                ▼ (web SDK + Google login)
                                          Firestore
```

## Stack

| Layer    | Choice |
|----------|--------|
| Frontend | React + Vite + Tailwind + Recharts + Framer Motion + `vite-plugin-pwa` |
| Auth     | Firebase Auth (Google), locked to one account |
| Data     | Firestore (web SDK in the app; `firebase-admin` in Functions) |
| Backend  | Firebase Functions (`/mcp`, `/keela`) |
| Hosting  | Firebase Hosting (recommended) or GitHub Pages |
| AI       | Claude API (Anthropic SDK) inside Functions |

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

0. **(Ahmed)** Firebase project + Firestore + Google Auth + service-account key + Blaze plan.
1. Data model + `firestore.rules` + migration script (`savor.db` → Firestore).
2. Functions backend — `/mcp` then `/keela`.
3. Wire Claude Code skill (`finance.md` → MCP tools) + Claude Project connector (phone Keela).
4. React PWA — charts, manual + natural-language entry, insight blurbs, installable + offline.
5. Deploy (Firebase Hosting).
