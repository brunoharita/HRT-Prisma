param([string]$Database='m72_semantic_trajectory_20260925',[int]$Port=55471)
$ErrorActionPreference='Stop'
if ($Database -notmatch '^m72_semantic_trajectory_[a-z0-9_]+$') { throw 'Only the task-scoped disposable M72 baseline is allowed' }
# Existing baseline only. Never resets a database or replays the historical migration ledger.
# M72 fixture rolls back; M83 supplies its own synthetic fixture inside this transaction.
$sql = "begin;`n" + (Get-Content -Raw supabase/migrations/20260925150000_m83_semantic_trajectory.sql) + "`n" + (Get-Content -Raw supabase/qa/m83_semantic_trajectory_verification.sql) + "`nrollback;"
$sql | & 'C:/Program Files/PostgreSQL/17/bin/psql.exe' -X -h 127.0.0.1 -p $Port -U m71_test -d $Database -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'M83 verification failed; connection close rolls back the transaction' }
