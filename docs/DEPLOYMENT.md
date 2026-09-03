# Deploying AgentOS (Railway)

The console (`apps/web`) and the API (`apps/api`) are two separate processes.
Almost every "it works locally but not after deploying" report comes down to
one of three things: the web service cannot reach the API, the API's SQLite
file is on an ephemeral disk, or the signed-in organization has no rows.

This document shows how to check each one in under a minute.

---

## 1. Topology

```
                 ┌──────────────────────────┐
  browser  ──────▶  web  (Next.js, `next start`)
                 │  rewrites /api/* ────────┼──▶  api (Fastify, SQLite)
                 └──────────────────────────┘
```

Both services deploy from the same repository, so Railway needs an explicit
**Root Directory / Start Command** per service (the repo root has no `start`
script).

### API service

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Build command | `npm install` |
| Start command | `npm run dev -w @agentos/api` — or `npm run start -w @agentos/api` |
| Port | `4000` (Railway injects `PORT`; the API already reads it) |

### Web service

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Build command | `npm install && npm run build -w @agentos/web` |
| Start command | `npm run start -w @agentos/web` |
| Port | `3000` |

> `npm run build` at the repo root builds **only** the web app (see
> `package.json`). That is intentional — the API runs from TypeScript via
> `tsx` and has no build step.

---

## 2. Environment variables

### API service

| Variable | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | **yes** | Any long random string. If it changes, every existing session token is invalidated and users are logged out. |
| `DATABASE_PATH` | **yes (with a volume)** | Point at a mounted volume, e.g. `/data/agentos.db`. Without it the database lives on the container's ephemeral disk and is wiped on every deploy. |
| `PORT` | auto | Railway sets it; leave it alone. |
| `ENVIRONMENT` | no | `production` (default) is fail-closed for destructive tools. |
| `OPENAI_API_KEY` / `HUGGINGFACE_API_KEY` | no | Without one of these the gateway runs the deterministic `mock` provider and every agent run still completes. |

### Web service

| Variable | Required | Notes |
| --- | --- | --- |
| `API_URL` | **yes** | Full public URL of the API service, no trailing slash: `https://agentos-api.up.railway.app`. Resolved **per request** by `apps/web/app/api/[...path]/route.ts`. |
| `PORT` | auto | Railway sets it. |

`API_URL` used to be baked into the build by a `rewrites()` rule in
`next.config.mjs`, which meant a variable added *after* the image was built was
silently ignored and every request went to `http://localhost:4000`. The proxy
route handler now reads it at request time, so changing the variable and
restarting the web service is enough.

### Node version (both services)

The API uses Node's built-in `node:sqlite`, which needs **Node ≥ 22.13**
(23.4+ on the 23.x line). On 22.5–22.12 it throws unless
`NODE_OPTIONS=--experimental-sqlite` is set. Set `NODE_VERSION=22` (or higher)
on both services — Railway's Nixpacks default can be an older 20.x/22.x that
cannot load the module at all, which looks like "the API never starts".

### Attach a volume (API service)

Railway → API service → **Volumes** → Add volume, mount path `/data`, then set
`DATABASE_PATH=/data/agentos.db`. Without this, a redeploy silently deletes
every account, agent, and run.

---

## 3. Diagnostic ladder

Run these in order. Each one narrows the problem to a single layer.

```bash
# 1. Is the API up, and did it see your LLM keys?
#    llmProviders is ["mock"] when no key is set, ["mock","openai"] when one is.
curl https://<API_HOST>/api/health

# 2. Can the console reach the API? Must return the same JSON as above.
#    A 502 {"error":"api_unreachable", ...} means API_URL on the web service is wrong.
curl https://<WEB_HOST>/api/health

# 3. Log in and keep the token. Fails here = API_URL or SESSION_SECRET mismatch.
TOKEN=$(curl -s -X POST https://<API_HOST>/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"..."}' | jq -r .token)

# 4. Does *your* organization actually have rows?
#    counts.agents == 0  → empty console is correct; seed it (step 5).
#    env.DATABASE_PATH   → is it on your volume, or an ephemeral path?
curl https://<API_HOST>/api/v1/diagnostics -H "authorization: Bearer $TOKEN" | jq

# 5. Backfill the starter portfolio into an organization that has none.
curl -X POST https://<API_HOST>/api/v1/organization/seed \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}'
```

Step 5 is also a button in the console: **Agents → Seed starter agents**.

---

## 4. Symptom → cause

| Symptom | Cause | Fix |
| --- | --- | --- |
| Console shows an error banner: *"could not reach the AgentOS API at http://localhost:4000"* | `API_URL` unset on the web service (or the old build-time value is still in use) | Set `API_URL` to the API's public URL and **restart** the web service |
| Login fails with *"invalid credentials"* for an account you created earlier | Database wiped (no volume) or `SESSION_SECRET` rotated | Attach a volume, set `DATABASE_PATH`, re-register |
| Login works, Agents and Tools are empty | The signed-in organization has no rows | `POST /api/v1/organization/seed`, or the **Seed starter agents** button |
| Agents exist, runs all use the `mock` provider | `HUGGINGFACE_API_KEY` / `OPENAI_API_KEY` not visible to the API process | Set it on the **API** service (not the web service) and redeploy; confirm via `/api/health` |
| 404 on `/api/*` | `API_URL` has a trailing slash | The proxy strips trailing slashes; if you proxy elsewhere, drop the slash |

---

## 5. Why an empty console is now an error, not a mystery

Every list page used to do `.catch(() => setRows([]))`, so a failed request and
an organization with nothing in it rendered the *same* empty grid. List pages
now render a red banner with the API's message and a **Retry** button, and the
`/api/*` proxy returns a structured 502 when the API host is unreachable:

```json
{
  "error": "api_unreachable",
  "message": "The console could not reach the AgentOS API at http://localhost:4000.",
  "apiUrl": "http://localhost:4000",
  "hint": "Set API_URL on the web service to the API's public URL ..."
}
```

If the console ever looks empty for no reason, open DevTools → Network →
`/api/v1/agents`: the response body now says which of the two cases it is.
