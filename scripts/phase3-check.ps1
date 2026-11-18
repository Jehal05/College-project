# Phase 3 check: walks the new lab-value, organ, what-if and report-reading routes against the REAL backend. (Simulated prototype.)
#
#   1. Start the backend (see backend\README.md), for example:  DEMO_MODE=true  uvicorn app.main:app --port 8000
#   2. In another window:   .\scripts\phase3-check.ps1
#      or let  .\laptop-phase3-check.cmd  start the backend for you and write laptop-phase3-log.txt.
#
# It needs no packages. It logs in as patient@demo.test, saves two lab values, reads an organ with and without data,
# runs a what-if, and sends a small PDF it builds itself to /reports/extract. It deletes what it saved at the end.
# Every line says PASS, FAIL or SKIP. A FAIL is information, not an error in the script. SKIP means the step could not run
# for a reason that is not the backend's fault (for example the optional pypdf package is not installed).
# This script was written without being run on Windows: if it itself breaks, paste the message to Claude.
param(
  [string]$Base = 'http://localhost:8000'
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

# Returns @{ ok; code; body; error }. $body is JSON unless $raw (bytes) is given.
function Call($method, $path, $token, $body, $raw, $ctype) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = 'Bearer ' + $token }
  $a = @{ Uri = ($Base + $path); Method = $method; Headers = $headers; TimeoutSec = 20; UseBasicParsing = $true }
  if ($null -ne $raw) { $a['Body'] = $raw; $a['ContentType'] = $ctype }
  elseif ($null -ne $body) { $a['Body'] = (ConvertTo-Json $body -Depth 8); $a['ContentType'] = 'application/json' }
  try {
    $resp = Invoke-WebRequest @a
    $text = $resp.Content
    $parsed = $null
    if ($text) { try { $parsed = ConvertFrom-Json $text } catch { $parsed = $text } }
    return @{ ok = $true; code = [int]$resp.StatusCode; body = $parsed; error = '' }
  } catch {
    $code = 0
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
      try { $msg = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch { }
    }
    return @{ ok = $false; code = $code; body = $null; error = ('HTTP ' + $code + ' ' + $msg) }
  }
}

# A tiny one-page PDF whose text layer holds the given lines (ASCII only, so character count = byte count).
function New-TextPdf($lines) {
  $ops = New-Object System.Collections.ArrayList
  [void]$ops.Add('BT'); [void]$ops.Add('/F1 10 Tf'); [void]$ops.Add('12 TL'); [void]$ops.Add('40 800 Td')
  foreach ($l in $lines) { [void]$ops.Add('(' + ($l -replace '([\\()])', '\$1') + ') Tj T*') }
  [void]$ops.Add('ET')
  $stream = ($ops -join "`n")
  $objs = @(
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    ('<< /Length ' + $stream.Length + " >>`nstream`n" + $stream + "`nendstream"),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  )
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append("%PDF-1.4`n")
  $offsets = @()
  for ($i = 0; $i -lt $objs.Count; $i++) {
    $offsets += $sb.Length
    [void]$sb.Append(('{0} 0 obj' -f ($i + 1)) + "`n" + $objs[$i] + "`nendobj`n")
  }
  $xref = $sb.Length
  [void]$sb.Append("xref`n0 6`n0000000000 65535 f `n")
  foreach ($o in $offsets) { [void]$sb.Append(('{0:D10} 00000 n ' -f $o) + "`n") }
  [void]$sb.Append("trailer`n<< /Size 6 /Root 1 0 R >>`nstartxref`n$xref`n%%EOF`n")
  return [System.Text.Encoding]::ASCII.GetBytes($sb.ToString())
}

Write-Host "Phase 3 check against the real backend at $Base"
$h = Call 'GET' '/health' $null $null $null $null
if ($h.ok) { Record 'PASS' 'health' 'the server answers' } else { Record 'FAIL' 'health' ($h.error + '  (is the backend running?)') }

$token = $null; $pid2 = 'PT-2026-0417'; $saved = @()
if ($h.ok) {
  $r = Call 'POST' '/auth/login' $null @{ username = 'patient@demo.test'; password = 'demo1234' } $null $null
  if ($r.ok -and $r.body.token) {
    $token = $r.body.token
    if ($r.body.patient_id) { $pid2 = $r.body.patient_id }
    Record 'PASS' 'login patient' ('role ' + $r.body.role + ', patient ' + $pid2)
  } else { Record 'FAIL' 'login patient' $r.error }
}

