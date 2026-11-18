# Trains and verifies the two risk models on the laptop, then writes laptop-ml-log.txt.
# Usage (PowerShell, in the repo folder), with YOUR data files that stay OUTSIDE the repository:
#   .\laptop-ml-train.cmd -HeartCsv C:\data\heart.csv -DiabetesCsv C:\data\diabetes.csv
# Optional: -HeartName, -HeartSource, -HeartLicence, -HeartRename "chol=cholesterol,..." and the same for Diabetes.
# Add -Synthetic to run on the practice data in backend\tests\fixtures (a dry run: nothing real is claimed).
param(
  [string]$HeartCsv, [string]$DiabetesCsv,
  [string]$HeartName = 'TO FILL', [string]$HeartSource = 'TO FILL', [string]$HeartLicence = 'TO FILL', [string]$HeartRename = '',
  [string]$DiabetesName = 'TO FILL', [string]$DiabetesSource = 'TO FILL', [string]$DiabetesLicence = 'TO FILL', [string]$DiabetesRename = '',
  [switch]$Synthetic
)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$be = Join-Path $root 'backend'
$log = Join-Path $root 'laptop-ml-log.txt'
"laptop-ml-train started $(Get-Date -Format s)" | Out-File $log -Encoding utf8
$vpy = Join-Path $be '.venv\Scripts\python.exe'
if (-not (Test-Path $vpy)) { "GIVING UP: no backend\.venv (run laptop-backend.cmd once)" | Add-Content $log; exit 1 }
Set-Location $be
"--- branch: $(git rev-parse --abbrev-ref HEAD)  commit: $(git rev-parse --short HEAD)" | Add-Content $log
if ($Synthetic) {
  $HeartCsv = Join-Path $be 'tests\fixtures\ml_synthetic_heart.csv'; $DiabetesCsv = Join-Path $be 'tests\fixtures\ml_synthetic_diabetes.csv'
  $HeartName = $DiabetesName = 'SYNTHETIC practice data (ml.make_synthetic)'; $HeartSource = $DiabetesSource = 'generated in this repository'; $HeartLicence = $DiabetesLicence = 'none (invented numbers)'
}
if (-not $HeartCsv -or -not $DiabetesCsv) { "GIVING UP: pass -HeartCsv and -DiabetesCsv (or -Synthetic for a dry run)" | Add-Content $log; exit 1 }
foreach ($f in @($HeartCsv, $DiabetesCsv)) { if (-not (Test-Path $f)) { "GIVING UP: file not found: $f" | Add-Content $log; exit 1 } }
$bad = $false
"--- installing training libraries (requirements-ml.txt)" | Add-Content $log
(& $vpy -m pip install -r requirements-ml.txt 2>&1 | Select-Object -Last 4 | Out-String) | Add-Content $log
if ($LASTEXITCODE -ne 0) { "GIVING UP: pip install failed" | Add-Content $log; exit 1 }
$jobs = @(
  @{ c = 'heart';    csv = $HeartCsv;    n = $HeartName;    s = $HeartSource;    l = $HeartLicence;    r = $HeartRename },
  @{ c = 'diabetes'; csv = $DiabetesCsv; n = $DiabetesName; s = $DiabetesSource; l = $DiabetesLicence; r = $DiabetesRename }
)
foreach ($j in $jobs) {
  $extra = @()
  if ($j.r) { $extra += @('--rename', $j.r) }
  if ($Synthetic) { $extra += '--synthetic' }
  "=== TRAIN $($j.c)" | Add-Content $log
  $out = & $vpy -m ml.train $j.c --data $j.csv --dataset-name $j.n --source $j.s --licence $j.l @extra 2>&1
  ($out | Out-String) | Add-Content $log
  "train exit code: $LASTEXITCODE" | Add-Content $log
  if ($LASTEXITCODE -ne 0) { $bad = $true; continue }
  "=== VERIFY $($j.c)" | Add-Content $log
  $vextra = @()
  if ($j.r) { $vextra += @('--rename', $j.r) }
  $out = & $vpy -m ml.verify $j.c --data $j.csv @vextra 2>&1
  ($out | Out-String) | Add-Content $log
  "verify exit code: $LASTEXITCODE" | Add-Content $log
  if ($LASTEXITCODE -ne 0) { $bad = $true }
}
if ($bad) { "RESULT: PROBLEM (see above)" | Add-Content $log } else { "RESULT: both models trained and verified (MATCH)" | Add-Content $log }
"DONE $(Get-Date -Format s)" | Add-Content $log
