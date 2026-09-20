# Backend — Marketing Copilot (Shopify React Router)

Shopify embedded app: auth/session, Postgres (Prisma), Zod-validated imports, Shopify product sync, metric aggregation, merchant-scoped Elastic indexing, Google Analytics OAuth seams, and Sentry monitoring.

## Run

From repo root:

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
# fill SHOPIFY_*, DATABASE_URL (use Railway DATABASE_PUBLIC_URL locally, not *.railway.internal), etc.

npm run setup:backend   # prisma generate + migrate
npm run dev:backend     # shopify app dev (needs Partner app + CLI login)
```

Useful without full Shopify CLI:

```bash
npm run check:health -w @htn26/backend   # schemas + env/elastic/sentry status
npm run typecheck -w @htn26/backend
npm run dev:rr -w @htn26/backend         # react-router only (no tunnel)
```

Public health JSON: `GET /health` (no Shopify session).

## Env still empty until you fill them

| Variable | Needed for |
|----------|------------|
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Admin embed + GraphQL |
| `DATABASE_URL` | Prisma Session, integrations, and merchant data |
| `SESSION_SECRET` | App session hardening |
| `ELASTIC_URL` / `ELASTIC_API_KEY` | Search client health |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Server errors/traces and browser Session Replay |
| `GOOGLE_CLIENT_ID` / `SECRET` / `REDIRECT_URI` | Future GA Connect (app-level only) |
| `BACKBOARD_API_KEY` | Dev 3 AI lane |

Never commit `.env`. Merchants never paste GA API keys — OAuth tokens go on `MerchantIntegration`.

The Health screen can send a deliberate Sentry test error. Product sync,
demo import, and dashboard loading emit server spans when Sentry is configured;
browser tracing and privacy-masked Session Replay use `VITE_SENTRY_DSN`.

## Layout

```
app/
  shopify.server.ts
  db.server.ts
  lib/
    schemas.ts              # loose domain Zod
    env.server.ts
    elastic.server.ts
    sentry.server.ts
    shopify/                # GraphQL product helpers
    ga/                     # OAuth URL + map stubs
    integrations/types.ts
  routes/
    app._index.tsx          # Dashboard stub
    app.import.tsx
    app.campaigns.tsx
    app.settings.tsx        # Connect GA (disabled)
    app.health.tsx
    health.tsx              # public probe
prisma/schema.prisma        # Session, MerchantIntegration, Product, Review, Campaign, …
src/                        # data pipeline (import, sync, metrics, elasticsearch)
test/                       # pipeline unit tests
.context/design.yaml
```

## MCP (team)

Prefer user/global MCP config (secrets not in git):

- Railway: https://railway.com/mcp
- Sentry: https://mcp.sentry.dev/mcp
- Elasticsearch: `@elastic/mcp-server-elasticsearch` once cluster exists

Railway Shared Variables for deployed `DATABASE_URL`, Elastic, Sentry, Shopify secrets. Full Railway project create is optional until accounts exist.
