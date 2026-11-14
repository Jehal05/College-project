# Phase 1 check: walks the hospital desk story through the API and writes what happened. (Simulated prototype.)
#
#   1. In one PowerShell window:   .\scripts\start-all.ps1
#   2. In a SECOND window:         .\scripts\phase1-check.ps1
#
# It does NOT start or stop anything and changes no files except phase1-results.txt (next to the repo root).
# It talks to the mock server by default. To try Daksh's real backend (started separately on port 8000):
#   .\scripts\phase1-check.ps1 -Backend real
# Every line says PASS, FAIL or SKIP with what the server answered. A FAIL is information, not an error in the script.
# This script was written without being run on Windows: if it itself breaks, paste the message to Claude.
param(
  [ValidateSet('mock', 'real')][string]$Backend = 'mock'
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$base = if ($Backend -eq 'real') { 'http://localhost:8000' } else { 'http://localhost:4000' }
$results = New-Object System.Collections.ArrayList
$state = @{ staff = $null; patient = $null; emergency = $null; ambulance = $null }

function Record($status, $name, $detail) {
  $line = ('{0,-5} {1} - {2}' -f $status, $name, $detail)
  [void]$results.Add($line)
  $color = 'Gray'
  if ($status -eq 'PASS') { $color = 'Green' } elseif ($status -eq 'FAIL') { $color = 'Red' }
  Write-Host $line -ForegroundColor $color
}

# Returns @{ ok; code; body; error }
function Call($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = 'Bearer ' + $token }
  $args2 = @{ Uri = ($base + $path); Method = $method; Headers = $headers; TimeoutSec = 15; UseBasicParsing = $true }
  if ($null -ne $body) { $args2['Body'] = (ConvertTo-Json $body -Depth 6); $args2['ContentType'] = 'application/json' }
  try {
    $text = (Invoke-WebRequest @args2).Content
    $parsed = $null
    if ($text) { try { $parsed = ConvertFrom-Json $text } catch { $parsed = $text } }
    return @{ ok = $true; code = 200; body = $parsed; error = '' }
  } catch {
    $code = 0
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $msg = $reader.ReadToEnd()
      } catch { }
    }
    return @{ ok = $false; code = $code; body = $null; error = ('HTTP ' + $code + ' ' + $msg) }
  }
}

function Login($who, $login, $password) {
  $field = if ($Backend -eq 'real') { 'username' } else { 'email' }
  $payload = @{ password = $password }
  $payload[$field] = $login
  $r = Call 'POST' '/auth/login' $null $payload
  if ($r.ok -and $r.body.token) { Record 'PASS' "login $who" ("role " + $r.body.role); return $r.body }
  Record 'FAIL' "login $who" $r.error
  return $null
}

Write-Host "Phase 1 check against the $Backend backend at $base"
$h = Call 'GET' '/health' $null $null
if ($h.ok) { Record 'PASS' 'health' 'the server answers' } else { Record 'FAIL' 'health' ($h.error + '  (is start-all.ps1 running?)'); }

if ($h.ok) {
  $state.staff = Login 'staff' 'staff@demo.test' 'demo1234'
  $state.patient = Login 'patient' 'patient@demo.test' 'demo1234'
}

if ($state.staff) {
  $r = Call 'GET' '/hospitals' $state.staff.token $null
  if ($r.ok -and @($r.body).Count -gt 0) { Record 'PASS' 'hospitals list' ((@($r.body).Count).ToString() + ' hospitals') } else { Record 'FAIL' 'hospitals list' $r.error }
  $r = Call 'GET' '/ambulances' $state.staff.token $null
  if ($r.ok -and @($r.body).Count -gt 0) {
    Record 'PASS' 'ambulances list' ((@($r.body).Count).ToString() + ' ambulances')
    $free = @($r.body) | Where-Object { $_.status -eq 'available' } | Select-Object -First 1
    if ($free) { $state.ambulance = $free.id }
  } else { Record 'FAIL' 'ambulances list' $r.error }
} else { Record 'SKIP' 'hospitals and ambulances' 'no staff login' }

