# Demo check (Phase 4): walks docs/DEMO_RUN_REAL_BACKEND.md as far as an API script can, against the REAL backend. (Simulated prototype.)
#
#   1. Start the backend (for example  .\laptop-restart-backend.cmd ).
#   2. Run:   .\scripts\demo-check.ps1          or     .\laptop-demo-check.cmd
#
# Needs no packages. It plays the patient (SOS), the hospital desk (acknowledge, dispatch, ambulance position, en route,
# arrived, handed over), listens on the WebSocket as the desk, and checks what the command view depends on: the alert's
# consents, the acknowledgement, the audit trail, and the patient's own history. Every line says PASS, FAIL or SKIP.
# A FAIL is information, not an error in the script. It cannot check what a person sees on screen (sound, layout, the
# button order, Hindi text): the "Look yourself" list at the end names those, and DEMO_RECORDING_CHECKLIST.md covers them.
# The emergency it creates is a normal simulated one and stays in the history. Results go to demo-check-results.txt.
# This script was written without being run on Windows: if it itself breaks, paste the message to Claude.
param(
  [string]$Base = 'http://localhost:8000',
  [string]$StaffLogin = 'staff@demo.test'
)

$ErrorActionPreference = 'Continue'
$results = New-Object System.Collections.ArrayList
$script:fails = 0

function Record($status, $name, $detail) {
  $line = ('{0,-5} {1} - {2}' -f $status, $name, $detail)
  [void]$results.Add($line)
  if ($status -eq 'FAIL') { $script:fails++ }
  $color = 'Gray'
  if ($status -eq 'PASS') { $color = 'Green' } elseif ($status -eq 'FAIL') { $color = 'Red' }
  Write-Host $line -ForegroundColor $color
}

function Call($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = 'Bearer ' + $token }
  $a = @{ Uri = ($Base + $path); Method = $method; Headers = $headers; TimeoutSec = 20; UseBasicParsing = $true }
  if ($null -ne $body) { $a['Body'] = (ConvertTo-Json $body -Depth 8); $a['ContentType'] = 'application/json' }
  try {
    $resp = Invoke-WebRequest @a
    $parsed = $null
    if ($resp.Content) { try { $parsed = ConvertFrom-Json $resp.Content } catch { $parsed = $resp.Content } }
    return @{ ok = $true; code = [int]$resp.StatusCode; body = $parsed; error = '' }
  } catch {
    $code = 0; $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
      try { $msg = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch { }
    }
    return @{ ok = $false; code = $code; body = $null; error = ('HTTP ' + $code + ' ' + $msg) }
  }
}

# Opens the WebSocket as the desk (token in the address, like the portal does). Returns the socket or $null.
function Open-Socket($token) {
  try {
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $uri = [Uri](($Base -replace '^http', 'ws') + '/ws?token=' + $token)
    $ws.ConnectAsync($uri, [Threading.CancellationToken]::None).Wait(5000) | Out-Null
    if ($ws.State -eq 'Open') { return $ws }
  } catch { }
  return $null
}
# Reads messages for up to $seconds and returns the text of those that contain $needle ('' if none).
function Listen($ws, $needle, $seconds) {
  $buf = New-Object byte[] 16384
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline -and $ws.State -eq 'Open') {
    $seg = New-Object System.ArraySegment[byte] -ArgumentList @(, $buf)
    $task = $ws.ReceiveAsync($seg, [Threading.CancellationToken]::None)
    if (-not $task.Wait(1500)) { continue }
    $text = [Text.Encoding]::UTF8.GetString($buf, 0, $task.Result.Count)
    if ($text -like "*$needle*") { return $text }
  }
  return ''
}

Write-Host "Demo check against the real backend at $Base"
$h = Call 'GET' '/health' $null $null
if ($h.ok) { Record 'PASS' 'health' 'the server answers' } else { Record 'FAIL' 'health' ($h.error + '  (is the backend running?)') }

$pt = $null; $st = $null; $id = $null; $amb = $null; $ws = $null
if ($h.ok) {
  $r = Call 'POST' '/auth/login' $null @{ username = 'patient@demo.test'; password = 'demo1234' }
  if ($r.ok -and $r.body.token) { $pt = $r.body; Record 'PASS' 'login patient' ('patient ' + $pt.patient_id) } else { Record 'FAIL' 'login patient' $r.error }
  $r = Call 'POST' '/auth/login' $null @{ username = $StaffLogin; password = 'demo1234' }
  if ($r.ok -and $r.body.token) { $st = $r.body; Record 'PASS' 'login staff' ('hospital ' + $st.hospital_id) } else { Record 'FAIL' 'login staff' $r.error }
}

