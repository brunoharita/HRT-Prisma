#!/usr/bin/env bash
set -euo pipefail
expected_sha="${1:?validated SHA required}"
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$(git rev-parse HEAD)" == "$expected_sha" ]] || { echo "Invalid release SHA" >&2; exit 2; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Tracked checkout dirty" >&2; exit 2; }
secret_file=/etc/prisma/hrt-mail-forwarder.json
[[ -f "$secret_file" && ! -L "$secret_file" && "$(stat -c %a "$secret_file")" == "400" && "$(stat -c %u "$secret_file")" == "1000" ]] || { echo "Protected configuration missing" >&2; exit 2; }
export HRT_MAIL_SHA="$expected_sha"
compose=(docker compose -f deploy/mail-forwarder.compose.yml)
if docker inspect hrt-mail-forwarder >/dev/null 2>&1; then
 previous_image="$(docker inspect --format '{{.Image}}' hrt-mail-forwarder)"
 docker tag "$previous_image" "hrt-mail-forwarder:rollback-before-${expected_sha:0:12}"
fi
"${compose[@]}" build mail-forwarder
"${compose[@]}" up -d --no-deps mail-forwarder
for attempt in $(seq 1 30); do
 if [[ "$(docker inspect --format '{{.State.Health.Status}}' hrt-mail-forwarder)" == "healthy" ]]; then
  docker inspect --format 'Mail {{.State.Status}} / {{.State.Health.Status}} / image {{.Image}}' hrt-mail-forwarder
  exit 0
 fi
 sleep 2
done
echo "Mail worker unhealthy; preserve receipts and protected configuration for rollback" >&2
exit 1
