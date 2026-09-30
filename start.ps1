param(
    [switch]$NoBrowser,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Step([string]$Message) {
    Write-Host "[NUMEN] $Message" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Host "[NUMEN] ERROR: $Message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed or is not available on PATH. Install Docker Desktop and retry."
}

try { docker info *> $null } catch { Fail "Docker Desktop is not running." }

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Step "Created .env from .env.example"
}

Write-Step "Validating Docker Compose configuration"
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { Fail "docker compose configuration is invalid." }

$Args = @("compose", "up", "--detach", "--remove-orphans")
if ($Rebuild) { $Args += "--build" } else { $Args += "--build" }

Write-Step "Building and starting PostgreSQL, Spring Boot and React"
& docker @Args
if ($LASTEXITCODE -ne 0) { Fail "Docker Compose failed to start NUMEN." }

$WebPort = 5173
$PortLine = Get-Content ".env" | Where-Object { $_ -match '^NUMEN_WEB_PORT=' } | Select-Object -First 1
if ($PortLine) { $WebPort = [int](($PortLine -split '=', 2)[1].Trim()) }
$AppUrl = "http://localhost:$WebPort"
$HealthUrl = "$AppUrl/api/v1/health"

Write-Step "Waiting for the application to become healthy"
$Healthy = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $Response = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 3
        if ($Response.status -eq "UP") { $Healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}

if (-not $Healthy) {
    Write-Host ""
    docker compose ps
    Write-Host ""
    docker compose logs --tail 120
    Fail "NUMEN did not become healthy within 120 seconds. Logs are shown above."
}

Write-Host ""
Write-Host "  NUMEN is ready" -ForegroundColor Green
Write-Host "  Web: $AppUrl"
Write-Host "  API: http://localhost:8080/api/v1"
Write-Host "  Stop: .\stop.ps1"
Write-Host ""

if (-not $NoBrowser) {
    Start-Process $AppUrl
}
