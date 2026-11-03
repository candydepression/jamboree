#!/usr/bin/env bash
# Rebuilds the local Supabase database from the migrations and seed, then runs the privacy
# checks. Needs Docker and the Supabase CLI (npx supabase). Used by CI and `npm run test:db`.
set -euo pipefail
cd "$(dirname "$0")/.."

npx --yes supabase@2 db start >/dev/null 2>&1 || true
npx --yes supabase@2 db reset
DB_URL="$(npx --yes supabase@2 status -o env | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"

# The checks roll themselves back by ending with an error that carries the results.
result="$(psql "$DB_URL" -v ON_ERROR_STOP=0 -f supabase/tests/privacy_test.sql 2>&1 | grep -o 'PRIVACY TESTS:.*' || true)"
echo "${result:-No result: the privacy checks did not run}"
[[ "$result" == *" 0 failed" ]]
