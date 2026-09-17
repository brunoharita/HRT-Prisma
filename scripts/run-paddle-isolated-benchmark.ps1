param(
    [Parameter(Mandatory = $true)][string]$PdfPath,
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]{1,48}$')][string]$Case,
    [Parameter(Mandatory = $true)][ValidateSet(1, 2, 4, 8, 10)][int]$Threads,
    [ValidateSet('default', 'paddle', 'mkldnn')][string]$RunMode = 'default',
    [ValidateSet('original', 'latin-rec', 'mobile')][string]$ModelVariant = 'original',
    [ValidateRange(0, 5)][int]$Page = 1,
    [ValidateRange(1, 240)][int]$InferenceTimeout = 60,
    [string]$OutputDirectory = 'tmp/paddle-perf-20260917',
    [string]$Image = 'paddle-structure:rollback-before-recreate-20260916',
    [switch]$NoTables,
    [switch]$LeanInit,
    [switch]$BoundLibraries
)
$ErrorActionPreference = 'Stop'
$sourcePdf = (Resolve-Path -LiteralPath $PdfPath).Path
if ([IO.Path]::GetExtension($sourcePdf) -ne '.pdf') { throw 'Only an explicitly authorized PDF is accepted.' }
$benchmarkScript = Join-Path $PSScriptRoot 'paddle-isolated-benchmark.py'
$outputDirectoryPath = (New-Item -ItemType Directory -Force -Path $OutputDirectory).FullName
$containerName = "prisma-paddle-perf-$Case"
$existing = docker ps -a --filter "name=^/$containerName$" --format '{{.Names}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker unavailable.' }
if ($existing) { throw 'Diagnostic container name already exists; refusing to replace it.' }
$argsForContainer = @(
    'run', '--rm', '--pull', 'never', '--name', $containerName,
    '--network', 'none', '--memory', '6g', '--memory-swap', '6g', '--cpus', '8',
    '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--tmpfs', '/tmp:rw,size=1g', '--tmpfs', '/home/paddle/.cache:rw,uid=10001,gid=10001,size=128m',
    '--mount', 'type=volume,source=paddle_paddle-structure-models,target=/var/cache/paddlex,readonly',
    '--mount', 'type=volume,source=prisma-paddle-benchmark-models-20260917,target=/candidate-models,readonly',
    '--mount', "type=bind,source=$benchmarkScript,target=/benchmark.py,readonly",
    '--mount', "type=bind,source=$sourcePdf,target=/input.pdf,readonly",
    '--mount', "type=bind,source=$outputDirectoryPath,target=/work",
    '-e', 'PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True', '--entrypoint', 'timeout', $Image,
    '--signal=KILL', "$($InferenceTimeout + 190)s", 'python', '/benchmark.py',
    '--input', '/input.pdf', '--case', $Case, '--threads', "$Threads",
    '--run-mode', $RunMode, '--page', "$Page", '--infer-timeout', "$InferenceTimeout",
    '--model-variant', $ModelVariant
)
if ($BoundLibraries) {
    # Docker options must precede the image. Keep model math threads in the CLI.
    $imageIndex = [Array]::IndexOf($argsForContainer, $Image)
    $argsForContainer = $argsForContainer[0..($imageIndex - 1)] + @(
        '-e', 'OPENBLAS_NUM_THREADS=1', '-e', "OMP_NUM_THREADS=$Threads",
        '-e', "MKL_NUM_THREADS=$Threads", '-e', 'NUMEXPR_NUM_THREADS=1'
        '-e', "PADDLE_PDX_CPU_NUM_THREADS=$Threads", '-e', 'KMP_BLOCKTIME=0', '-e', 'OMP_WAIT_POLICY=PASSIVE'
    ) + $argsForContainer[$imageIndex..($argsForContainer.Length - 1)]
}
if ($NoTables) { $argsForContainer += '--no-tables' }
if ($LeanInit) { $argsForContainer += '--lean-init' }
docker @argsForContainer
$diagnosticExitCode = $LASTEXITCODE
Write-Output "DiagnosticExitCode=$diagnosticExitCode"
exit $diagnosticExitCode
