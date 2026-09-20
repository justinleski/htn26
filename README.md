# Marketing Copilot

AI Marketing Copilot for Shopify merchants — surfaces what marketing is working and generates the next campaign from store data, reviews, and ad performance.

## Run

```bash
npm install
npm run dev:frontend    # Vite shell → http://localhost:5173
npm run setup:backend   # Prisma generate + migrate (needs DATABASE_URL)
npm run dev:backend     # Shopify React Router app (Partner app + CLI)
npm run test            # data pipeline tests
npm run check:backend-health
```

## Structure

```
apps/
  backend/           Shopify React Router app (auth, schemas, GA seams, Polaris stubs)
    app/                 embedded Admin UI + Shopify auth
    src/                 data pipeline (import, sync, metrics, elasticsearch)
    prisma/schema.prisma
    .context/design.yaml
  frontend/          Vite + React + Tailwind (secondary shell — not Admin embed)
data/demo/           labelled rain-jacket reviews + ads
scripts/             frontend structure checks (pre-commit)
```

The hosted product is the **Vite frontend** (`web`). The Shopify React Router app is the **public API** (`api`), not an Admin embed.

See [apps/backend/README.md](apps/backend/README.md) for Partner/env notes.

## Hosting (Railway)

Two services, repo-root Docker context (npm workspaces lockfile is at the root):

| Service | Dockerfile | Config | Port |
|---------|------------|--------|------|
| `api` | `Dockerfile.api` | `railway.toml` | 3000 (`/health`) |
| `web` | `Dockerfile.web` | `railway.web.toml` | 3000 (serves `apps/frontend/dist`) |

Required environment:

| Variable | Service | Purpose |
|----------|---------|---------|
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | `api` | Partner app credentials |
| `SCOPES` | `api` | `write_products,read_products` |
| `DATABASE_URL` | `api` | Postgres — on Railway use `${{Postgres.DATABASE_URL}}` |
| `SESSION_SECRET` | `api` | Copilot JWT/HMAC (`openssl rand -hex 32`) |
| `SHOPIFY_APP_URL` | `api` | Public `api` URL (no trailing slash) |
| `FRONTEND_URL` | `api` | Public `web` URL (no trailing slash) |
| `VITE_API_URL` | `web` | Same public `api` URL; baked in at image build |
| `PORT` | both | `3000` (Railway also injects `PORT`) |

Local `shopify app dev` uses `apps/backend/shopify.app.dev.toml` so tunnel URL updates cannot overwrite production Partner URLs in `shopify.app.toml`.

Public URLs (Railway `helpful-vision` / production):

- API: https://api-production-aa9b.up.railway.app
- Web: https://web-production-39cfa.up.railway.app

```bash
# Secrets from apps/backend/.env (does not print values):
./scripts/railway-set-api-secrets.sh

# Enable Docker Desktop WSL integration first, then:
docker build -f Dockerfile.api -t htn26-api .
docker build -f Dockerfile.web --build-arg VITE_API_URL=https://api-production-aa9b.up.railway.app -t htn26-web .

# Deploy from repo root (services api + web already exist):
RAILWAY_CALLER=skill:use-railway@1.4.0 railway up --service api --environment production --ci -m "api"
RAILWAY_CALLER=skill:use-railway@1.4.0 railway up --service web --environment production --ci -m "web"
```

Do not run `shopify app deploy` until Partner Dashboard application / redirect URLs match the live `api` domain. `shopify.app.toml` already has those URLs; local `shopify app dev` uses `shopify.app.dev.toml`.
