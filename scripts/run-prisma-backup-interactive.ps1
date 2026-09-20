param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$DatabaseHost = 'db.ioldpnqqvobprjiontre.supabase.co',
  [string]$DatabaseUser = 'postgres',
  [switch]$StorageKeyFromClipboard
)

$ErrorActionPreference = 'Stop'
$backupScript = Join-Path $PSScriptRoot 'backup-prisma-production.mjs'
$env:PGHOST = $DatabaseHost
$env:PGPORT = '5432'
$env:PGUSER = $DatabaseUser
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = 'require'

try {
  $databaseSecret = Read-Host 'Senha PostgreSQL do projeto Prisma' -AsSecureString
  if ($databaseSecret.Length -eq 0) { throw 'Senha PostgreSQL vazia' }
  $env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $databaseSecret).Password

  if ($StorageKeyFromClipboard) {
    $clipboardValue = Get-Clipboard -Raw
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
  if ($databaseSecret) { $databaseSecret.Dispose() }
  if ($storageSecret) { $storageSecret.Dispose() }
}
