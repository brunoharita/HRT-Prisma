#!/usr/bin/env bash
set -euo pipefail

# Run from the existing /opt/prisma checkout after Git promotion. No web rebuild.
expected_sha="${1:?validated SHA required}"
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || { echo "Invalid SHA" >&2; exit 2; }
[[ "$(git rev-parse HEAD)" == "$expected_sha" ]] || { echo "Checkout differs from validated SHA" >&2; exit 2; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Tracked checkout is dirty" >&2; exit 2; }

secret_file="${PRISMA_PARSER_SECRET_FILE:-/etc/prisma/parser-ia.env}"
[[ -f "$secret_file" && ! -L "$secret_file" ]] || { echo "Protected parser secret missing" >&2; exit 2; }
[[ "$(stat -c %a "$secret_file")" == "400" && "$(stat -c %u "$secret_file")" == "1000" ]] || { echo "Parser secret must be mode 400, UID 1000" >&2; exit 2; }

compose=(docker compose --env-file .env.production -f deploy/docker-compose.yml)
if docker inspect prisma-parser-ia >/dev/null 2>&1; then
  previous_image="$(docker inspect --format '{{.Image}}' prisma-parser-ia)"
  docker tag "$previous_image" "prisma-parser-ia:rollback-before-${expected_sha:0:12}"
elif ss -lntH | awk '{print $4}' | grep -qE ':18787$'; then
  echo "Parser port already occupied; do not replace a tunnel or unrelated service" >&2
  exit 2
fi

"${compose[@]}" build parser-ia
"${compose[@]}" up -d --no-deps parser-ia
for attempt in $(seq 1 20); do
  health="$(docker inspect --format '{{.State.Health.Status}}' prisma-parser-ia)"
  if [[ "$health" == "healthy" ]]; then
    docker inspect --format 'Parser {{.State.Status}} / {{.State.Health.Status}} / image {{.Image}}' prisma-parser-ia
    exit 0
  fi
  sleep 2
done
echo "Parser not healthy; preserve cache/secret and inspect fixed diagnostic codes" >&2
exit 1
