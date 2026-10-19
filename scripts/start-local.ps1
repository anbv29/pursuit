param([switch]$TestMode, [switch]$Build)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $root '.local'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
foreach ($port in @(3000, 8000)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop that application first."
    }
}
$python = Join-Path $root 'backend\.venv\Scripts\python.exe'
if (!(Test-Path $python) -or !(Test-Path (Join-Path $root 'frontend\node_modules'))) {
    throw 'Install the backend and frontend dependencies first; see README.md.'
}
$keys = @('APP_ENV', 'DATABASE_URL', 'TEST_DATABASE_URL', 'COOKIE_SECURE', 'PUBLIC_APP_URL', 'CORS_ORIGINS',
    'FO_MODE', 'DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_KEY', 'DODO_PAYMENTS_ENVIRONMENT',
    'NEXT_DIST_DIR', 'NODE_OPTIONS', 'BACKEND_URL', 'ANTHROPIC_API_KEY', 'REPORT_WORKER_ENABLED',
    'REGISTER_LIMIT_PER_HOUR', 'LOGIN_LIMIT_PER_10MIN')
$saved = @{}
foreach ($key in $keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$started = @()
Push-Location $root
try {
    $env:APP_ENV = 'development'
    $env:DATABASE_URL = 'postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit'
    $env:TEST_DATABASE_URL = 'postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit_test'
    $env:COOKIE_SECURE = 'false'
    $env:PUBLIC_APP_URL = 'http://localhost:3000'
    $env:CORS_ORIGINS = 'http://localhost:3000'
    $env:FO_MODE = 'demo'
    # Spaces override any private .env merchant keys; they are never printed or changed on disk.
    $env:DODO_PAYMENTS_API_KEY = ' '
    $env:DODO_PAYMENTS_WEBHOOK_KEY = ' '
    $env:DODO_PAYMENTS_ENVIRONMENT = 'test_mode'
    $env:NEXT_DIST_DIR = '.next-build'
    $env:NODE_OPTIONS = '--max-old-space-size=1536'
    $env:BACKEND_URL = 'http://127.0.0.1:8000'
    if ($TestMode) {
        $env:ANTHROPIC_API_KEY = ' '
        $env:REPORT_WORKER_ENABLED = 'false'
        $env:REGISTER_LIMIT_PER_HOUR = '1000'
        $env:LOGIN_LIMIT_PER_10MIN = '1000'
    }
    docker compose up -d db
    if ($LASTEXITCODE) { throw 'Docker is unavailable. Start Docker Desktop and retry.' }
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        docker compose exec -T db pg_isready -U pursuit *> $null
        if (!$LASTEXITCODE) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Local PostgreSQL did not become ready.' }
    Push-Location (Join-Path $root 'backend')
    try { & $python -m alembic upgrade head; if ($LASTEXITCODE) { throw 'Database migration failed.' } }
    finally { Pop-Location }
    if ($Build -or !(Test-Path (Join-Path $root 'frontend\.next-build\BUILD_ID'))) {
        Push-Location (Join-Path $root 'frontend')
        try { npm.cmd run build; if ($LASTEXITCODE) { throw 'Frontend build failed.' } }
        finally { Pop-Location }
    }
    $api = Start-Process $python -ArgumentList '-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000','--no-access-log' -WorkingDirectory (Join-Path $root 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'backend.log') -RedirectStandardError (Join-Path $runtime 'backend-error.log')
    $started += $api
    $web = Start-Process (Get-Command node.exe).Source -ArgumentList 'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000' -WorkingDirectory (Join-Path $root 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'frontend.log') -RedirectStandardError (Join-Path $runtime 'frontend-error.log')
    $started += $web
    $started | ForEach-Object { @{ id = $_.Id; start_ticks = $_.StartTime.ToUniversalTime().Ticks } } | ConvertTo-Json | Set-Content (Join-Path $runtime 'processes.json')
    $healthy = $false
    for ($i = 0; $i -lt 45; $i++) {
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:3000/api/health' -TimeoutSec 3
            if ($health.status -eq 'ok') { $healthy = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (!$healthy) { throw 'Local services did not become healthy. See .local logs.' }
    Write-Host 'Pursuit is ready at http://localhost:3000 (simulated Fo; payments disabled).'
} catch {
    foreach ($process in $started) { taskkill.exe /PID $process.Id /T /F *> $null }
    throw
} finally {
    Pop-Location
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process') }
}
