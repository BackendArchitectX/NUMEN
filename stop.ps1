param([switch]$Volumes)
$runner = Join-Path $PSScriptRoot "scripts\runtime\stop.ps1"
& $runner -Volumes:$Volumes
exit $LASTEXITCODE
