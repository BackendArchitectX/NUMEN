param([switch]$Volumes)
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[NUMEN] Docker is not available on PATH." -ForegroundColor Red
    exit 1
}

$args = @("compose", "down", "--remove-orphans")
if ($Volumes) { $args += "--volumes" }
& docker @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Volumes) { Write-Host "[NUMEN] NUMEN stopped and local database data removed." -ForegroundColor Green }
else { Write-Host "[NUMEN] NUMEN stopped. Local database data was preserved." -ForegroundColor Green }