if ($st) {
  $ws = Open-Socket $st.token
  if ($ws) { Record 'PASS' 'websocket opens for the desk' 'token in the address' } else { Record 'FAIL' 'websocket opens for the desk' 'could not connect to /ws' }
  $r = Call 'GET' '/ambulances' $st.token $null
  if ($r.ok) { $free = @($r.body) | Where-Object { $_.status -eq 'available' } | Select-Object -First 1; if ($free) { $amb = $free.id } }
  if ($amb) { Record 'PASS' 'an ambulance is available' $amb } else { Record 'FAIL' 'an ambulance is available' 'none is "available" (an earlier run may have left them dispatched; restart the backend)' }
}

if ($pt) {
  # demo steps 3 and 4: the patient sends an SOS (heart or chest) with location, consent as saved
  $r = Call 'POST' '/emergencies' $pt.token @{ patient_id = $pt.patient_id; type = 'HEART'; symptoms = @('CHEST_PAIN', 'SHORT_BREATH') }
  if ($r.ok -and $r.body.id) { $id = $r.body.id; Record 'PASS' 'patient creates the emergency' ($id + ' state ' + $r.body.state) } else { Record 'FAIL' 'patient creates the emergency' $r.error }
  if ($id) {
    $r = Call 'POST' ("/emergencies/$id/sos") $pt.token @{ location = @{ lat = 23.0225; lng = 72.5714; accuracy = 20; source = 'gps' } }
    if ($r.ok) { Record 'PASS' 'patient sends the SOS' ('state ' + $r.body.state) } else { Record 'FAIL' 'patient sends the SOS' $r.error }
  }
}

