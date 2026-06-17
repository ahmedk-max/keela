# Keela bridge — the "thinking" face

This is Keela's MCP server: structured, read/write access to the **same Firestore**
the PWA uses. It is how Keela's intelligence (Claude Code in the terminal now, the
Claude app on the phone later) actually touches the money — there is no in-app AI and
no Firebase Functions. It runs locally, on demand, on Ahmed's machine: **$0, no card,
no Anthropic API key.**

## What it exposes (11 tools)

**Read** — `get_summary`, `recent_transactions`, `list_goals`, `check_affordability`,
`recent_meetings`, `read_memory`
**Write** — `add_transaction`, `goal_deposit`, `goal_withdraw`, `log_meeting`,
`update_memory`

`get_summary` and `check_affordability` use the exact pay-cycle (27→27) and cashflow math
as the PWA (mirrored from `web/src/data/useKeelaData.js`), so every number agrees.

## Privacy boundary

`read_memory` excludes `private: true` memory (State of Mind / counsel) by default —
the same content the PWA refuses to render. Pass `include_private: true` only when Keela
needs her own interior notes. `update_memory` can set `private: true` to write notes that
will never surface in the app.

## Setup (local — terminal Keela)

Requires `serviceAccountKey.json` at the repo root (gitignored).

```bash
cd bridge && npm install
npm run smoke   # read-only: prints the live summary + collection counts
```

The repo's `.mcp.json` already registers this server, so any Claude Code session started
in this project picks it up as the `keela` MCP server (`node bridge/keela-mcp.mjs`).

## Later — phone Keela (remote connector)

The Claude app connects to MCP servers over **public HTTPS**, so the phone face needs this
same tool surface deployed to a free serverless tier (Cloudflare Workers or Deno Deploy —
**not** Firebase Functions, per the cost constraint) behind a bearer token, reaching
Firestore via the REST API + a service-account-signed JWT (firebase-admin's gRPC stack
doesn't run on edge runtimes). The tool implementations here are written to port directly.
Not built yet — it's the next step.
