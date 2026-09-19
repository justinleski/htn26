# Marketing Copilot

AI Marketing Copilot for Shopify merchants — surfaces what marketing is working and generates the next campaign from store data, reviews, and ad performance. This monorepo holds a Vite React frontend and a backend module shell for the hackathon build.

## Run

```bash
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

## Structure

```
apps/
  frontend/          React + Tailwind + Framer Motion
    .context/        design.yaml (frontend patterns)
    src/
      pages/
      layouts/
      components/
      hooks/
      contexts/
      styles/
  backend/           server modules (placeholders)
    shopify/
    import/
    metrics/
    elasticsearch/
    ai/
    database/
    monitoring/
data/demo/           labelled demo datasets
scripts/             structure checks (pre-commit)
```
