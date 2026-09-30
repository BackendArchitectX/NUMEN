param(
    [switch]$NoBrowser,
    [switch]$Reset,
    [switch]$NoBuild
)

$runner = Join-Path $PSScriptRoot "scripts\runtime\start.ps1"
& $runner -NoBrowser:$NoBrowser -Reset:$Reset -NoBuild:$NoBuild
exit $LASTEXITCODE
