#!/usr/bin/env bash
set -euo pipefail
expected_sha="${1:?validated SHA required}"
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$(git rev-parse HEAD)" == "$expected_sha" ]] || { echo "Invalid release SHA" >&2; exit 2; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Tracked checkout dirty" >&2; exit 2; }
for secret_file in /etc/prisma/profile-synthesis.env /etc/prisma/parser-ia.env; do
 [[ -f "$secret_file" && ! -L "$secret_file" && "$(stat -c %a "$secret_file")" == "400" && "$(stat -c %u "$secret_file")" == "1000" ]] || { echo "Protected worker configuration missing" >&2; exit 2; }
done
export PRISMA_SYNTHESIS_SHA="$expected_sha"
compose=(docker compose -f deploy/profile-synthesis.compose.yml)
if docker inspect prisma-profile-synthesis >/dev/null 2>&1; then
 previous_image="$(docker inspect --format '{{.Image}}' prisma-profile-synthesis)"
 docker tag "$previous_image" "prisma-profile-synthesis:rollback-before-${expected_sha:0:12}"
fi
"${compose[@]}" build profile-synthesis
"${compose[@]}" up -d --no-deps profile-synthesis
for attempt in $(seq 1 30); do
 if [[ "$(docker inspect --format '{{.State.Health.Status}}' prisma-profile-synthesis)" == "healthy" ]]; then
  docker inspect --format 'Synthesis {{.State.Status}} / {{.State.Health.Status}} / image {{.Image}}' prisma-profile-synthesis
  exit 0
 fi
 sleep 2
done
echo "Worker unhealthy; preserve credentials/results, stop or restore rollback image" >&2
exit 1
