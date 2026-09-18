param([string]$Database='m72_m73_baseline',[int]$Port=55471)
$ErrorActionPreference='Stop'
if ($Database -notmatch '^m72_m73_[a-z0-9_]+$') { throw 'Only the task-scoped disposable baseline is allowed' }
# Bootstrap a fresh baseline with test-m72-postgres.ps1 first. Every M73 DDL/data test rolls back.
$sql = "begin;`n" + (Get-Content -Raw supabase/migrations/20260918180000_m73_declared_competency_normalization.sql) + "`n" + (Get-Content -Raw supabase/qa/m73_competency_normalization_verification.sql) + "`nrollback;"
$sql | & 'C:/Program Files/PostgreSQL/17/bin/psql.exe' -X -h 127.0.0.1 -p $Port -U m71_test -d $Database -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'M73 verification failed; transaction rolled back' }
