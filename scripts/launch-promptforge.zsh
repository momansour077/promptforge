#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/mohamedmansour/promptforge"
BACKEND_DIR="$ROOT_DIR/apps/backend"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
BACKEND_LOG="/tmp/promptforge-backend.log"
FRONTEND_LOG="/tmp/promptforge-frontend.log"
BACKEND_PORT=4000
FRONTEND_PORT=4173
DATABASE_URL_LOCAL="postgresql://promptforge:promptforge@localhost:5432/promptforge?schema=public"

load_env_file() {
  local env_file="$1"

  if [ -f "$env_file" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
  fi
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$BACKEND_DIR/.env"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "PromptForge cannot start" message "Node.js and npm are required to launch PromptForge."'
  exit 1
fi

if ! [ -d "$BACKEND_DIR/node_modules" ] || ! [ -d "$FRONTEND_DIR/node_modules" ]; then
  osascript -e 'display alert "PromptForge dependencies missing" message "Run npm install in apps/backend and apps/frontend before launching PromptForge."'
  exit 1
fi

start_brew_service() {
  local label="$1"

  if command -v brew >/dev/null 2>&1; then
    brew services start "$label" >/dev/null 2>&1 || true
  fi
}

ensure_local_dependencies() {
  if ! nc -z localhost 5432 >/dev/null 2>&1; then
    start_brew_service postgresql@16
  fi

  if ! nc -z localhost 6379 >/dev/null 2>&1; then
    start_brew_service redis
  fi

  sleep 2

  if ! nc -z localhost 5432 >/dev/null 2>&1; then
    osascript -e 'display alert "PostgreSQL is not running" message "PromptForge could not start PostgreSQL on port 5432. Start it manually and click the desktop icon again."'
    exit 1
  fi

  if ! nc -z localhost 6379 >/dev/null 2>&1; then
    osascript -e 'display alert "Redis is not running" message "PromptForge could not start Redis on port 6379. Start it manually and click the desktop icon again."'
    exit 1
  fi
}

ensure_database() {
  if ! command -v psql >/dev/null 2>&1; then
    osascript -e 'display alert "PostgreSQL client is missing" message "Install psql or Homebrew PostgreSQL to let PromptForge initialize its database automatically."'
    exit 1
  fi

  if ! psql -d postgres -Atqc 'SELECT 1' >/dev/null 2>&1; then
    osascript -e 'display alert "PostgreSQL is not accessible" message "PromptForge could not connect to the local PostgreSQL server."'
    exit 1
  fi

  if ! psql -d postgres -Atqc "SELECT 1 FROM pg_roles WHERE rolname = 'promptforge'" | grep -qx '1'; then
    psql -d postgres -c "CREATE ROLE promptforge WITH LOGIN PASSWORD 'promptforge';" >/dev/null
  fi

  if ! psql -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = 'promptforge'" | grep -qx '1'; then
    psql -d postgres -c "CREATE DATABASE promptforge OWNER promptforge;" >/dev/null
  fi
}

run_migrations() {
  (
    cd "$BACKEND_DIR"
    export DATABASE_URL="$DATABASE_URL_LOCAL"
    npm run prisma:migrate:deploy >/tmp/promptforge-prisma.log 2>&1
  )
}

ensure_backend() {
  if nc -z localhost "$BACKEND_PORT" >/dev/null 2>&1; then
    return
  fi

  (
    cd "$BACKEND_DIR"
    export NODE_ENV=development
    export PORT="$BACKEND_PORT"
    export DATABASE_URL="${DATABASE_URL:-postgresql://promptforge:promptforge@localhost:5432/promptforge?schema=public}"
    export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
    export JWT_SECRET="${JWT_SECRET:-promptforge-local-access-secret-1234567890}"
    export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-promptforge-local-refresh-secret-1234567890}"
    export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-15m}"
    export JWT_REFRESH_EXPIRES_IN="${JWT_REFRESH_EXPIRES_IN:-7d}"
    export MISTRAL_API_KEY="${MISTRAL_API_KEY:-promptforge-local-demo-key}"
    export MISTRAL_BASE_URL="${MISTRAL_BASE_URL:-https://api.mistral.ai/v1}"
    export MISTRAL_MODEL="${MISTRAL_MODEL:-mistral-large-latest}"
    export RATE_LIMIT_FREE_DAILY="${RATE_LIMIT_FREE_DAILY:-20}"
    export RATE_LIMIT_PRO_DAILY="${RATE_LIMIT_PRO_DAILY:-500}"
    export FRONTEND_URL="http://localhost:$FRONTEND_PORT"
    export CORS_ORIGINS="http://localhost:$FRONTEND_PORT"
    export COOKIE_DOMAIN="localhost"
    export ACCESS_COOKIE_NAME="${ACCESS_COOKIE_NAME:-promptforge_access}"
    export REFRESH_COOKIE_NAME="${REFRESH_COOKIE_NAME:-promptforge_refresh}"
    export CSRF_COOKIE_NAME="${CSRF_COOKIE_NAME:-promptforge_csrf}"
    export LOG_LEVEL="${LOG_LEVEL:-info}"
    export PUBLIC_RATE_LIMIT_WINDOW_MS="${PUBLIC_RATE_LIMIT_WINDOW_MS:-900000}"
    export PUBLIC_RATE_LIMIT_MAX="${PUBLIC_RATE_LIMIT_MAX:-100}"
    export API_BASE_PATH="${API_BASE_PATH:-/api}"

    nohup npm run dev >"$BACKEND_LOG" 2>&1 &
  )
}

ensure_frontend() {
  if nc -z localhost "$FRONTEND_PORT" >/dev/null 2>&1; then
    return
  fi

  (
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 &
  )
}

wait_for_http() {
  local url="$1"
  local attempts=30
  local index=0

  until curl -fsS "$url" >/dev/null 2>&1; do
    index=$((index + 1))
    if [ "$index" -ge "$attempts" ]; then
      return 1
    fi
    sleep 1
  done
}

ensure_local_dependencies
ensure_database
run_migrations
ensure_backend
ensure_frontend

if ! wait_for_http "http://localhost:$BACKEND_PORT/health"; then
  osascript -e "display alert \"PromptForge backend failed to start\" message \"Review $BACKEND_LOG for details.\""
  exit 1
fi

if ! wait_for_http "http://localhost:$FRONTEND_PORT"; then
  osascript -e "display alert \"PromptForge frontend failed to start\" message \"Review $FRONTEND_LOG for details.\""
  exit 1
fi

if ! open "http://localhost:$FRONTEND_PORT/" >/dev/null 2>&1; then
  printf 'PromptForge is running at http://localhost:%s/\n' "$FRONTEND_PORT" >> /tmp/promptforge-launcher.log
fi