if ($state.patient) {
  $patientId = $state.patient.patient_id
  $r = Call 'POST' '/emergencies' $state.patient.token @{ patient_id = $patientId; type = 'HEART'; symptoms = @('CHEST_PAIN', 'SHORT_BREATH') }
  if ($r.ok -and $r.body.id) { $state.emergency = $r.body.id; Record 'PASS' 'patient creates an emergency' ($r.body.id + ' state ' + $r.body.state) } else { Record 'FAIL' 'patient creates an emergency' $r.error }
  if ($state.emergency) {
    $r = Call 'POST' ('/emergencies/' + $state.emergency + '/sos') $state.patient.token @{}
    if ($r.ok) { Record 'PASS' 'patient sends the SOS' ('state ' + $r.body.state) } else { Record 'FAIL' 'patient sends the SOS' $r.error }
  }
} else { Record 'SKIP' 'patient emergency' 'no patient login' }

if ($state.staff -and $state.emergency) {
  $tok = $state.staff.token
  $id = $state.emergency
  $r = Call 'GET' '/emergencies?status=active' $tok $null
  $seen = $false
  if ($r.ok) { foreach ($e in @($r.body)) { if ($e.id -eq $id -or $e.emergency_id -eq $id) { $seen = $true } } }
  if ($seen) { Record 'PASS' 'desk sees it in the active list' $id } else { Record 'FAIL' 'desk sees it in the active list' ($r.error + ' (not in the list)') }

  $r = Call 'POST' ("/emergencies/$id/ack") $tok @{ hospital_id = $state.staff.hospital_id }
  if ($r.ok) { Record 'PASS' 'desk acknowledges' ('state ' + $r.body.state) } else { Record 'FAIL' 'desk acknowledges' $r.error }

  if ($state.ambulance) {
    $r = Call 'POST' ("/emergencies/$id/dispatch") $tok @{ hospital_id = $state.staff.hospital_id; ambulance_id = $state.ambulance }
    if ($r.ok) { Record 'PASS' 'desk dispatches an ambulance' ($state.ambulance + ' state ' + $r.body.state) } else { Record 'FAIL' 'desk dispatches an ambulance' $r.error }
  } else { Record 'SKIP' 'dispatch' 'no available ambulance found' }

  foreach ($step in @('EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE')) {
    $r = Call 'POST' ("/emergencies/$id/status") $tok @{ state = $step }
    if ($r.ok) { Record 'PASS' "status $step" 'accepted' } else { Record 'FAIL' "status $step" $r.error }
  }

  $r = Call 'GET' '/emergencies?status=finished' $tok $null
  $done = $false
  if ($r.ok) { foreach ($e in @($r.body)) { if ($e.id -eq $id -or $e.emergency_id -eq $id) { $done = $true } } }
  if ($done) { Record 'PASS' 'it is in the finished list' $id } else { Record 'FAIL' 'it is in the finished list' ($r.error + ' (not in the list)') }
} else { Record 'SKIP' 'desk steps' 'no staff login or no emergency' }

$pass = @($results | Where-Object { $_ -like 'PASS*' }).Count
$fail = @($results | Where-Object { $_ -like 'FAIL*' }).Count
$skip = @($results | Where-Object { $_ -like 'SKIP*' }).Count
$summary = "Summary: $pass PASS, $fail FAIL, $skip SKIP against the $Backend backend. " + (Get-Date -Format 'yyyy-MM-dd HH:mm')
Write-Host $summary
$out = Join-Path $root 'phase1-results.txt'
$lines = @("Phase 1 check ($Backend backend, $base)") + @($results) + @($summary) + @('', 'This checks the API only. It does not look at the screens: the portal and patient app still need a human (or Claude on screen).')
Set-Content -Path $out -Value $lines -Encoding UTF8
Write-Host "Written to $out"
