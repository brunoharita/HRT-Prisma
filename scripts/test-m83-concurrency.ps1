param(
  [string]$Baseline='m72_semantic_trajectory_20260925',
  [string]$Database=('m72_semantic_trajectory_race_' + (Get-Date -Format 'yyyyMMddHHmmss')),
  [int]$Port=55471
)
$ErrorActionPreference='Stop'
if ($Baseline -notmatch '^m72_semantic_trajectory_[a-z0-9_]+$' -or $Database -notmatch '^m72_semantic_trajectory_race_[a-z0-9_]+$') {
  throw 'Only disposable task databases are allowed'
}
$pgBin='C:/Program Files/PostgreSQL/17/bin'
$psql=Join-Path $pgBin 'psql.exe'
$connection=@('-X','-h','127.0.0.1','-p',"$Port",'-U','m71_test','-d',$Database,'-v','ON_ERROR_STOP=1')
# Create a new isolated clone; existing names fail. Keep it for inspection, never reset/drop.
& (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $Port -U m71_test -T $Baseline $Database
if ($LASTEXITCODE -ne 0) { throw 'New disposable concurrency database required; no existing database was overwritten' }
$verification=Get-Content -Raw supabase/qa/m83_semantic_trajectory_verification.sql
$marker='-- M83 transactional checks start here'
$boundary=$verification.IndexOf($marker)
if ($boundary -lt 0) { throw 'Fixture boundary missing' }
# Persistent synthetic fixture in the newly cloned database lets independent connections see the same sources.
$fixture=$verification.Substring(0,$boundary).Replace('create temp table m83_state','create table public.m83_state')
$setup="begin;`n"+(Get-Content -Raw supabase/migrations/20260925150000_m83_semantic_trajectory.sql)+"`n"+(Get-Content -Raw supabase/migrations/20260925190000_m83_prompt_compatibility.sql)+"`n"+$fixture+"`ninsert into m83_state select 'versions',private.m83_sources(m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'))->'sourceVersions';`ncommit;"
$setup | & $psql @connection -q
if ($LASTEXITCODE -ne 0) { throw 'Concurrency setup failed' }
$processes=@()
try {
  foreach ($number in 1..6) {
    $info=[System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName=$psql
    $info.UseShellExecute=$false
    $info.CreateNoWindow=$true
    $info.RedirectStandardOutput=$true
    $info.RedirectStandardError=$true
    foreach ($argument in ($connection + @('-Atq','-c',"begin; set local role service_role; select public.m83_claim()->>'acquired'; select pg_sleep(0.2); commit;"))) {
      $info.ArgumentList.Add($argument)
    }
    $processes += [System.Diagnostics.Process]::Start($info)
  }
  $results=@()
  foreach ($process in $processes) {
    $output=$process.StandardOutput.ReadToEnd()
    $failure=$process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "Concurrent claim failed: $failure" }
    $results += $output.Trim()
  }
  if (($results | Where-Object { $_ -eq 'true' }).Count -ne 1 -or ($results | Where-Object { $_ -eq 'false' }).Count -ne 5) {
    throw "Expected one lease winner and five cache readers; got $($results -join ',')"
  }
  $count=& $psql @connection -Atq -c 'select count(*) from public.matching_trajectory_assessments;'
  if ($LASTEXITCODE -ne 0 -or $count -ne '1') { throw 'Expected one persisted assessment' }
  Write-Output "PASS: six independent PostgreSQL sessions, one lease winner, one cache row. Synthetic database retained: $Database"
  # NOWAIT/try-lock must fail immediately, including the Knowledge publication lock-order hazard.
  foreach ($lockSql in @('select pg_advisory_xact_lock(830032)', 'lock table public.organization_memberships in row exclusive mode', 'lock table public.knowledge_terms in row exclusive mode', 'lock table public.knowledge_change_sets in row exclusive mode')) {
    $holderInfo=[System.Diagnostics.ProcessStartInfo]::new()
    $holderInfo.FileName=$psql
    $holderInfo.UseShellExecute=$false
    $holderInfo.CreateNoWindow=$true
    $holderInfo.RedirectStandardOutput=$true
    $holderInfo.RedirectStandardError=$true
    foreach ($argument in ($connection + @('-Atq','-c',"set application_name='m83_timeout_holder'; begin; $lockSql; select pg_sleep(5); rollback;"))) {
      $holderInfo.ArgumentList.Add($argument)
    }
    $holder=[System.Diagnostics.Process]::Start($holderInfo)
    try {
      $ready=$false
      foreach ($poll in 1..30) {
        $held=& $psql @connection -Atq -c "select count(*) from pg_stat_activity where application_name='m83_timeout_holder' and wait_event='PgSleep';"
        if ($held -eq '1') { $ready=$true; break }
        Start-Sleep -Milliseconds 50
      }
      if (!$ready) { throw 'Lock holder did not become ready' }
      $watch=[System.Diagnostics.Stopwatch]::StartNew()
      $failure=& $psql @connection -Atq -v VERBOSITY=verbose -c "set role service_role; select public.commit_matching_snapshot(null,null,null,null,null,null,null);" 2>&1
      $code=$LASTEXITCODE
      $watch.Stop()
      if ($code -eq 0 -or ($failure -join ' ') -notmatch '55P03' -or $watch.Elapsed.TotalSeconds -gt 1.5) {
        throw "Expected immediate recoverable lock failure, got $code after $($watch.Elapsed.TotalSeconds)s: $failure"
      }
      Write-Output "PASS: snapshot NOWAIT SQLSTATE 55P03 after $([math]::Round($watch.Elapsed.TotalSeconds,2))s ($lockSql)"
      $holder.WaitForExit()
      if ($holder.ExitCode -ne 0) { throw 'Lock holder failed' }
    } finally { $holder.Dispose() }
  }
} finally {
  foreach ($process in $processes) { $process.Dispose() }
}
