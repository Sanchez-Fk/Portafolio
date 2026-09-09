#!/bin/bash
# Postgres arranca con la base `prospector` (POSTGRES_DB). n8n y Evolution
# necesitan la suya. Este script corre una sola vez, al inicializar el volumen.
set -e

for base in n8n evolution; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE $base'
     WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$base')\gexec
EOSQL
  echo "base '$base' lista"
done
