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
export NODE_ENV="development"

if [ -z "${JWT_SECRET:-}" ]; then
  export JWT_SECRET="$(openssl rand -hex 32)"
fi

if [ ! -x node_modules/.bin/tsx ]; then
  echo "[ZYRA] installing Node dependencies..."
  npm ci
fi

echo "[ZYRA] applying database schema..."
npm run db:push

START_PORT="${PORT:-5001}"
if ! [[ "$START_PORT" =~ ^[0-9]+$ ]] || [ "$START_PORT" -lt 1024 ] || [ "$START_PORT" -gt 65535 ]; then
  START_PORT=5001
fi

# Probe immediately before launch so a stale or occupied port cannot kill the
# whole local stack after PostgreSQL and schema setup have already succeeded.
PORT="$(node - "$START_PORT" <<'NODE'
const net = require('net');
let port = Number(process.argv[2] || 5001);
const limit = Math.min(port + 100, 65535);

function probe() {
  if (port > limit) {
    console.error('No free Zyra development port found in scan range.');
    process.exit(1);
  }

  const server = net.createServer();
  server.unref();
  server.once('error', (err) => {
    if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
      port += 1;
      probe();
      return;
    }
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  });
  server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
    const chosen = port;
    server.close(() => process.stdout.write(String(chosen)));
  });
}

probe();
NODE
)"
export PORT

cat > "$ENV_FILE" <<EOF
export DATABASE_URL='$DATABASE_URL'
export JWT_SECRET='$JWT_SECRET'
export PORT='$PORT'
EOF
chmod 600 "$ENV_FILE"

echo
printf '%s\n' "======================================" \
  " ZYRA LOCAL DEV" \
  "======================================" \
  "DATABASE : ONLINE" \
  "PORT     : $PORT" \
  "HEALTH   : http://127.0.0.1:$PORT/health" \
  "NOTE     : port is selected automatically if the preferred port is busy" \
  "======================================"
echo

exec npm run dev