if ($token) {
  # 1. an organ with no stored values
  $r = Call 'GET' "/patients/$pid2/organs/kidneys" $token $null $null $null
  if (-not $r.ok) { Record 'FAIL' 'organ kidneys before saving' $r.error }
  elseif ($r.body.has_data -eq $false -and @($r.body.items).Count -eq 0) { Record 'PASS' 'organ kidneys before saving' 'has_data false, no items (nothing made up)' }
  elseif ($r.body.has_data) { Record 'SKIP' 'organ kidneys before saving' 'kidney values were already stored (an earlier run or real use); not an error' }
  else { Record 'FAIL' 'organ kidneys before saving' 'has_data false but items present' }

  # 2. save two lab values
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $payload = @{ values = @(
      @{ test = 'creatinine'; value = 1.1; unit = 'mg/dL'; reference_range = @{ low = 0.6; high = 1.3 }; taken_on = $today },
      @{ test = 'egfr'; value = 82; unit = 'mL/min/1.73 m2'; taken_on = $today }
  ) }
  $r = Call 'POST' "/patients/$pid2/lab-values" $token $payload $null $null
  if ($r.ok -and $r.code -eq 201 -and @($r.body.values).Count -eq 2) {
    $saved = @($r.body.values | ForEach-Object { $_.id })
    Record 'PASS' 'save two lab values' ('201, ids ' + ($saved -join ', '))
  } else { Record 'FAIL' 'save two lab values' ('code ' + $r.code + ' ' + $r.error) }

  $r = Call 'GET' "/patients/$pid2/lab-values?test=creatinine" $token $null $null $null
  if ($r.ok -and @($r.body.values).Count -ge 1 -and $r.body.values[0].value -eq 1.1) { Record 'PASS' 'read lab values' 'the saved creatinine comes back, newest first' }
  else { Record 'FAIL' 'read lab values' $r.error }

  # 3. the same organ, now with data
  $r = Call 'GET' "/patients/$pid2/organs/kidneys" $token $null $null $null
  if ($r.ok -and $r.body.has_data -eq $true -and @($r.body.items).Count -ge 2) {
    Record 'PASS' 'organ kidneys after saving' ('items: ' + (($r.body.items | ForEach-Object { $_.key + '=' + $_.value + ' (' + $_.source + ')' }) -join ', '))
  } else { Record 'FAIL' 'organ kidneys after saving' ('code ' + $r.code + ' ' + $r.error) }

  $r = Call 'GET' "/patients/$pid2/organs/lungs" $token $null $null $null
  if ($r.ok -and $r.body.has_data -and $r.body.items[0].source -eq 'simulated' -and @($r.body.items[0].trend).Count -eq 0) { Record 'PASS' 'organ lungs' 'simulated vitals, no trend' }
  else { Record 'FAIL' 'organ lungs' ('code ' + $r.code + ' ' + $r.error) }

  # 4. what-if
  $inputs = @{ age = 58; sex = 1; resting_bp = 138; cholesterol = 240; fasting_blood_sugar = 0; max_heart_rate = 150; exercise_angina = 0; st_depression = 1.0 }
  $r = Call 'POST' '/predictions/heart' $token @{ inputs = $inputs; scenario = @{ resting_bp = 120; cholesterol = 200 } } $null $null
  if ($r.ok -and $null -ne $r.body.difference -and $r.body.notice -like 'Hypothetical*' -and @($r.body.changed_inputs).Count -eq 2) {
    Record 'PASS' 'what-if heart' ('risk ' + $r.body.current.risk + ' -> ' + $r.body.scenario.risk + ' (difference ' + $r.body.difference + ')')
  } else { Record 'FAIL' 'what-if heart' ('code ' + $r.code + ' ' + $r.error) }
  $r = Call 'POST' '/predictions/heart' $token @{ inputs = $inputs; scenario = @{ exercise = 3 } } $null $null
  if (-not $r.ok -and $r.code -eq 400 -and $r.error -like '*exercise*') { Record 'PASS' 'what-if refuses a non-input' '400 naming exercise' }
  else { Record 'FAIL' 'what-if refuses a non-input' ('code ' + $r.code + ' ' + $r.error) }

  # 5. report reading
  $pdf = New-TextPdf @('CITY LAB   Page 1 of 1', 'HbA1c   6.4 %   4.0 - 5.6', 'Glucose, Fasting   5.1 mmol/L   3.9 - 5.5', 'ALT (SGPT)   52 U/L   < 41', 'HDL Cholesterol   45 mg/dL')
  $r = Call 'POST' '/reports/extract' $token $null $pdf 'application/pdf'
  if ($r.ok -and $r.body.status -eq 'proposed' -and @($r.body.values).Count -ge 3) {
    Record 'PASS' 'extract from a text PDF' ('proposed: ' + (($r.body.values | ForEach-Object { $_.test + '=' + $_.value + ' ' + $_.unit + ' ' + $_.flag }) -join ', '))
  } elseif ($r.code -eq 503) {
    Record 'SKIP' 'extract from a text PDF' 'the server answered 503: the optional pypdf package is not installed (the expected state until the team agrees to add it)'
  } else { Record 'FAIL' 'extract from a text PDF' ('code ' + $r.code + ' ' + $r.error) }
  $r = Call 'GET' "/patients/$pid2/lab-values" $token $null $null $null
  $stillTwo = $r.ok -and (@($r.body.values | Where-Object { $_.test -in @('hba1c', 'fasting_glucose', 'alt') }).Count -eq 0)
  if ($stillTwo) { Record 'PASS' 'extract saved nothing' 'no HbA1c, glucose or ALT value was stored by the extract call' } else { Record 'FAIL' 'extract saved nothing' 'a value from the sample PDF was stored' }

  # 6. clean up what this script saved
  $gone = 0
  foreach ($id in $saved) { $d = Call 'DELETE' "/patients/$pid2/lab-values/$id" $token $null $null $null; if ($d.ok -and $d.code -eq 204) { $gone++ } }
  if ($saved.Count -gt 0 -and $gone -eq $saved.Count) { Record 'PASS' 'delete what was saved' "$gone deleted (204)" }
  elseif ($saved.Count -eq 0) { Record 'SKIP' 'delete what was saved' 'nothing was saved' }
  else { Record 'FAIL' 'delete what was saved' "$gone of $($saved.Count) deleted" }
}

$pass = @($results | Where-Object { $_ -like 'PASS*' }).Count
$skip = @($results | Where-Object { $_ -like 'SKIP*' }).Count
Write-Host ''
Write-Host ("RESULT: $pass PASS, $($script:fails) FAIL, $skip SKIP")
$log = Join-Path (Split-Path -Parent $PSScriptRoot) 'phase3-results.txt'
(@("Phase 3 check $(Get-Date -Format s) against $Base") + $results + @("RESULT: $pass PASS, $($script:fails) FAIL, $skip SKIP")) | Out-File $log -Encoding utf8
if ($script:fails -gt 0) { exit 1 } else { exit 0 }
