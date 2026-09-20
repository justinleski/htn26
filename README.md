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
npm run build           # Shopify app + secondary Vite shell
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

Merchant Admin UI lives in **apps/backend**. Copy
`apps/backend/.env.example` to `apps/backend/.env`; never commit the populated
file. See [apps/backend/README.md](apps/backend/README.md) for env vars, health
checks, and monitoring details.
