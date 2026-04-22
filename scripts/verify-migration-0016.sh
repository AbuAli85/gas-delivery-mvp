#!/usr/bin/env bash
set -euo pipefail

# Usage:
# MYSQL_HOST=127.0.0.1 MYSQL_USER=root MYSQL_PASSWORD=secret MYSQL_DATABASE=owaseel ./scripts/verify-migration-0016.sh

: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"

echo "Verifying migration 0016 on database: ${MYSQL_DATABASE}"

mysql -h "${MYSQL_HOST}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" -e "DESCRIBE orders;" | rg "arrivedAt|failureReason|failureNotes"

mysql -h "${MYSQL_HOST}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" -e "SHOW COLUMNS FROM orders LIKE 'status';" | rg "arrived|failed_delivery"

echo "Migration 0016 verification passed."
