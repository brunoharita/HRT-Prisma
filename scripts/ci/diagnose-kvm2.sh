#!/usr/bin/env bash
# Read-only, run as administrative operator on KVM2. No secrets or unit contents.
set -euo pipefail
if [[ $(id -u) != 0 ]]; then echo 'Administrative read access required' >&2; exit 1; fi
printf '=== host capacity ===\n'
uname -srmo
nproc
free -b
printf '=== account / groups / subordinate IDs ===\n'
for account in prisma-ci prisma-ci-runner horus-ci; do
  if ! getent passwd "$account"; then continue; fi
  id "$account"
  for file in /etc/subuid /etc/subgid; do
    awk -F: -v account="$account" '$1 == account {print FILENAME ":" $0}' "$file"
  done
  account_home=$(getent passwd "$account" | cut -d: -f6)
  account_uid=$(id -u "$account")
  for path in "$account_home" "$account_home/actions-runner" "/run/user/$account_uid" "/run/user/$account_uid/docker.sock"; do
    if [[ -e "$path" ]]; then stat -c '%A %U:%G %n' "$path"; fi
  done
  # File names/permissions only. Never read registration credentials or environment.
  if [[ -d "$account_home" ]]; then
    find "$account_home" -maxdepth 3 \( -name .runner -o -name .credentials -o -name .credentials_rsaparams -o -name config.sh -o -name daemon.json -o -name docker.service \) -printf '%M %u:%g %p\n'
  fi
  printf '=== account resource slice ===\n'
  systemctl show "user-${account_uid}.slice" --no-pager \
    -p ActiveState -p ControlGroup -p Slice -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemorySwapMax -p TasksMax
 done
printf '=== CI root-managed services (selected properties, no environment/secrets) ===\n'
mapfile -t units < <(systemctl list-unit-files --type=service --no-legend | awk '$1 ~ /^(prisma-ci|horus-ci)-.*\.service$/ {print $1}')
for unit in "${units[@]}"; do
  systemctl show "$unit" --no-pager \
    -p Id -p UnitFileState -p ActiveState -p SubState -p User -p Group \
    -p Slice -p ControlGroup -p Restart -p RestartUSec -p KillMode \
    -p NoNewPrivileges -p ProtectSystem -p ProtectHome -p PrivateTmp \
    -p PrivateNetwork -p NetworkNamespacePath -p RestrictAddressFamilies \
    -p CapabilityBoundingSet -p ProtectProc -p ProcSubset \
    -p ReadWritePaths -p InaccessiblePaths -p BindPaths -p BindReadOnlyPaths \
    -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemorySwapMax -p TasksMax
 done
printf '=== existing shared CI budget ===\n'
systemctl show ci.slice --no-pager -p ActiveState -p ControlGroup -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemorySwapMax -p TasksMax
printf '=== firewall table identities (not rules or credentials) ===\n'
if command -v nft >/dev/null; then nft list tables; fi
printf '=== trusted verifier prerequisite ===\n'
if [[ -x /usr/bin/node ]]; then /usr/bin/node --version; else echo '/usr/bin/node absent'; fi
