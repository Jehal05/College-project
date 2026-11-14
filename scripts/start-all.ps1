# Start the whole HealthTwin AI demo on Jehal's mock server (Simulated prototype).
#
#   .\scripts\start-all.ps1            (from the repo root, in PowerShell)
#
# What it starts, each in its own hidden background process, all stopped when you press Ctrl+C:
#   1. Jehal's mock server on port 4000   (HOSPITAL_MODE=manual, DEMO_SPEED=5)
#   2. The hospital portal on port 5174    (VITE_USE_MOCK=false, pointing at the mock)
#   3. The patient app on port 5173
# It checks Node, installs packages when missing, checks that the three ports are FREE before it starts,
# and then checks that each one answers. It has not been run on Windows by Claude: report what you see.
#
# Options: -DemoSpeed 5   -AlertAt sos|detected   -NoBrowser   -SkipInstall
param(
  [int]$DemoSpeed = 5,
  [ValidateSet('sos', 'detected')][string]$AlertAt = 'sos',
  [switch]$NoBrowser,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$portal = Join-Path $root 'hospital-portal'
Set-Location $root

function Say($text) { Write-Host "[start-all] $text" }
function Fail($text) { Write-Host "[start-all] $text" -ForegroundColor Red; exit 1 }

# 1. Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js was not found. Install Node 22 or newer from https://nodejs.org and open a new PowerShell window.' }
$nodeVersion = (& node --version).Trim()
Say "Node $nodeVersion found."

# 2. The three ports must be free (a mock left running from before is the usual problem)
$ports = @{ 4000 = "Jehal's mock server"; 5174 = 'the hospital portal'; 5173 = 'the patient app' }
foreach ($p in $ports.Keys) {
  $busy = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($busy) {
    $proc = Get-Process -Id $busy.OwningProcess -ErrorAction SilentlyContinue
    Fail ("Port $p ($($ports[$p])) is already in use by process $($busy.OwningProcess) ($($proc.ProcessName)). " +
      "Close that window or run:  Stop-Process -Id $($busy.OwningProcess)   then start this script again.")
  }
}
Say 'Ports 4000, 5173 and 5174 are free.'

# 3. Packages
if (-not $SkipInstall) {
  if (-not (Test-Path (Join-Path $root 'node_modules'))) { Say 'Installing the patient app and the mock (npm ci)...'; & npm.cmd ci; if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed in the repo root.' } }
  if (-not (Test-Path (Join-Path $portal 'node_modules'))) { Say 'Installing the portal (npm ci)...'; Push-Location $portal; & npm.cmd ci; $code = $LASTEXITCODE; Pop-Location; if ($code -ne 0) { Fail 'npm ci failed in hospital-portal.' } }
}

# 4. Point the portal at the mock. The values go in the process environment of the portal only; .env is not touched.
$jobs = @()
function Start-Part($name, $dir, $envVars, $cmdArgs) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'npm.cmd'
  $psi.Arguments = $cmdArgs
  $psi.WorkingDirectory = $dir
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  foreach ($k in $envVars.Keys) { $psi.EnvironmentVariables[$k] = $envVars[$k] }
  $proc = [System.Diagnostics.Process]::Start($psi)
  Say "Started $name (process $($proc.Id))."
  return $proc
}
function Wait-Url($url, $label, $seconds) {
  for ($i = 0; $i -lt $seconds; $i++) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null; Say "$label answers at $url"; return $true } catch { Start-Sleep -Seconds 1 }
  }
  return $false
}

try {
  $mock = Start-Part "Jehal's mock" $root @{ HOSPITAL_MODE = 'manual'; DEMO_SPEED = "$DemoSpeed"; ALERT_AT = $AlertAt; CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174' } 'run mock'
  $jobs += $mock
  if (-not (Wait-Url 'http://localhost:4000/health' "Jehal's mock" 40)) { Fail 'The mock did not answer within 40 seconds.' }

  $web = Start-Part 'the hospital portal' $portal @{ VITE_USE_MOCK = 'false'; VITE_API_BASE_URL = 'http://localhost:4000'; VITE_WS_URL = 'ws://localhost:4000/ws'; VITE_PORTAL_SIMULATES_AMBULANCE = 'false' } 'run dev -- --port 5174 --strictPort'
  $jobs += $web
  $app = Start-Part 'the patient app' $root @{} 'run dev'
  $jobs += $app

  $okPortal = Wait-Url 'http://localhost:5174/' 'The portal' 60
  $okApp = Wait-Url 'http://localhost:5173/' 'The patient app' 60
  if (-not ($okPortal -and $okApp)) { Fail 'The portal or the patient app did not answer within 60 seconds.' }

  Write-Host ''
  Say 'Everything is running (Simulated prototype). Addresses and logins:'
  Write-Host '  Hospital portal  http://localhost:5174   staff@demo.test / demo1234   (or admin@demo.test / demo1234)'
  Write-Host '  Patient app      http://localhost:5173   patient@demo.test / demo1234'
  Write-Host "  Mock server      http://localhost:4000   (HOSPITAL_MODE=manual, DEMO_SPEED=$DemoSpeed, ALERT_AT=$AlertAt)"
  Write-Host ''
  Say 'The backend by Daksh is NOT used: the mock stands in for it. See docs/PROJECT_STATUS.md.'
  if (-not $NoBrowser) { Start-Process 'http://localhost:5174/'; Start-Process 'http://localhost:5173/' }
  Say 'Press Ctrl+C to stop everything.'
  while ($true) {
    foreach ($j in $jobs) { if ($j.HasExited) { Fail "One part stopped by itself (process $($j.Id)). Run the script again." } }
    Start-Sleep -Seconds 2
  }
} finally {
  foreach ($j in $jobs) { if ($j -and -not $j.HasExited) { & taskkill.exe /PID $j.Id /T /F | Out-Null } }
  Say 'Stopped.'
}
