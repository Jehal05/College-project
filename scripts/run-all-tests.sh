#!/usr/bin/env bash
# Same parts as run-all-tests.ps1 for Linux/macOS. Installs nothing; a missing prerequisite marks parts SKIP.
# Usage: scripts/run-all-tests.sh [--skip-browser]      Writes test-results.txt in the repository root.
cd "$(dirname "$0")/.." || exit 2
OUT=test-results.txt
SKIP_BROWSER=0; [ "${1:-}" = "--skip-browser" ] && SKIP_BROWSER=1
FAILS=0; : > "$OUT"
log() { echo "$*" | tee -a "$OUT"; }
PY=$(command -v python3 || command -v python || true)
log "HealthTwin AI test run, $(date '+%Y-%m-%d %H:%M:%S')"
log "Machine: $(uname -sr), $(nproc 2>/dev/null || echo ?) logical CPUs"
log "python: ${PY:+$($PY --version 2>&1)}${PY:-NOT FOUND}"
log "node: $(node --version 2>/dev/null || echo 'NOT FOUND')   npm: $(npm --version 2>/dev/null || echo 'NOT FOUND')"
log "git commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
HAVE_PY=0; [ -n "$PY" ] && "$PY" -c "import fastapi, sqlalchemy, httpx, bcrypt, pytest" 2>/dev/null && HAVE_PY=1
[ -n "$PY" ] && [ $HAVE_PY = 0 ] && log "Backend packages missing. Install them yourself: pip install -r backend/requirements.txt"
HAVE_APP=0; [ -d patient-app/node_modules ] && command -v npm >/dev/null && HAVE_APP=1
HAVE_PORTAL=0; [ -d hospital-portal/node_modules ] && command -v npm >/dev/null && HAVE_PORTAL=1
SUMMARY=()
part() { # name dir ready(0/1) reason pattern command...
  local name=$1 dir=$2 ready=$3 reason=$4 pat=$5; shift 5
  log "=== $name"
  if [ "$ready" != 1 ]; then log "SKIP  $name - $reason"; SUMMARY+=("SKIP  $name - $reason"); return; fi
  local t0=$SECONDS text code
  text=$(cd "$dir" && "$@" 2>&1); code=$?
  log "$(echo "$text" | tail -8)"
  local counts=""; [ -n "$pat" ] && counts=$(echo "$text" | grep -E "$pat" | tr '\n' '|')
  local st=PASS; [ $code -ne 0 ] && { st=FAIL; FAILS=$((FAILS+1)); }
  SUMMARY+=("$st  $name ($((SECONDS-t0)) s) $counts"); log "${SUMMARY[-1]}"
}
part "backend: pytest" backend $HAVE_PY "python or backend packages missing" '(passed|failed|error)' "$PY" -m pytest -q
part "backend: phase_check" backend $HAVE_PY "python or backend packages missing" '' "$PY" scripts/phase_check.py
part "patient-app: unit (vitest)" patient-app $HAVE_APP "node_modules or npm missing" '(Tests|Test Files)' npm run test:unit --silent
part "patient-app: browser tests" patient-app $([ $HAVE_APP = 1 ] && [ $SKIP_BROWSER = 0 ] && echo 1 || echo 0) "node_modules missing or --skip-browser" '' npm run test:browser --silent
part "portal: unit (node --test)" hospital-portal $(command -v npm >/dev/null && echo 1 || echo 0) "npm missing" '^# (tests|pass|fail|skipped)' npm test --silent
part "portal: lint" hospital-portal $HAVE_PORTAL "node_modules or npm missing" '' npm run lint --silent
part "portal: build" hospital-portal $HAVE_PORTAL "node_modules or npm missing" '' npm run build --silent
part "portal: e2e (playwright, mock mode)" hospital-portal $([ $HAVE_PORTAL = 1 ] && [ $SKIP_BROWSER = 0 ] && echo 1 || echo 0) "node_modules missing or --skip-browser" '(passed|failed|flaky|skipped)' npm run e2e --silent
log "=== SUMMARY"; for s in "${SUMMARY[@]}"; do log "$s"; done
[ $FAILS -gt 0 ] && log "$FAILS part(s) FAILED." || log "No part failed. SKIP lines were not run."
echo "Wrote $OUT"; [ $FAILS -gt 0 ] && exit 1 || exit 0
