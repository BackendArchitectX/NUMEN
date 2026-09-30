param(
    [switch]$NoBrowser,
    [switch]$Reset,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $Root

function Step([string]$Message) { Write-Host "[NUMEN] $Message" -ForegroundColor Cyan }
function Success([string]$Message) { Write-Host "[NUMEN] $Message" -ForegroundColor Green }
function Fail([string]$Message) { Write-Host "[NUMEN] ERROR: $Message" -ForegroundColor Red; exit 1 }

function Get-EnvValue([string]$Name, [string]$Default) {
    if (-not (Test-Path ".env")) { return $Default }
    $escaped = [Regex]::Escape($Name)
    $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$escaped=" } | Select-Object -First 1
    if (-not $line) { return $Default }
    $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    return $value
}

function Test-AppHealthy([string]$Url) {
    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 2
        return $response.status -eq "UP"
    } catch { return $false }
}

function Assert-PortAvailable([int]$Port, [string]$Label) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listeners) {
        Fail "$Label port $Port is already in use. Change it in .env or stop the process using that port."
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed or is not available on PATH. Install Docker Desktop and retry."
}

try { docker info *> $null } catch { Fail "Docker Desktop is installed but the Docker engine is not running." }
try { docker compose version *> $null } catch { Fail "Docker Compose v2 is required. Update Docker Desktop and retry." }

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    $password = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")).Substring(0, 48)
    (Get-Content ".env") -replace '^POSTGRES_PASSWORD=.*$', "POSTGRES_PASSWORD=$password" | Set-Content ".env"
    Step "Created .env with a unique local database password"
}

$WebPort = [int](Get-EnvValue "NUMEN_WEB_PORT" "5173")
$ApiPort = [int](Get-EnvValue "NUMEN_API_PORT" "8080")
$AppUrl = "http://localhost:$WebPort"
$HealthUrl = "$AppUrl/api/v1/health"

if (Test-AppHealthy $HealthUrl) {
    Success "NUMEN is already running and healthy"
    Write-Host "  Web: $AppUrl"
    Write-Host "  API gateway: $AppUrl/api/v1"
    if (-not $NoBrowser) { Start-Process $AppUrl }
    exit 0
}

Assert-PortAvailable $WebPort "Web"
Assert-PortAvailable $ApiPort "API"

if ($Reset) {
    Step "Reset requested: removing existing containers and local database volume"
    docker compose down --volumes --remove-orphans
}

Step "Validating Docker Compose configuration"
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { Fail "docker compose configuration is invalid." }

$args = @("compose", "up", "--detach", "--remove-orphans", "--wait", "--wait-timeout", "180")
if (-not $NoBuild) { $args += "--build" }

Step "Starting PostgreSQL, Spring Boot API and React gateway"
& docker @args
if ($LASTEXITCODE -ne 0) {
    docker compose ps
    docker compose logs --tail 160
    Fail "NUMEN failed to start. Diagnostics are shown above."
}

Step "Verifying the public application endpoint"
$healthy = $false
for ($i = 0; $i -lt 15; $i++) {
    if (Test-AppHealthy $HealthUrl) { $healthy = $true; break }
    Start-Sleep -Seconds 2
}

if (-not $healthy) {
    docker compose ps
    docker compose logs --tail 160
    Fail "Containers started, but the application health endpoint did not become ready."
}

Write-Host ""
Success "NUMEN is ready"
Write-Host "  Web:         $AppUrl"
Write-Host "  API gateway: $AppUrl/api/v1"
Write-Host "  Direct API:  http://localhost:$ApiPort/api/v1"
Write-Host "  Health:      $HealthUrl"
Write-Host "  Stop:        .\stop.ps1"
Write-Host "  Reset data:  .\stop.ps1 -Volumes"
Write-Host ""

docker compose ps

if (-not $NoBrowser) { Start-Process $AppUrl }
