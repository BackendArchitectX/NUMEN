$ErrorActionPreference = "Stop"

$files = @(
    "start.ps1",
    "stop.ps1",
    "scripts/runtime/start.ps1",
    "scripts/runtime/stop.ps1"
)

$failed = $false
foreach ($file in $files) {
    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path $file).Path,
        [ref]$tokens,
        [ref]$errors
    ) | Out-Null

    if ($errors.Count -gt 0) {
        $failed = $true
        Write-Host "[NUMEN] PowerShell parse errors in $file" -ForegroundColor Red
        foreach ($parseError in $errors) {
            Write-Host "  $($parseError.Message)" -ForegroundColor Red
        }
    }
}

if ($failed) { exit 1 }
Write-Host "[NUMEN] PowerShell launcher syntax OK" -ForegroundColor Green
