#!/usr/bin/env bash
# Set api secrets from apps/backend/.env via Railway CLI stdin. Never prints values.
# Requires: railway CLI logged in, repo linked or explicit --project/--environment/--service.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/apps/backend/.env"
PROJECT="${RAILWAY_PROJECT:-helpful-vision}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
SERVICE="${RAILWAY_SERVICE:-api}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE" >&2
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install: npm i -g @railway/cli && railway login" >&2
  exit 1
fi

read_env() {
  local key="$1"
  # shellcheck disable=SC1090
  set -a
  # Values stay in this process; we only print the key name.
  # grep+cut would break quoted values; source the file instead.
  # Filter to KEY=VALUE lines so comments are ignored.
  eval "$(grep -E "^${key}=" "$ENV_FILE")"
  set +a
  printf '%s' "${!key-}"
}

set_stdin() {
  local key="$1"
  local value
  value="$(read_env "$key")"
  if [[ -z "$value" ]]; then
    echo "skip ${key} (empty in .env)" >&2
    return 0
  fi
  printf '%s' "$value" | railway variable set "$key" --stdin \
    --project "$PROJECT" \
    --environment "$ENVIRONMENT" \
    --service "$SERVICE" \
    --skip-deploys
  echo "set ${key}" >&2
}

set_stdin SHOPIFY_API_SECRET
set_stdin SESSION_SECRET
echo "done. Deploy separately after Docker images build." >&2
