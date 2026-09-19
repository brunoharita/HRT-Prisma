#!/usr/bin/env bash
set -euo pipefail

expected_sha="${1:-}"
if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "expected full git SHA" >&2
  exit 2
fi
if [[ ! -f .env.production ]]; then
  echo ".env.production is required and must remain outside Git" >&2
  exit 2
fi

git fetch origin main
git switch main
git pull --ff-only origin main
actual_sha="$(git rev-parse HEAD)"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "VPS SHA $actual_sha differs from validated SHA $expected_sha" >&2
  exit 3
fi

short_sha="${expected_sha:0:12}"
previous_image="$(docker image inspect prisma-web:1.6.4 --format '{{.Id}}' 2>/dev/null || true)"
if [[ -n "$previous_image" ]]; then
  docker tag "$previous_image" "prisma-web:rollback-before-$short_sha"
fi

export PRISMA_DEPLOY_COMMIT="$expected_sha"
docker compose --env-file .env.production -f deploy/docker-compose.yml build prisma-web
docker compose --env-file .env.production -f deploy/docker-compose.yml up -d --no-deps prisma-web

curl --fail --silent --show-error --head https://prisma.hrtsolutions.com.br >/dev/null
docker inspect prisma-web --format '{{.State.Status}} {{.RestartCount}} {{.Image}}'
