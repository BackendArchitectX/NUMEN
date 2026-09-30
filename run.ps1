$ErrorActionPreference = "Stop"
Write-Host "[NUMEN] Building and starting the platform..." -ForegroundColor Cyan
docker compose up --build
