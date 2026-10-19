$ErrorActionPreference = 'Stop'
$file = Join-Path (Split-Path $PSScriptRoot -Parent) '.local\processes.json'
if (!(Test-Path $file)) { Write-Host 'No saved local application processes.'; exit }
foreach ($record in @(Get-Content $file -Raw | ConvertFrom-Json)) {
    $process = Get-Process -Id $record.id -ErrorAction SilentlyContinue
    if ($process) {
        if ($process.StartTime.ToUniversalTime().Ticks -ne [long]$record.start_ticks) {
            throw 'Saved process identity does not match. Refusing to stop another process.'
        }
        taskkill.exe /PID $process.Id /T /F *> $null
        if ($LASTEXITCODE) { throw "Could not stop saved process $($record.id)." }
    }
}
Remove-Item -LiteralPath $file
Write-Host 'Stopped the saved local frontend/backend. PostgreSQL and its data remain available.'
