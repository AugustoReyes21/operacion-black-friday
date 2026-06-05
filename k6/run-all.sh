#!/bin/sh
set -eu

BASE_URL="${BASE_URL:-http://api:3000}"

for SCENARIO in low medium high soak; do
  echo "Ejecutando escenario: $SCENARIO"
  k6 run \
    -e BASE_URL="$BASE_URL" \
    -e SCENARIO="$SCENARIO" \
    --summary-export "/results/${SCENARIO}-summary.json" \
    /scripts/black-friday-test.js
done
