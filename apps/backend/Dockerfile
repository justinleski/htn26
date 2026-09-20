# Workspace-aware API image. Build context MUST be the repo root
# (package-lock.json is an npm workspaces lockfile):
#   docker build -f apps/backend/Dockerfile -t htn26-api .
# Prefer Dockerfile.api at the repo root (same instructions).
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV HUSKY=0
ENV PORT=3000
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm ci --ignore-scripts --include=dev && npm cache clean --force

COPY apps/backend apps/backend
COPY data data

WORKDIR /app/apps/backend
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "docker-start"]
