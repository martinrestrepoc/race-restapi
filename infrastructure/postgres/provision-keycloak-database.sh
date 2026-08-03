#!/bin/sh

set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:?PGPORT is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${APPLICATION_DB_NAME:?APPLICATION_DB_NAME is required}"
: "${KEYCLOAK_DB_NAME:?KEYCLOAK_DB_NAME is required}"
: "${KEYCLOAK_DB_USERNAME:?KEYCLOAK_DB_USERNAME is required}"
: "${KEYCLOAK_DB_PASSWORD:?KEYCLOAK_DB_PASSWORD is required}"

validate_identifier() {
  value=$1
  label=$2

  case "$value" in
    '' | [0-9]* | *[!A-Za-z0-9_]*)
      echo "$label must be a PostgreSQL identifier using letters, numbers, and underscores" >&2
      exit 1
      ;;
  esac
}

validate_identifier "$APPLICATION_DB_NAME" "APPLICATION_DB_NAME"
validate_identifier "$KEYCLOAK_DB_NAME" "KEYCLOAK_DB_NAME"
validate_identifier "$KEYCLOAK_DB_USERNAME" "KEYCLOAK_DB_USERNAME"

if [ "$KEYCLOAK_DB_NAME" = "$APPLICATION_DB_NAME" ]; then
  echo "Keycloak and the application must use different databases" >&2
  exit 1
fi

if [ "$KEYCLOAK_DB_USERNAME" = "$PGUSER" ]; then
  echo "Keycloak must not reuse the PostgreSQL bootstrap user" >&2
  exit 1
fi

psql \
  --set=ON_ERROR_STOP=1 \
  --set=role_name="$KEYCLOAK_DB_USERNAME" \
  --set=role_password="$KEYCLOAK_DB_PASSWORD" \
  --set=database_name="$KEYCLOAK_DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'role_name')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role_name')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'role_name', :'role_password')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'database_name', :'role_name')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'database_name')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'database_name', :'role_name')
\gexec
SQL
