# Adgile

AI campaign planning for Shopify merchants. The standalone app in `apps/frontend` signs in with Shopify, syncs products, imports labelled review/ad data, and generates and saves campaigns through a generic text-generation interface backed by Backboard.

## Run

```bash
npm install
npm run setup:backend       # Prisma generate + migrate; needs DATABASE_URL
npm run dev:backend         # Shopify CLI, using shopify.app.dev.toml
npm run dev:frontend        # Vite at localhost:5173; proxies API requests
npm test
npm run test:web
npm run typecheck
npm run build
```

Copy `apps/backend/.env.example` to `apps/backend/.env` and configure the credentials described in [the backend README](apps/backend/README.md). Keep populated environment files out of Git. Local Shopify development needs HTTPS for its secure cookies.

## Production on Railway

Both services build from the repository root using the workspace lockfile. Configure each Dockerfile in Railway service settings; the root `railway.toml` is documentation only.

| Service | Dockerfile | Start command | Health check |
| --- | --- | --- | --- |
| `api` | `Dockerfile.api` | `npm run docker-start` | `/health` |
| `web` | `Dockerfile.web` | `node scripts/web-server.mjs` | `/health` |

The public app is **https://adgile.tech**. The web server serves the frontend and proxies `/api`, `/auth`, and `/webhooks` to the existing API service. Browser requests stay on the app origin, allowing host-only, secure Shopify session cookies. The generated Railway web domain redirects to the canonical app domain. `/health` remains available independently for Railway probes.

| Variable | Service | Value / purpose |
| --- | --- | --- |
| `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` | `api` | Existing Shopify app credentials |
| `SCOPES` | `api` | `write_products,read_products` |
| `DATABASE_URL` | `api` | Existing Railway Postgres reference |
| `SHOPIFY_APP_URL`, `FRONTEND_URL` | `api` | `https://adgile.tech` |
| `BACKBOARD_API_KEY` | `api` | Backboard secret, configured only on the server |
| `BACKBOARD_BASE_URL` | `api` | `https://app.backboard.io/api` |
| `BACKBOARD_PROVIDER` | `api` | `openrouter` |
| `BACKBOARD_MODEL` | `api` | `openai/gpt-4o-mini` |
| `PUBLIC_APP_URL` | `web` | `https://adgile.tech` |
| `API_UPSTREAM` | `web` | `https://api-production-aa9b.up.railway.app` |
| `PORT` | both | `3000` |

`VITE_API_URL` is unnecessary: the frontend uses relative `/api` requests. The web proxy preserves OAuth redirects/cookies, query strings, raw webhook request bodies and streaming responses. AI requests have a 180-second proxy deadline.

Before switching the canonical URL, verify the custom domain's DNS and HTTPS certificate. Deploy both services from the same verified `main` commit and confirm healthy startup; API startup runs non-destructive Prisma migrations. Keep the existing database and credentials.

Publish `apps/backend/shopify.app.toml` with Shopify CLI to register the production application URL, `https://adgile.tech/api/auth/callback`, and the uninstall webhook. The separate `shopify.app.dev.toml` contains local URLs, so development does not overwrite the production configuration file.

```bash
docker build -f Dockerfile.api -t htn26-api .
docker build -f Dockerfile.web -t htn26-web .
```

After deployment, verify Shopify login, product sync, campaign generation, and reopening saved campaign URLs on `adgile.tech`. `/api/session` must return JSON, and protected API routes must reject unauthenticated requests.
