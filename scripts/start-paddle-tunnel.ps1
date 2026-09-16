param(
    [string]$VpsHost = '72.60.241.90',
    [string]$VpsUser = 'root',
    [string]$IdentityFile = (Join-Path $env:USERPROFILE '.ssh\id_ed25519_prisma')
)

# Foreground lifetime is intentional: ending this process closes the temporary bridge.
# No inbound port on the PC and no public worker listener on the VPS.
& ssh -N -T -i $IdentityFile `
    -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes `
    -o ExitOnForwardFailure=yes -o ConnectTimeout=10 `
    -o ServerAliveInterval=30 -o ServerAliveCountMax=3 `
    -R 127.0.0.1:18080:127.0.0.1:8080 `
    -R 127.0.0.1:18081:127.0.0.1:8081 "$VpsUser@$VpsHost"
exit $LASTEXITCODE
