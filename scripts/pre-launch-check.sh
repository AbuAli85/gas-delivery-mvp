#!/usr/bin/env bash
#
# OWASEEL pre-launch checks (bash: Linux, macOS, Git Bash, WSL).
# Run from repo root:
#   bash scripts/pre-launch-check.sh
#
# Optional: load secrets from .env in repo root (same as app).
# Optional DB probes: set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
#   (or only MYSQL_DATABASE if mysql uses ~/.my.cnf for auth).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "OWASEEL pre-launch validation"
echo "============================="
echo ""

echo "[1/6] npm test"
npm test
echo ""

echo "[2/6] npm run check"
npm run check
echo ""

echo "[3/6] npm run build"
npm run build
echo ""

echo "[4/6] Required environment variables"
missing=()
[[ -z "${DATABASE_URL:-}" ]] && missing+=("DATABASE_URL")
[[ -z "${JWT_SECRET:-}" ]] && missing+=("JWT_SECRET")
if (( ${#missing[@]} > 0 )); then
  echo "Missing (set in shell or .env):"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

if [[ -z "${ADMIN_PIN:-}" || "${ADMIN_PIN}" == "1234" ]]; then
  echo "WARNING: ADMIN_PIN is unset or still \"1234\". The app defaults admin to 1234 when unset — change before production."
else
  echo "ADMIN_PIN is set and not the app default literal."
fi

if [[ -z "${FIREBASE_WEB_API_KEY:-}" ]]; then
  echo "WARNING: FIREBASE_WEB_API_KEY unset — production SMS OTP may not work (dev OTP path may still run)."
fi
echo ""

echo "[5/6] npm run validate:commission"
npm run validate:commission
echo ""

echo "[6/6] Optional MySQL CLI checks"
# Do not abort the script on optional SQL errors (wrong password, etc.).
set +e
if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client not in PATH — skipping zone/provider/index SQL checks."
  set -e
  echo "============================="
  echo "Pre-launch checks finished OK (DB CLI skipped)."
  exit 0
fi

if [[ -z "${MYSQL_DATABASE:-}" ]]; then
  echo "MYSQL_DATABASE unset — skipping zone/provider/index SQL checks."
  echo "Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE to enable them."
  set -e
  echo "============================="
  echo "Pre-launch checks finished OK (DB CLI skipped)."
  exit 0
fi

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_USER="${MYSQL_USER:-root}"
mysql_base=(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -N)
if [[ -n "${MYSQL_PASSWORD:-}" ]]; then
  mysql_base+=( -p"$MYSQL_PASSWORD" )
fi
mysql_base+=( "$MYSQL_DATABASE" )

run_sql() {
  "${mysql_base[@]}" -e "$1"
}

if ! run_sql "SELECT 1" >/dev/null 2>&1; then
  echo "WARNING: could not connect with mysql CLI — check MYSQL_* vars. Skipping DB checks."
  set -e
  echo "============================="
  echo "Pre-launch checks finished OK (DB CLI connection failed)."
  exit 0
fi

zone_count="$(run_sql "SELECT COUNT(*) FROM zones;" | tr -d '\r' || echo 0)"
if [[ "${zone_count:-0}" -lt 3 ]]; then
  echo "WARNING: zones count is ${zone_count} (expected >= 3 from scripts/seed-muscat.mjs). Run: node scripts/seed-muscat.mjs"
else
  echo "Zones OK (${zone_count} rows)."
fi

subzone_count="$(run_sql "SELECT COUNT(*) FROM sub_zones;" | tr -d '\r' || echo 0)"
if [[ "${subzone_count:-0}" -lt 20 ]]; then
  echo "WARNING: sub_zones count is ${subzone_count} (expected ~27 after scripts/seed-sub-zones.mjs). Run: node scripts/seed-sub-zones.mjs"
else
  echo "Sub-zones OK (${subzone_count} rows)."
fi

provider_count="$(run_sql "SELECT COUNT(*) FROM providers WHERE providerStatus = 'approved';" | tr -d '\r' || echo 0)"
if [[ "${provider_count:-0}" -eq 0 ]]; then
  echo "WARNING: no approved providers. Use admin flow or seed scripts."
else
  echo "Approved providers OK (${provider_count})."
fi

migration_count="$(run_sql "SELECT COUNT(*) FROM __drizzle_migrations;" | tr -d '\r' || echo 0)"
if [[ "${migration_count:-0}" -lt 16 ]]; then
  echo "WARNING: __drizzle_migrations count is ${migration_count} (expected >= 16 including 0015_fast_path_indexes). Run: npx drizzle-kit migrate"
else
  echo "Drizzle migrations row count OK (${migration_count})."
fi

schema_name="$MYSQL_DATABASE"
index_count="$(run_sql "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='${schema_name}' AND index_name LIKE 'idx_%';" | tr -d '\r' || echo 0)"
if [[ "${index_count:-0}" -lt 8 ]]; then
  echo "WARNING: idx_* index count is ${index_count} (expected >= 8 after migration 0015). Run: npx drizzle-kit migrate"
else
  echo "Performance indexes OK (${index_count} idx_* entries in schema ${schema_name})."
fi

# SHA-256 hex of UTF-8 "1234" — must match Web Crypto / Node crypto used by the client.
DEFAULT_PIN_HASH="03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
default_providers="$(run_sql "SELECT COUNT(*) FROM providers WHERE pinHash = '${DEFAULT_PIN_HASH}';" | tr -d '\r' || echo 0)"
if [[ "${default_providers:-0}" -gt 0 ]]; then
  echo "WARNING: ${default_providers} provider(s) still use default PIN 1234 (hashed). Rotate before production."
else
  echo "No providers matched default PIN hash (good if you expect none)."
fi

set -euo pipefail
echo "============================="
echo "Pre-launch checks finished OK."
