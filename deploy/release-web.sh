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
legacy_assets_dir="$(mktemp -d)"
legacy_assets_source=""
cleanup() {
  if [[ -n "$legacy_assets_source" ]]; then
    docker rm -f "$legacy_assets_source" >/dev/null 2>&1 || true
  fi
  rm -rf "$legacy_assets_dir"
}
trap cleanup EXIT

# Keep hashed chunks from the current runtime so tabs that loaded the previous
# index can finish their dynamic imports during the rollout. Prefer the live
# container because it may already contain assets preserved by an earlier run.
if docker inspect prisma-web >/dev/null 2>&1; then
  docker cp "prisma-web:/usr/share/nginx/html/assets" "$legacy_assets_dir/"
elif [[ -n "$previous_image" ]]; then
  legacy_assets_source="$(docker create "$previous_image")"
  docker cp "$legacy_assets_source:/usr/share/nginx/html/assets" "$legacy_assets_dir/"
fi

if [[ -n "$previous_image" ]]; then
  docker tag "$previous_image" "prisma-web:rollback-before-$short_sha"
fi

export PRISMA_DEPLOY_COMMIT="$expected_sha"
docker compose --env-file .env.production -f deploy/docker-compose.yml build prisma-web
docker compose --env-file .env.production -f deploy/docker-compose.yml up -d --no-deps prisma-web
if [[ -n "$(find "$legacy_assets_dir/assets" -maxdepth 1 -type f -print -quit 2>/dev/null)" ]]; then
  docker cp "$legacy_assets_dir/assets/." prisma-web:/usr/share/nginx/html/assets/
fi

curl --fail --silent --show-error --head https://prisma.hrtsolutions.com.br >/dev/null
docker inspect prisma-web --format '{{.State.Status}} {{.RestartCount}} {{.Image}}'
