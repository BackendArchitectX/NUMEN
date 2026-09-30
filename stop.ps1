$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Write-Host "[NUMEN] Stopping application..." -ForegroundColor Cyan
docker compose down --remove-orphans
