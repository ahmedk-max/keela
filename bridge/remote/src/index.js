// Keela's remote MCP bridge — Cloudflare Worker.
//
// OAuthProvider wraps the whole Worker: it implements /token, /register and the
// OAuth metadata, gates /mcp behind a valid access token, and hands everything
// else to defaultHandler. We supply a single-password /authorize page (Keela is
// one person), so the Claude app can run the standard OAuth flow and reach the
// same 11 Firestore tools the terminal bridge exposes.
//
// Bindings (see wrangler.toml): KV namespace OAUTH_KV.
// Secrets: KEELA_SA (service-account JSON), KEELA_PASSWORD (the login password).
import { OAuthProvider } from '@cloudflare/workers-oauth-provider'
import { createMcpHandler } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { makeFirestore } from '../firestore.mjs'
import { registerTools } from '../tools.mjs'

// Reuse the Firestore client across requests in the same isolate so the OAuth
// access token it mints is cached (one token, not one per call).
let _fs = null
function getFs(env) {
  if (_fs) return _fs
  const sa = JSON.parse(env.KEELA_SA)
  _fs = makeFirestore({ clientEmail: sa.client_email, privateKey: sa.private_key, projectId: sa.project_id })
  return _fs
}

// /mcp — only reached with a valid access token (props are in ctx.props).
const apiHandler = {
  fetch(request, env, ctx) {
    const server = new McpServer({ name: 'keela', version: '1.0.0' })
    registerTools(server, getFs(env))
    return createMcpHandler(server)(request, env, ctx)
  },
}

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const loginPage = (actionUrl, error) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Keela</title><style>
  :root{color-scheme:light dark}
  body{font-family:ui-sans-serif,system-ui,sans-serif;background:#f4efe6;
    display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  form{background:#fff;border:1px solid #e2d8c8;padding:28px;width:300px;box-shadow:0 1px 0 #e2d8c8}
  h1{font:600 18px/1 ui-sans-serif,system-ui;margin:0 0 4px;color:#3a2f25}
  p{font:400 13px/1.4 ui-sans-serif;color:#8a7a68;margin:0 0 18px}
  input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d9ccba;font-size:15px;background:#fffdf8}
  button{width:100%;margin-top:14px;padding:11px;border:0;background:#b4451f;color:#fff;font:600 14px/1 ui-sans-serif;cursor:pointer}
  .err{color:#b4451f;font-size:13px;margin-top:10px}
</style></head><body>
<form method="POST" action="${actionUrl}">
  <h1>Keela</h1><p>Authorise this connector to your finances.</p>
  <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password">
  <button type="submit">Authorise</button>
  ${error ? `<div class="err">${error}</div>` : ''}
</form></body></html>`

const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })

// Everything that isn't a token-bearing /mcp request: the /authorize login UI + a landing page.
const defaultHandler = {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/authorize') {
      if (request.method === 'POST') {
        const form = await request.formData()
        if (!env.KEELA_PASSWORD || !safeEqual(String(form.get('password') || ''), env.KEELA_PASSWORD)) {
          return html(loginPage(url.pathname + url.search, 'Wrong password.'), 401)
        }
        const req = await env.OAUTH_PROVIDER.parseAuthRequest(request)
        const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
          request: req,
          userId: 'ahmed',
          metadata: { label: 'Keela connector' },
          scope: req.scope?.length ? req.scope : ['keela'],
          props: {},
        })
        return Response.redirect(redirectTo, 302)
      }
      return html(loginPage(url.pathname + url.search))
    }
    return html('<!doctype html><title>Keela</title><p style="font-family:system-ui;padding:2rem">Keela bridge. Connect via the Claude app.</p>')
  },
}

export default new OAuthProvider({
  apiRoute: '/mcp',
  apiHandler,
  defaultHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
  scopesSupported: ['keela'],
})
