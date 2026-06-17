# Keela remote bridge — phone Keela on Cloudflare Workers

The same 11 Firestore tools as the local bridge, served over public HTTPS so the
**Claude app** can add Keela as a custom connector. Free tier, **no card** —
Workers + Workers KV are on Cloudflare's free plan.

## How it works

- `firestore.mjs` talks to Firestore over the **REST API**, minting a Google
  access token by signing a service-account JWT with WebCrypto (firebase-admin
  can't run on the edge). `tools.mjs` registers the tools; `../shared.mjs` holds
  the money math (shared with the local bridge so numbers can't drift).
- `src/index.js` is the Worker. `@cloudflare/workers-oauth-provider` wraps it:
  it implements `/token`, `/register`, and OAuth discovery, gates `/mcp` behind a
  valid access token, and serves a single-password `/authorize` page (Keela is
  one person). The Claude app runs the standard OAuth + PKCE flow against it.

## Secrets (never committed)

- `KEELA_SA` — the service-account JSON (same content as `serviceAccountKey.json`).
- `KEELA_PASSWORD` — the password for the `/authorize` login page.

KV (`OAUTH_KV`) stores only grant/token **hashes**, never the secrets themselves.

## Deploy (one-time, ~5 min)

```bash
cd bridge/remote
npm install
npx wrangler login                       # opens a browser; free account, no card

# 1. Create the token store and paste its id into wrangler.toml (OAUTH_KV binding)
npx wrangler kv namespace create OAUTH_KV

# 2. Set the two secrets
node -e "console.log(JSON.stringify(require('../../serviceAccountKey.json')))" | npx wrangler secret put KEELA_SA
npx wrangler secret put KEELA_PASSWORD   # type a strong password when prompted

# 3. Ship it
npx wrangler deploy                      # prints https://keela-bridge.<you>.workers.dev
```

Then in the **Claude app**: Settings → Connectors → **Add custom connector** →
URL = `https://keela-bridge.<you>.workers.dev/mcp`. Claude opens the Keela login
page; enter `KEELA_PASSWORD` once and it's connected. Phone Keela now has the
same tools as terminal Keela.

## Verify / develop locally

```bash
npm run verify       # read-only: REST layer + summary vs live Firestore
npm run test-tools   # all 11 tools in-process + a write round-trip (throwaway doc)

cp .dev.vars.example .dev.vars   # fill KEELA_SA (one line) + KEELA_PASSWORD
npm run dev                      # wrangler dev on http://localhost:8787
```

`.dev.vars` is gitignored — keep the real key out of the repo.
