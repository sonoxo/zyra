#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif command -v brew >/dev/null 2>&1; then
  eval "$(brew shellenv)"
else
  echo "ERROR: Homebrew is required for the local macOS development pipeline."
  exit 1
fi

if ! brew list postgresql@16 >/dev/null 2>&1; then
  echo "[ZYRA] installing PostgreSQL 16..."
  brew install postgresql@16
fi

export PATH="$(brew --prefix postgresql@16)/bin:$PATH"

echo "[ZYRA] starting PostgreSQL 16..."
brew services start postgresql@16 >/dev/null 2>&1 || true

for _ in $(seq 1 30); do
  if pg_isready -q; then
    break
  fi
  sleep 1
done

if ! pg_isready -q; then
  echo "ERROR: PostgreSQL did not become ready."
  brew services list | grep postgresql || true
  exit 1
fi

if ! psql postgres -Atqc "SELECT 1 FROM pg_roles WHERE rolname='zyra_dev'" | grep -q '^1$'; then
  echo "[ZYRA] creating local database role..."
  psql postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE zyra_dev LOGIN PASSWORD 'zyra_dev_local';"
fi

if ! psql postgres -Atqc "SELECT 1 FROM pg_database WHERE datname='zyra'" | grep -q '^1$'; then
  echo "[ZYRA] creating local database..."
  createdb -O zyra_dev zyra
fi

ENV_FILE="$HOME/.zyra-dev.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://zyra_dev:zyra_dev_local@127.0.0.1:5432/zyra}"
export PORT="${PORT:-5001}"
export NODE_ENV="development"

if [ -z "${JWT_SECRET:-}" ]; then
  export JWT_SECRET="$(openssl rand -hex 32)"
fi

cat > "$ENV_FILE" <<EOF
export DATABASE_URL='$DATABASE_URL'
export JWT_SECRET='$JWT_SECRET'
export PORT='$PORT'
EOF
chmod 600 "$ENV_FILE"

if [ ! -x node_modules/.bin/tsx ]; then
  echo "[ZYRA] installing Node dependencies..."
  npm ci
fi

echo "[ZYRA] applying database schema..."
npm run db:push

echo
printf '%s\n' "======================================" \
  " ZYRA LOCAL DEV" \
  "======================================" \
  "DATABASE : ONLINE" \
  "PORT     : $PORT" \
  "HEALTH   : http://127.0.0.1:$PORT/health" \
  "NOTE     : port 5001 avoids macOS AirTunes/AirPlay on 5000" \
  "======================================"
echo

exec npm run dev
