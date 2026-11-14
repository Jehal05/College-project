# Start the HealthTwin AI hospital portal for the demo (Simulated prototype).
#
#   cd hospital-portal
#   .\scripts\start-demo.ps1
#
# What it does, in order:
#   1. checks that Node is installed (version 22 or newer is what the project uses)
#   2. runs "npm ci" if node_modules is missing or older than package-lock.json
#   3. creates .env from .env.example if there is no .env yet (the built-in mock, no backend needed)
#   4. starts the dev server and waits until it answers
#   5. opens the portal in your browser
# Press Ctrl+C in this window to stop the server.
#
# Options:  -Port 5174   the address port (5174 is the portal's usual port)
#           -NoBrowser   do not open the browser
#           -SkipInstall do not run npm ci even if it looks needed
param(
  [int]$Port = 5174,
  [switch]$NoBrowser,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$portal = Split-Path -Parent $PSScriptRoot
Set-Location $portal

function Say($text) { Write-Host "[start-demo] $text" }
function Stop-WithMessage($text) { Write-Host "[start-demo] $text" -ForegroundColor Red; exit 1 }

# 1. Node
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Stop-WithMessage 'Node.js was not found. Install Node 22 or newer from https://nodejs.org and open a new PowerShell window.'
}
$nodeVersion = (& node --version).Trim()
$major = [int]($nodeVersion.TrimStart('v').Split('.')[0])
if ($major -lt 20) {
  Stop-WithMessage "Node $nodeVersion is too old. Install Node 22 or newer from https://nodejs.org."
}
if ($major -lt 22) { Say "Node $nodeVersion works, but the project is tested with Node 22 or newer." }
else { Say "Node $nodeVersion found." }

# 2. Packages
$modules = Join-Path $portal 'node_modules'
$marker = Join-Path $modules '.package-lock.json'
$lock = Join-Path $portal 'package-lock.json'
$needInstall = (-not (Test-Path $modules)) -or (-not (Test-Path $marker)) -or ((Get-Item $lock).LastWriteTime -gt (Get-Item $marker).LastWriteTime)
if ($needInstall -and -not $SkipInstall) {
  Say 'Installing packages with "npm ci" (this can take a minute)...'
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'npm ci failed. Read the message above, fix it, and run this script again.' }
} else {
  Say 'Packages are already installed.'
}

# 3. .env
$envFile = Join-Path $portal '.env'
if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $portal '.env.example') $envFile
  Say 'Created .env from .env.example (built-in mock, no backend needed).'
}
$mockLine = Select-String -Path $envFile -Pattern '^\s*VITE_USE_MOCK\s*=\s*(\S+)' | Select-Object -First 1
if ($mockLine -and $mockLine.Matches[0].Groups[1].Value -eq 'false') {
  Say 'Your .env uses the REAL backend (VITE_USE_MOCK=false). Start Jehal''s mock or Daksh''s backend first, or set VITE_USE_MOCK=true.'
}

# 4. Dev server
$url = "http://localhost:$Port/"
Say "Starting the portal on $url ..."
$server = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--port', "$Port", '--strictPort') -WorkingDirectory $portal -NoNewWindow -PassThru

try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    if ($server.HasExited) { Stop-WithMessage ("The dev server stopped. Is port $Port already in use? Close the other window or use -Port 5175.") }
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $ready) { Stop-WithMessage 'The portal did not answer within 60 seconds.' }

  # 5. Browser
  Say "Portal is ready: $url   (Simulated prototype)"
  if (-not $NoBrowser) { Start-Process $url }
  Say 'Press Ctrl+C to stop.'
  Wait-Process -Id $server.Id
} finally {
  if ($server -and -not $server.HasExited) {
    # stop npm and the processes it started
    & taskkill.exe /PID $server.Id /T /F | Out-Null
  }
}
