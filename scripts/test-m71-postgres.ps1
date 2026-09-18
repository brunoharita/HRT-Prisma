param(
  [string]$PostgresBin = 'C:/Program Files/PostgreSQL/17/bin',
  [int]$Port = 55471,
  [string]$Database = 'm71_contract_tests',
  [switch]$VerifyOnly,
  [switch]$RefreshFunctions
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^m71_[a-z0-9_]+$') { throw 'Only a task-scoped disposable database is allowed' }
$psql = Join-Path $PostgresBin 'psql.exe'
$connection = @('-X','-h','127.0.0.1','-p',"$Port",'-U','m71_test','-v','ON_ERROR_STOP=1')
if (-not $VerifyOnly) {
  & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $Port -U m71_test $Database
  if ($LASTEXITCODE -ne 0) { throw 'Create a new disposable database; this runner never resets existing databases' }
  & $psql @connection -d $Database -q -f supabase/qa/m71_local_bootstrap.sql
  if ($LASTEXITCODE -ne 0) { throw 'Bootstrap failed' }
  # Only scheduled remote source monitoring needs Vault/Cron/net. It is outside M7.1.
  $migrationFiles = Get-ChildItem -LiteralPath supabase/migrations -Filter '*.sql' | Sort-Object Name
  foreach ($migrationFile in $migrationFiles) {
    if ($migrationFile.Name -match 'knowledge_source_monitor') { continue }
    # Two historical resume-only textual patches reject the checked-in M2c body.
    # This scoped harness skips them, not any Position/Knowledge/RLS owner.
    # It is not a validation of the entire historical migration replay.
    if ($migrationFile.Name -in @('20260824223000_m2c_persist_status_enum_cast.sql','20260824224000_m2c_domain_conflict_codes.sql')) { continue }
    if ($migrationFile.Name -gt '20260918010000_m71_position_taxonomy.sql') { continue }
    if ($migrationFile.Name -eq '20260824113000_m2_users_people.sql') {
      # Historical replay gap: M2 replaces this enum/helper and recreates every affected policy.
      # Remove only the superseded helper in this fresh, empty disposable database.
      & $psql @connection -d $Database -q -c 'drop function private.has_org_role(uuid,public.membership_role[]) cascade;'
      if ($LASTEXITCODE -ne 0) { throw 'Historical M2 replay preparation failed' }
    }
    Write-Output $migrationFile.Name
    & $psql @connection -d $Database -q -f $migrationFile.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($migrationFile.Name)" }
  }
}
if ($RefreshFunctions) {
  # Iteration on this local disposable baseline only, not a deployment command.
  $migrationText = Get-Content -Raw -LiteralPath supabase/migrations/20260918010000_m71_position_taxonomy.sql
  $migrationText.Substring($migrationText.IndexOf('create function private.m71_require_editor')) -replace '(?m)^create function ', 'create or replace function ' |
    & $psql @connection -d $Database -q
  if ($LASTEXITCODE -ne 0) { throw 'Local M7.1 function refresh failed' }
}
& $psql @connection -d $Database -f supabase/qa/m71_position_taxonomy_verification.sql
if ($LASTEXITCODE -ne 0) { throw 'M7.1 PostgreSQL verification failed' }
