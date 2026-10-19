$ErrorActionPreference = 'Stop'
$file = Join-Path (Split-Path $PSScriptRoot -Parent) '.local\processes.json'
if (!(Test-Path $file)) { Write-Host 'No saved local application processes.'; exit }
foreach ($record in @(Get-Content $file -Raw | ConvertFrom-Json)) {
    $process = Get-Process -Id $record.id -ErrorAction SilentlyContinue
    if ($process -and $process.StartTime.ToUniversalTime().ToString('o') -eq $record.started) {
        taskkill.exe /PID $process.Id /T /F *> $null
    }
}
Remove-Item -LiteralPath $file
Write-Host 'Stopped the saved local frontend/backend. PostgreSQL and its data remain available.'
