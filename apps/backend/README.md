# Backend — Marketing Copilot

The standalone app in `apps/frontend` uses the backend's Shopify OAuth session,
Postgres data, imports, dashboard metrics, and Backboard campaign generation.
The older `/app` Shopify routes remain in the repository; the main interface is `/`.

## Run the complete standalone app

From the repository root:

```bash
npm install
# Copy apps/backend/.env.example to apps/backend/.env and fill credentials.
npm run setup:backend
npm run build
npm run start -w @htn26/backend
```

The backend serves both the built frontend and `/api` on port 3000 by default.
Set `SHOPIFY_APP_URL` to the public HTTPS origin that forwards to this server.
In Shopify app configuration, use that same application URL, disable embedded
mode, and allow the exact redirect URL `<SHOPIFY_APP_URL>/api/auth/callback`.
`shopify.app.toml` contains the production adgile.tech configuration. Local development
uses `shopify.app.dev.toml`, which the dev command selects. Apply the configuration to your Shopify app before
attempting merchant sign-in. Building locally does not register callback URLs.

For Shopify CLI development, first build the frontend, then run
the following from `apps/backend` (the explicit path is needed in this monorepo):

```bash
npm run dev -- --path . --store htn26-rain-jackets.myshopify.com --use-localhost --localhost-port 3458
```

Open `https://localhost:3458`. Local HTTPS was used for the live test because Chrome
blocked the temporary Cloudflare hostname. Shopify CLI generates a local certificate
on first use. Localhost mode cannot receive Shopify webhooks; use a public HTTPS
origin when verifying webhooks or deploying. Rebuild the frontend after edits to
refresh the served UI.
For frontend hot reload, run `npm run dev:frontend` alongside
`npm run dev:rr -w @htn26/backend`, and set `FRONTEND_URL=http://localhost:5173`.
Vite proxies `/api` to port 3000. Prefer the single HTTPS origin for OAuth testing;
Shopify's session cookies are secure and the callback returns to SHOPIFY_APP_URL.

## Environment

| Variable | Purpose |
|----------|---------|
| `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES` | Shopify OAuth and product sync |
| `DATABASE_URL` | Session, merchant data, campaigns, generation runs |
| `BACKBOARD_API_KEY` | Campaign generation; see [provider contract](GENERATION.md) |
| `BACKBOARD_PROVIDER`, `BACKBOARD_MODEL` | Optional model overrides |
| `ELASTIC_URL`, `ELASTIC_API_KEY` | Optional evidence indexing after imports/sync |
| `SENTRY_DSN` | Optional server errors and traces |
| `FRONTEND_URL` | Optional Vite origin for development mutations |

Never commit `.env`. Use Railway's public database URL for local development,
not a private `*.railway.internal` hostname. Google Analytics integration remains
deferred. Reviews and historical ad performance use CSV/JSON imports; Shopify
connection does not automatically connect ad accounts. Creative Testing is labelled
as an illustrative demo.

## Verification

```bash
npm test
npm run typecheck
npm run check:frontend-structure
npm run check:health -w @htn26/backend
npm run check:standalone -w @htn26/backend
```

The last command creates and removes its own temporary records in the configured
Postgres database, with mocked Shopify token exchange and scripted generation.
Live Shopify consent/product sync and a real Backboard response are separate
acceptance checks. Public `GET /health` reports service health.

Run `npm run check:backboard -w @htn26/backend` for an opt-in live Backboard check
using synthetic evidence. This makes billable provider calls and does not write
campaigns to Postgres. GPT-4o mini through Backboard passed all three stages.

Live verification on `htn26-rain-jackets.myshopify.com` completed Shopify OAuth and
synced 17 catalog products. A campaign generated from the existing labelled demo
evidence was saved to Postgres. One model response failed validation; a manual retry
succeeded, so model output is still subject to validation and occasional retries.

## Main routes

- `/api/auth/start`, `/api/auth/callback`, `/api/session`, `/api/logout`: OAuth/session
- `/api/dashboard`: scoped products, reviews, historical ads, metrics, findings
- `/api/sync`: Shopify catalog sync
- `/api/import` and `/api/import/demo`: validated imports and labelled examples
- `/api/generate`: evidence analysis, draft generation, claim review, save
- `/api/campaigns` and `/api/campaigns/:id`: saved campaign history/reopen

Mutation endpoints require POST and the configured Origin. Merchant identity
comes from the signed session, and Shopify tokens never enter frontend storage.
