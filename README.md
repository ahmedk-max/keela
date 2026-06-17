# Keela

A personal finance app for one person, built around the **70/30 pact** (save 70%, live on 30%,
Oct 2024 → Oct 2027). An installable iPhone **PWA** sits over a single cloud source of truth
(Firestore); **Keela** — the intelligence — reaches the same data through an MCP bridge.

> Greenfield rebuild of the old local `Savor` app (Vite + Express + SQLite). Real financial data was
> imported once from `savor.db`; none of the old code carries over.

## Two faces, one source of truth

- **PWA (seeing)** — React + Vite + ECharts, installable + offline. Reads/writes Firestore directly
  via the web SDK behind Google login. Manual entry, charts, and Keela's notes/memory (read-only).
  **No in-app AI.** Live on GitHub Pages: <https://ahmedk-max.github.io/keela/>
- **Keela (thinking)** — an MCP bridge (`bridge/`) over Firestore. Runs locally over stdio for
  **Claude Code** today; deploys to a free serverless tier later so the **Claude app** can use it as a
  connector. No Firebase Functions, no hosted AI, no Anthropic key — **$0 on the Spark plan.**

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/DATA_MODEL.md](./docs/DATA_MODEL.md).

## Layout

```
keela/
├── web/        # React + Vite PWA (the "seeing" face)
├── bridge/     # MCP server over Firestore (the "thinking" face — Claude Code now)
├── scripts/    # one-off tooling (savor.db → Firestore migration, Obsidian import, rules deploy)
├── firestore.rules
└── docs/
```

## Status

PWA live on GitHub Pages; data migrated; Obsidian vault imported; MCP bridge running locally for
Claude Code. **Next:** deploy the bridge to a free serverless tier (+ bearer auth) for the Claude app
phone connector.
