param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$DatabaseHost = 'db.ioldpnqqvobprjiontre.supabase.co',
  [string]$DatabaseUser = 'postgres',
  [switch]$UseSupabaseCli,
  [switch]$StorageKeyFromClipboard
)

$ErrorActionPreference = 'Stop'
$backupScript = Join-Path $PSScriptRoot 'backup-prisma-production.mjs'

try {
  if ($UseSupabaseCli) {
    $projectRef = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\supabase\.temp\project-ref') -Raw
    if ($projectRef.Trim() -ne 'ioldpnqqvobprjiontre') { throw 'A CLI Supabase não está vinculada ao projeto Prisma esperado' }
    $dryRunLines = @(& npx.cmd --yes supabase@2.117.0 db dump --linked --dry-run 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'A CLI não conseguiu criar o acesso temporário ao PostgreSQL' }
    $dryRunText = $dryRunLines -join "`n"
    $connectionValues = @{}
    foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD')) {
      $match = [regex]::Match($dryRunText, ('(?m)^export {0}="([^"]+)"$' -f $name))
      if (-not $match.Success) { throw "A CLI não retornou $name no formato esperado" }
      $connectionValues[$name] = $match.Groups[1].Value
    }
    if ($connectionValues.PGHOST -ne 'db.ioldpnqqvobprjiontre.supabase.co' -or
        $connectionValues.PGPORT -ne '5432' -or
        $connectionValues.PGUSER -ne 'cli_login_postgres' -or
        $connectionValues.PGDATABASE -ne 'postgres') {
      throw 'A conexão temporária não corresponde ao projeto Prisma esperado'
    }
    $env:PGHOST = $connectionValues.PGHOST
    $env:PGPORT = $connectionValues.PGPORT
    $env:PGUSER = $connectionValues.PGUSER
    $env:PGDATABASE = $connectionValues.PGDATABASE
    $env:PGPASSWORD = $connectionValues.PGPASSWORD
    $dryRunLines = $null
    $dryRunText = $null
    $connectionValues = $null
  } else {
    $env:PGHOST = $DatabaseHost
    $env:PGPORT = '5432'
    $env:PGUSER = $DatabaseUser
    $env:PGDATABASE = 'postgres'
    $databaseSecret = Read-Host 'Senha PostgreSQL do projeto Prisma' -AsSecureString
    if ($databaseSecret.Length -eq 0) { throw 'Senha PostgreSQL vazia' }
    $env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $databaseSecret).Password
  }
  $env:PGSSLMODE = 'require'

  if ($StorageKeyFromClipboard) {
    $clipboardValue = (Get-Clipboard -Raw).Trim()
    if ($clipboardValue -notmatch '^(sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$') {
      throw 'A área de transferência não contém uma chave Secret ou service_role válida'
    }
    $env:PRISMA_BACKUP_STORAGE_KEY = $clipboardValue
    cmd.exe /c "echo.|clip.exe" | Out-Null
    $clipboardValue = $null
  } else {
    $storageSecret = Read-Host 'Chave server-side do Storage do mesmo projeto' -AsSecureString
    if ($storageSecret.Length -eq 0) { throw 'Chave Storage vazia' }
    $env:PRISMA_BACKUP_STORAGE_KEY = [System.Net.NetworkCredential]::new('', $storageSecret).Password
  }

  & node $backupScript backup $Destination
  if ($LASTEXITCODE -ne 0) { throw 'Backup não concluído; nenhuma limpeza foi liberada' }
} finally {
  Remove-Item Env:PGPASSWORD, Env:PRISMA_BACKUP_STORAGE_KEY -ErrorAction SilentlyContinue
  if ($StorageKeyFromClipboard) { cmd.exe /c "echo.|clip.exe" | Out-Null }
  $clipboardValue = $null
  $dryRunLines = $null
  $dryRunText = $null
  $connectionValues = $null
  if ($databaseSecret) { $databaseSecret.Dispose() }
  if ($storageSecret) { $storageSecret.Dispose() }
}
