param(
  [string]$PostgresBin = 'C:/Program Files/PostgreSQL/17/bin',
  [int]$Port = 55471,
  [string]$Database = 'm72_contract_tests',
  [switch]$VerifyOnly,
  [switch]$RefreshFunctions
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^m72_[a-z0-9_]+$') { throw 'Only a task-scoped disposable database is allowed' }
$psql = Join-Path $PostgresBin 'psql.exe'
$connection = @('-X','-h','127.0.0.1','-p',"$Port",'-U','m71_test','-v','ON_ERROR_STOP=1')
if (-not $VerifyOnly) {
  & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $Port -U m71_test $Database
  if ($LASTEXITCODE -ne 0) { throw 'Create a new disposable database; this runner never resets existing databases' }
  & $psql @connection -d $Database -q -f supabase/qa/m71_local_bootstrap.sql
  if ($LASTEXITCODE -ne 0) { throw 'Bootstrap failed' }
  $migrationFiles = Get-ChildItem -LiteralPath supabase/migrations -Filter '*.sql' | Sort-Object Name
  foreach ($migrationFile in $migrationFiles) {
    if ($migrationFile.Name -match 'knowledge_source_monitor') { continue }
    if ($migrationFile.Name -in @('20260824223000_m2c_persist_status_enum_cast.sql','20260824224000_m2c_domain_conflict_codes.sql')) { continue }
    if ($migrationFile.Name -gt '20260918160000_m72_person_professional_evidence.sql') { continue }
    if ($migrationFile.Name -eq '20260824113000_m2_users_people.sql') {
      & $psql @connection -d $Database -q -c 'drop function private.has_org_role(uuid,public.membership_role[]) cascade;'
      if ($LASTEXITCODE -ne 0) { throw 'Historical M2 replay preparation failed' }
    }
    Write-Output $migrationFile.Name
    & $psql @connection -d $Database -q -f $migrationFile.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($migrationFile.Name)" }
  }
}
if ($RefreshFunctions) {
  $migrationText = Get-Content -Raw -LiteralPath supabase/migrations/20260918160000_m72_person_professional_evidence.sql
  $migrationText -replace '(?m)^create function ', 'create or replace function ' | & $psql @connection -d $Database -q
  if ($LASTEXITCODE -ne 0) { throw 'Local M7.2 function refresh failed' }
}
& $psql @connection -d $Database -f supabase/qa/m72_person_professional_evidence_verification.sql
if ($LASTEXITCODE -ne 0) { throw 'M7.2 PostgreSQL verification failed' }