if ($st -and $id) {
  $tok = $st.token
  # demo step 5: the desk sees it at once, live
  if ($ws) {
    $msg = Listen $ws $id 8
    if ($msg) { Record 'PASS' 'desk hears the alert live' 'a WebSocket message named the emergency' } else { Record 'FAIL' 'desk hears the alert live' 'no WebSocket message within 8 s (the portal would show it only after a reload)' }
  }
  $r = Call 'GET' '/emergencies?status=active' $tok $null
  $mine = $null
  if ($r.ok) { foreach ($e in @($r.body)) { if ($e.id -eq $id -or $e.emergency_id -eq $id) { $mine = $e } } }
  if ($mine) { Record 'PASS' 'desk sees it in the active list' 'listed' } else { Record 'FAIL' 'desk sees it in the active list' ($r.error + ' (not listed; if the alert went to another hospital, set -StaffLogin to that desk)') }

  # what the command view needs from the alert
  $one = Call 'GET' "/emergencies/$id" $tok $null
  if ($one.ok) {
    $c = $one.body.consents
    if ($c -and $null -ne $c.location -and $null -ne $c.history -and $null -ne $c.vitals -and $null -ne $c.reports) { Record 'PASS' 'alert carries the four consents' 'location, history, vitals, reports' } else { Record 'FAIL' 'alert carries the four consents' 'the command view would show "Not stated"' }
    $ev = @($one.body.status_events)
    if ($ev.Count -gt 0 -and $ev[0].state) { Record 'PASS' 'alert has status events' ($ev.Count.ToString() + ' event(s)') } else { Record 'FAIL' 'alert has status events' 'none' }
  } else { Record 'FAIL' 'desk reads the alert' $one.error }

  # demo step 7: acknowledge, dispatch
  $r = Call 'POST' "/emergencies/$id/ack" $tok @{ hospital_id = $st.hospital_id }
  if ($r.ok) { Record 'PASS' 'desk acknowledges' ('state ' + $r.body.state) } else { Record 'FAIL' 'desk acknowledges' ($r.error + ' (the alert may have escalated to another hospital)') }
  $after = Call 'GET' "/emergencies/$id" $tok $null
  if ($after.ok) {
    $ackEv = @($after.body.status_events) | Where-Object { $_.state -eq 'HOSPITAL_ACKNOWLEDGED' } | Select-Object -First 1
    if ($ackEv -and $ackEv.actor) { Record 'PASS' 'acknowledgement names who' $ackEv.actor }
    elseif ($ackEv) { Record 'FAIL' 'acknowledgement names who' 'the event has a time but no actor: the command view says "Name not recorded" after a reload (DEMO_ISSUES_PHASE4.md item 3)' }
    else { Record 'FAIL' 'acknowledgement names who' 'no HOSPITAL_ACKNOWLEDGED event' }
  }
  if ($amb) {
    $r = Call 'POST' "/emergencies/$id/dispatch" $tok @{ hospital_id = $st.hospital_id; ambulance_id = $amb; eta_seconds = 300 }
    if ($r.ok) { Record 'PASS' 'desk dispatches the ambulance' ($amb + ' state ' + $r.body.state) } else { Record 'FAIL' 'desk dispatches the ambulance' $r.error }
    # demo step 8: the portal (not the backend) moves the ambulance; this posts one position the way the portal does
    $r = Call 'POST' "/ambulances/$amb/location" $tok @{ lat = 23.03; lng = 72.56; eta_seconds = 240; emergency_id = $id }
    if ($r.ok) { Record 'PASS' 'ambulance position accepted' 'the portal can post positions' } else { Record 'FAIL' 'ambulance position accepted' $r.error }
    if ($ws) {
      $msg = Listen $ws 'ambulance' 4
      if ($msg) { Record 'PASS' 'ambulance move heard live' 'WebSocket message' } else { Record 'SKIP' 'ambulance move heard live' 'no message in 4 s; the messages may have been read before this step' }
    }
  } else { Record 'SKIP' 'dispatch and ambulance position' 'no available ambulance' }

  # demo step 9
  foreach ($step in @('EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE')) {
    $r = Call 'POST' "/emergencies/$id/status" $tok @{ state = $step }
    if ($r.ok) { Record 'PASS' "status $step" 'accepted' } else { Record 'FAIL' "status $step" $r.error }
  }
  $fin = Call 'GET' "/emergencies/$id" $tok $null
  if ($fin.ok -and @($fin.body.status_events).Count -ge 5) { Record 'PASS' 'response history is complete' (@($fin.body.status_events | ForEach-Object { $_.state }) -join ' > ') } elseif ($fin.ok) { Record 'FAIL' 'response history is complete' ('only ' + @($fin.body.status_events).Count + ' events') }

  # demo step 10: every desk action is logged
  $au = Call 'GET' '/audit' $tok $null
  if ($au.ok) { Record 'PASS' 'audit log readable by the desk' 'answered' }
  elseif ($au.code -eq 403) { Record 'SKIP' 'audit log' 'staff may not read the audit log (an admin can); not an error' }
  else { Record 'FAIL' 'audit log' $au.error }
}

if ($pt -and $id) {
  # demo step 12: the patient sees the past alert
  $r = Call 'GET' ("/patients/" + $pt.patient_id + "/emergencies") $pt.token $null
  $found = $false
  if ($r.ok) { $list = if ($r.body.items) { $r.body.items } else { $r.body }; foreach ($e in @($list)) { if ($e.id -eq $id -or $e.emergency_id -eq $id) { $found = $true } } }
  if ($found) { Record 'PASS' 'patient sees the alert in past alerts' $id } else { Record 'FAIL' 'patient sees the alert in past alerts' ('not listed ' + $r.error) }
}

if ($ws) { try { $ws.Dispose() } catch { } }

Write-Host ''
Write-Host 'Look yourself (a script cannot see these):'
Write-Host '  - alert sound on a new alert; the red EMERGENCY card and NEW badge'
Write-Host '  - the command view strip: acknowledgement, "Not shared with this hospital: ...", ambulance marked Simulated'
Write-Host '  - Take over, Acknowledge, Dispatch buttons unlock one at a time; the ambulance moves on the map'
Write-Host '  - Hindi and Gujarati switch; the portal badge says Live (and "Reconnecting" if you stop the backend for 10 s)'
$pass = @($results | Where-Object { $_ -like 'PASS*' }).Count
$skip = @($results | Where-Object { $_ -like 'SKIP*' }).Count
Write-Host ("RESULT: $pass PASS, $($script:fails) FAIL, $skip SKIP")
$log = Join-Path (Split-Path -Parent $PSScriptRoot) 'demo-check-results.txt'
(@("Demo check $(Get-Date -Format s) against $Base") + $results + @("RESULT: $pass PASS, $($script:fails) FAIL, $skip SKIP")) | Out-File $log -Encoding utf8
if ($script:fails -gt 0) { exit 1 } else { exit 0 }
