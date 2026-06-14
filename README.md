# Keela

An AI-powered personal finance website — the cloud home of Keela, the soul who keeps the 70/30 pact.

A beautiful, installable iPhone PWA over a single cloud source of truth (Firestore), with Keela
reachable three ways from one backend: the terminal (Claude Code), the Claude app (custom connector),
and light AI inside the app itself.

> Greenfield rebuild. Replaces the old local `Savor` app (Vite + Express + SQLite). Real financial
> data is imported once from `savor.db`; none of the old code carries over.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md). One brain (Firebase Functions over Firestore), three faces.

## Data model

See [docs/DATA_MODEL.md](./docs/DATA_MODEL.md).

## Layout (planned)

```
keela/
├── web/          # React + Vite + Tailwind PWA (the website)
├── functions/    # Firebase Functions — the "one brain": /mcp + /keela
├── scripts/      # one-off tooling (savor.db → Firestore migration)
├── firestore.rules
└── docs/
```

## Status

Foundation only. Blocked on Firebase project setup (Phase 0) before anything runs.
