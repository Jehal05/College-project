# Runs the Phase 3 check on the laptop and writes laptop-phase3-log.txt. Needs no new packages.
# Usage (PowerShell, in the repo folder, on branch Puneet):   .\laptop-phase3-check.cmd
# If the backend is not already running on port 8000 this starts it (backend\.venv, DEMO_MODE=true, throw-away demo data)
# and stops it afterwards. It never installs anything.
param([int]$Port = 8000)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$be = Join-Path $root 'backend'
$log = Join-Path $root 'laptop-phase3-log.txt'
"laptop-phase3-check started $(Get-Date -Format s)" | Out-File $log -Encoding utf8
$vpy = Join-Path $be '.venv\Scripts\python.exe'
if (-not (Test-Path $vpy)) { "GIVING UP: no backend\.venv (run laptop-backend.cmd once)" | Add-Content $log; exit 1 }
Set-Location $root
"--- branch: $(git rev-parse --abbrev-ref HEAD)  commit: $(git rev-parse --short HEAD)" | Add-Content $log
"--- uncommitted files: $((git status --short | Measure-Object).Count)" | Add-Content $log
$base = "http://localhost:$Port"
$started = $null
function Up { try { (Invoke-WebRequest "$base/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { $false } }
if (Up) {
  "--- a backend already answers on $base (using it; the code it runs may be older than this branch)" | Add-Content $log
} else {
  "--- starting the backend from this branch on port $Port" | Add-Content $log
  $env:DEMO_MODE = 'true'
  if (-not $env:FERNET_KEY) { $env:FERNET_KEY = (& $vpy -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())") }
  if (-not $env:JWT_SECRET_KEY) { $env:JWT_SECRET_KEY = 'laptop-check-' + [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') }
  $env:DATABASE_URL = 'sqlite:///' + (Join-Path $env:TEMP 'healthtwin-phase3-check.db').Replace('\', '/')
  Remove-Item (Join-Path $env:TEMP 'healthtwin-phase3-check.db*') -ErrorAction SilentlyContinue
  $started = Start-Process -FilePath $vpy -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--port', "$Port") -WorkingDirectory $be -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $env:TEMP 'phase3-uvicorn.out') -RedirectStandardError (Join-Path $env:TEMP 'phase3-uvicorn.err')
  for ($i = 0; $i -lt 30 -and -not (Up); $i++) { Start-Sleep -Seconds 1 }
  if (-not (Up)) {
    "GIVING UP: the backend did not start. Its messages:" | Add-Content $log
    (Get-Content (Join-Path $env:TEMP 'phase3-uvicorn.err') -Tail 25 -ErrorAction SilentlyContinue | Out-String) | Add-Content $log
    if ($started) { Stop-Process -Id $started.Id -Force -ErrorAction SilentlyContinue }
    exit 1
  }
}
"=== PHASE 3 CHECK" | Add-Content $log
$out = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\phase3-check.ps1') -Base $base 2>&1
($out | Out-String) | Add-Content $log
"check exit code: $LASTEXITCODE" | Add-Content $log
if ($started) { Stop-Process -Id $started.Id -Force -ErrorAction SilentlyContinue; "--- backend stopped" | Add-Content $log }
"DONE $(Get-Date -Format s)" | Add-Content $log
Write-Host (Get-Content $log -Raw)
