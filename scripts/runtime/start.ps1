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

function Test-DockerEngine {
    & docker info *> $null
    return $LASTEXITCODE -eq 0
}

function Start-DockerDesktopIfAvailable {
    $candidates = @(
        (Join-Path $Env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
        (Join-Path $Env:LOCALAPPDATA "Docker\Docker Desktop.exe")
    ) | Where-Object { $_ -and (Test-Path $_) }

    if (-not $candidates) { return $false }
    Step "Docker engine is not running. Starting Docker Desktop automatically"
    Start-Process $candidates[0] | Out-Null
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        if (Test-DockerEngine) { return $true }
    }
    return $false
}

function Test-AppHealthy([string]$Url) {
    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 2
        return $response.status -eq "UP"
    } catch { return $false }
}

function Assert-PortAvailable([int]$Port, [string]$Label) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listeners) { Fail "$Label port $Port is already in use. Change it in .env or stop the conflicting process." }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker Desktop is required and docker is not available on PATH."
}

if (-not (Test-DockerEngine)) {
    if (-not (Start-DockerDesktopIfAvailable)) {
        Fail "Docker is installed but the engine is unavailable. Start Docker Desktop and retry."
    }
}

& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker Compose v2 is required. Update Docker Desktop and retry." }

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

Step "Validating Docker Compose configuration"
& docker compose config --quiet
if ($LASTEXITCODE -ne 0) { Fail "docker compose configuration is invalid." }

if ($Reset) {
    Step "Reset requested: removing NUMEN containers and local database volume"
    & docker compose down --volumes --remove-orphans
} else {
    Step "Recovering any stale NUMEN containers while preserving database data"
    & docker compose down --remove-orphans
}
if ($LASTEXITCODE -ne 0) { Fail "Unable to prepare the existing NUMEN stack." }

Assert-PortAvailable $WebPort "Web"
Assert-PortAvailable $ApiPort "API"

$args = @("compose", "up", "--detach", "--remove-orphans", "--wait", "--wait-timeout", "180")
if (-not $NoBuild) { $args += "--build" }

Step "Starting PostgreSQL, Spring Boot API and React gateway"
& docker @args
if ($LASTEXITCODE -ne 0) {
    docker compose ps
    docker compose logs --tail 200
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
    docker compose logs --tail 200
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
