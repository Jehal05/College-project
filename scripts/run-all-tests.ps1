# Runs every test part in a fixed order and writes one results file. (Simulated prototype.)
#
#   .\scripts\run-all-tests.ps1                 all parts
#   .\scripts\run-all-tests.ps1 -SkipBrowser    skip the parts that open a browser (patient-app browser tests, portal e2e)
#
# It installs NOTHING. If a prerequisite is missing it prints which one, marks the parts that need it SKIP, and goes on.
# Every part ends as PASS, FAIL or SKIP; the counts printed by each tool are copied into the results file as they are.
# The results file is  test-results.txt  in the repository root (versions, machine, one line per part, then the counts).
# This script was written without being run on Windows: if it itself breaks, paste the message to Claude.
param([switch]$SkipBrowser)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$out = Join-Path $root 'test-results.txt'
$lines = New-Object System.Collections.ArrayList
$summary = New-Object System.Collections.ArrayList
$script:fails = 0

function Log($s) { [void]$lines.Add($s); Write-Host $s }
function Have($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Ver($cmd, $arg) { if (Have $cmd) { try { return ((& $cmd $arg 2>&1) | Select-Object -First 1) } catch { return 'unknown' } } else { return 'NOT FOUND' } }

Log ('HealthTwin AI test run, ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Log ('Machine: ' + [System.Environment]::OSVersion.VersionString + ', ' + $env:PROCESSOR_IDENTIFIER + ', ' + $env:NUMBER_OF_PROCESSORS + ' logical CPUs')
$py = $null
foreach ($c in 'python', 'py') { if ((-not $py) -and (Have $c)) { $py = $c } }
Log ('python: ' + $(if ($py) { Ver $py '--version' } else { 'NOT FOUND' }))
Log ('node: ' + (Ver 'node' '--version') + '   npm: ' + (Ver 'npm' '--version'))
try { $git = (& git rev-parse --short HEAD 2>$null); Log ('git commit: ' + $git) } catch { Log 'git commit: unknown' }
Log ''

# Prerequisites that can be seen without installing anything.
$havePytestDeps = $false
if ($py) { & $py -c "import fastapi, sqlalchemy, httpx, bcrypt, pytest" 2>$null; $havePytestDeps = ($LASTEXITCODE -eq 0) }
if ($py -and -not $havePytestDeps) { Log 'Backend packages missing (fastapi, sqlalchemy, httpx, bcrypt or pytest). Install them yourself: pip install -r backend\requirements.txt' }
foreach ($d in 'patient-app', 'hospital-portal') {
  if (-not (Test-Path (Join-Path $root "$d\node_modules"))) { Log ("$d\node_modules is missing. Install it yourself: cd $d ; npm install") }
}
Log ''

# Runs one part. $dir is relative to the repo root. The tool's own last lines (its counts) are kept in the results file.
function Part($name, $dir, $ready, $reason, [scriptblock]$run, $countPattern) {
  Log ("=== $name")
  if (-not $ready) { Log "SKIP  $name - $reason"; [void]$summary.Add(('SKIP  ' + $name + ' - ' + $reason)); Log ''; return }
  Push-Location (Join-Path $root $dir)
  $start = Get-Date
  $text = & $run 2>&1 | Out-String
  $code = $LASTEXITCODE
  Pop-Location
  $secs = [int]((Get-Date) - $start).TotalSeconds
  $tail = ($text -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 8) -join "`n"
  $counts = ''
  if ($countPattern) { $counts = (($text -split "`r?`n") | Where-Object { $_ -match $countPattern }) -join ' | ' }
  Log $tail
  if ($code -eq 0) { $st = 'PASS' } else { $st = 'FAIL'; $script:fails++ }
  $line = ('{0,-5} {1} ({2} s) {3}' -f $st, $name, $secs, $counts)
  Log $line; [void]$summary.Add($line); Log ''
}

$ci = (Test-Path (Join-Path $root 'patient-app\node_modules')) -and (Have 'npm')
$ciP = (Test-Path (Join-Path $root 'hospital-portal\node_modules')) -and (Have 'npm')

Part 'backend: pytest' 'backend' ($py -and $havePytestDeps) 'python or backend packages missing' { & $py -m pytest -q } '(passed|failed|error)'
Part 'backend: phase_check (every route and test file accounted for)' 'backend' ($py -and $havePytestDeps) 'python or backend packages missing' { & $py scripts/phase_check.py } ''
Part 'patient-app: unit (vitest)' 'patient-app' $ci 'node_modules or npm missing' { npm run test:unit --silent } '(Tests|Test Files)'
Part 'patient-app: browser tests' 'patient-app' ($ci -and -not $SkipBrowser) 'node_modules or npm missing, or -SkipBrowser' { npm run test:browser --silent } ''
Part 'portal: unit (node --test)' 'hospital-portal' (Have 'npm') 'npm missing' { npm test --silent } '^# (tests|pass|fail|skipped)'
Part 'portal: lint' 'hospital-portal' $ciP 'node_modules or npm missing' { npm run lint --silent } ''
Part 'portal: build' 'hospital-portal' $ciP 'node_modules or npm missing' { npm run build --silent } ''
Part 'portal: e2e (playwright, mock mode)' 'hospital-portal' ($ciP -and -not $SkipBrowser) 'node_modules or npm missing, or -SkipBrowser' { npm run e2e --silent } '(passed|failed|flaky|skipped)'

Log '=== SUMMARY'
foreach ($s in $summary) { Log $s }
if ($script:fails -gt 0) { Log ("$script:fails part(s) FAILED. A failed part is information: paste test-results.txt to Claude.") } else { Log 'No part failed. SKIP lines were not run.' }
$lines | Set-Content -Path $out -Encoding UTF8
Write-Host ('Wrote ' + $out)
if ($script:fails -gt 0) { exit 1 } else { exit 0 }
