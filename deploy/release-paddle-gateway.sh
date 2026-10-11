#!/usr/bin/env bash
set -euo pipefail
expected_sha="${1:?validated SHA required}"
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || exit 2
[[ "$(git rev-parse HEAD)" == "$expected_sha" ]] || { echo "Checkout differs from validated SHA" >&2; exit 2; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Tracked checkout is dirty" >&2; exit 2; }
compose=(docker compose --env-file .env.production -f deploy/docker-compose.yml)
previous_image="$(docker inspect --format '{{.Image}}' prisma-paddle-gateway)"
docker tag "$previous_image" "prisma-paddle-gateway:rollback-before-${expected_sha:0:12}"
"${compose[@]}" build paddle-gateway
"${compose[@]}" up -d --no-deps paddle-gateway
for attempt in $(seq 1 20); do
  if docker exec prisma-paddle-gateway node --input-type=module -e 'import fs from "node:fs";process.exit(fs.statSync("/run/paddle-gateway/gateway.sock").isSocket()?0:1)' 2>/dev/null; then
    docker inspect --format 'Gateway {{.State.Status}} / image {{.Image}}' prisma-paddle-gateway
    exit 0
  fi
  sleep 2
done
echo "Gateway socket unavailable; preserve rollback image" >&2
exit 1
