r"""Runs the tests phase by phase and checks which features really exist in the code.

Run from the backend folder:
    python scripts/phase_check.py
(Windows PowerShell: use the venv python, e.g.  .\.venv\Scripts\python scripts\phase_check.py)

Nothing here is a claim: every "built" below is checked against the real code
(an endpoint in the app's API schema, a file, or a code pattern), and every test
count comes from running pytest.
"""
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DEMO_MODE", "true")

from app.main import app  # noqa: E402
from tests.contract_tools import app_endpoints  # noqa: E402

BUILT, PARTIAL, NOT_BUILT = "built", "partial", "NOT BUILT"
_APP_FILES = list((ROOT / "app").rglob("*.py"))
_ENDPOINTS = app_endpoints(app)


def has_regex(pattern: str) -> bool:
    return any(re.search(pattern, p.read_text(encoding="utf-8")) for p in _APP_FILES)


def has_file(relative: str) -> bool:
    return (ROOT / relative).exists()


def has_endpoint(method: str, path: str) -> bool:
    return (method, path) in _ENDPOINTS


def status(done: bool, note: str = "", partial: bool = False) -> Tuple[str, str]:
    return (BUILT if done else PARTIAL if partial else NOT_BUILT), note


# Daksh's 20 features from the plan: number -> (name, tier, status function)
FEATURES: Dict[int, Tuple[str, str, Callable[[], Tuple[str, str]]]] = {
    2: ("Live vitals service", "T1", lambda: status(
        has_endpoint("GET", "/patients/{}/vitals") and has_regex(r'(publish|queue)\([^)]*"vitals\.update"'),
        "GET /patients/{id}/vitals exists, and the /ws socket exists, but nothing sends vitals.update once a second yet",
        partial=has_endpoint("GET", "/patients/{}/vitals"))),
    4: ("Rule-based emergency engine", "T1", lambda: status(has_file("app/rules/engine.py"))),
    8: ("Real-time hospital notification", "T1", lambda: status(has_regex(r"\.websocket\(|WebSocketDisconnect"), "no WebSocket manager")),
    11: ("Emergency passport", "T1", lambda: status(has_endpoint("GET", "/passport/{}"), "works with a token; staff and patient access wait for login")),
    12: ("QR code", "T1", lambda: status(has_regex(r"import qrcode|from qrcode"), "token exists, no QR image yet")),
    13: ("Wearable simulator", "T2", lambda: status(has_file("app/sim/wearable.py") and has_endpoint("POST", "/demo/vitals"))),
    14: ("Anomaly detection", "T2", lambda: status(has_regex(r"IsolationForest"))),
    17: ("Family notification", "T2", lambda: status(has_regex(r"notification_log|notification_jobs"))),
    20: ("Severity levels", "T1", lambda: status(has_regex(r"SEVERITY_ACTIONS"))),
    29: ("SMS fallback", "T2", lambda: status(has_regex(r"SIMULATED:"))),
    33: ("Login and role-based access", "T1", lambda: status(has_endpoint("POST", "/auth/login"), "POST /auth/login is missing")),
    50: ("Audit log", "T2", lambda: status(has_file("app/models/audit.py") and has_endpoint("GET", "/audit"))),
    51: ("Consent ledger and encryption", "T2", lambda: status(has_file("app/models/consent.py") and has_file("app/security/crypto.py"))),
    52: ("Notification fallback engine", "T2", lambda: status(has_regex(r"dead_letter|notification_jobs"))),
    53: ("Seven-day trend warning", "T3", lambda: status(has_file("app/services/trend.py"))),
    54: ("Sleep, activity and stress insights", "T3", lambda: status(has_endpoint("GET", "/patients/{}/insights"), "family access waits for feature 61")),
    55: ("FHIR passport export", "T3", lambda: status(has_regex(r'"Bundle"'))),
    56: ("Admin system-health panel", "T3", lambda: status(has_endpoint("GET", "/metrics"))),
    57: ("Demo control panel", "T1", lambda: status(
        has_endpoint("POST", "/demo/scenario") and has_endpoint("POST", "/demo/reset"), "the scenario launcher or the reset is missing",
        partial=has_endpoint("POST", "/demo/vitals"))),
    60: ("Mock 112/108 gateway", "T2", lambda: status(has_regex(r"MockGateway|EmergencyGateway"))),
}


@dataclass
class Phase:
    name: str
    goal: str
    tests: List[str]
    features: List[int] = field(default_factory=list)
    checks: List[Tuple[str, Callable[[], bool]]] = field(default_factory=list)


def _tables() -> tuple:
    """(contract tables that exist in the code, contract tables in CONTRACT.md)"""
    from app.db import Base
    from app.models import accounts, audit, consent, emergencies, hospitals, patient_data  # noqa: F401
    from tests.contract_tools import contract_tables
    wanted = contract_tables()
    return len(wanted & set(Base.metadata.tables)), len(wanted)


PHASES = [
    Phase("Phase 1: Foundation", "contract, repo, models, login",
          ["tests/test_startup_key.py", "tests/test_states_roles.py", "tests/test_models_foundation.py", "tests/test_ids.py",
           "tests/test_passwords.py", "tests/test_seed.py", "tests/test_cors.py", "tests/test_startup_seed.py",
           "tests/test_access_tokens.py", "tests/test_login_limiter.py", "tests/test_login_api.py", "tests/test_error_shape.py",
           "tests/test_role_dependencies.py", "tests/test_patient_record_service.py", "tests/test_patients_api.py",
           "tests/test_contacts_api.py"], [33], [
        ("CONTRACT.md present", lambda: has_file("CONTRACT.md")),
        (f"database tables from the contract: {_tables()[0]} of {_tables()[1]}", lambda: _tables()[0] == _tables()[1]),
        ("states, roles and the transition table (app/models/enums.py)", lambda: has_regex(r"ALLOWED_TRANSITIONS")),
        ("demo seed data, loaded only in demo mode", lambda: has_file("app/seed/demo_data.py")),
        ("CORS allow-list from the environment", lambda: has_regex(r"parse_cors_origins")),
        ("login with rate limit and one error shape", lambda: has_file("app/security/login_limiter.py") and has_file("app/errors.py")),
        ("Docker files and .env.example present", lambda: all(has_file(f) for f in ("Dockerfile", "docker-compose.yml", ".env.example"))),
    ]),
    Phase("Phase 2: Safety core and Tier 1", "rules, vitals, alerts, passport, demo panel",
          ["app/rules/tests/test_engine.py", "app/rules/tests/test_draft_symptom_rules.py", "tests/test_passport_token.py",
           "tests/test_emergency_state.py", "tests/test_emergencies_api.py", "tests/test_hospitals_api.py",
           "tests/test_hospital_desk_api.py", "tests/test_ws_api.py", "tests/test_escalation.py",
           "tests/test_desk_api.py", "tests/test_heart_attack_flow.py",
           "tests/test_demo_panel_api.py",
           "tests/test_patient_extras_api.py", "tests/test_passport_links_api.py",
           "tests/test_other_apps_api.py", "tests/test_location_shares_api.py", "tests/test_access_log_api.py"], [4, 20, 8, 2, 11, 12, 57]),
    Phase("Phase 3: Simulators and notifications", "wearable, gateway, family, SMS",
          ["tests/test_wearable.py", "tests/test_demo_vitals_api.py"], [13, 60, 17, 29], [
        ("escalation scheduler", lambda: has_regex(r"escalat\w*_?scheduler|def .*escalat")),
    ]),
    Phase("Phase 4: Trust, ML and resilience", "consent, audit, fallback, anomaly",
          ["tests/test_crypto.py", "tests/test_encrypted_columns.py", "tests/test_consent_ledger.py",
           "tests/test_consent_api.py", "tests/test_audit_log.py", "tests/test_audit_api.py",
           "tests/test_passport_audit.py"], [51, 50, 52, 14], [
        ("load and failure report (docs/failure-test-report.md)", lambda: has_file("docs/failure-test-report.md")),
    ]),
    Phase("Phase 5: Extras and polish", "insights, trend, FHIR, health panel",
          ["tests/test_history.py", "tests/test_wording.py", "tests/test_insights.py", "tests/test_insights_api.py"],
          [54, 53, 55, 56], [
        ("docs/phase5-report.md", lambda: has_file("docs/phase5-report.md")),
        ("README.md", lambda: has_file("README.md")),
    ]),
    Phase("Phase 6: Freeze and rehearsals", "hygiene, security, reset, rehearsals",
          ["tests/test_contract_conformance.py", "tests/test_simulated_labels.py", "tests/test_phase_check.py"], [], [
        ("FREEZE.md, CHANGELOG.md, mocks register", lambda: all(has_file(f) for f in ("FREEZE.md", "CHANGELOG.md", "docs/mocks-and-simulations.md"))),
        ("pinned dependencies (requirements.lock.txt)", lambda: has_file("requirements.lock.txt")),
        ("scripts/scan_secrets.py", lambda: has_file("scripts/scan_secrets.py")),
        ("scripts/reset_demo.py and preflight.py", lambda: has_file("scripts/reset_demo.py") and has_file("scripts/preflight.py")),
        ("scripts/rehearse.py", lambda: has_file("scripts/rehearse.py")),
        ("docs/demo-runbook.md, security-check.md, rehearsal-log.md", lambda: all(has_file(f"docs/{n}") for n in ("demo-runbook.md", "security-check.md", "rehearsal-log.md"))),
        ("docs/jury-honesty-sheet.md and final-report.md", lambda: has_file("docs/jury-honesty-sheet.md") and has_file("docs/final-report.md")),
    ]),
]


def all_test_files() -> List[str]:
    files = sorted(str(p.relative_to(ROOT)).replace("\\", "/") for p in list((ROOT / "tests").glob("test_*.py")) + list((ROOT / "app" / "rules" / "tests").glob("test_*.py")))
    return files


def run_tests(paths: List[str]) -> Tuple[int, int, float]:
    start = time.time()
    result = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", *paths],
                            cwd=ROOT, capture_output=True, text=True)
    text = result.stdout + result.stderr
    passed = int(m.group(1)) if (m := re.search(r"(\d+) passed", text)) else 0
    failed = int(m.group(1)) if (m := re.search(r"(\d+) failed", text)) else 0
    errors = int(m.group(1)) if (m := re.search(r"(\d+) error", text)) else 0
    return passed, failed + errors, time.time() - start


def main() -> int:
    total_passed = total_failed = 0
    print(f"{'Phase':<44}{'tests':>7}{'failed':>8}{'time':>8}   features (built / partial / not built)")
    print("-" * 104)
    details = []
    for phase in PHASES:
        passed, failed, seconds = run_tests(phase.tests)
        total_passed, total_failed = total_passed + passed, total_failed + failed
        results = {n: FEATURES[n][2]() for n in phase.features}
        counts = [sum(1 for s, _ in results.values() if s == kind) for kind in (BUILT, PARTIAL, NOT_BUILT)]
        feature_text = f"{counts[0]} / {counts[1]} / {counts[2]}" if phase.features else "no features (checks below)"
        print(f"{phase.name:<44}{passed:>7}{failed:>8}{seconds:>7.1f}s   {feature_text}")
        details.append((phase, results))
    print("-" * 104)
    print(f"{'ALL PHASES':<44}{total_passed:>7}{total_failed:>8}")

    unassigned = set(all_test_files()) - {f for p in PHASES for f in p.tests}
    if unassigned:
        print("\nWARNING: test files not assigned to any phase:", ", ".join(sorted(unassigned)))

    for phase, results in details:
        print(f"\n{phase.name}  ({phase.goal})")
        for number in phase.features:
            name, tier, _ = FEATURES[number]
            state, note = results[number]
            mark = {"built": "[x]", "partial": "[~]", "NOT BUILT": "[ ]"}[state]
            print(f"  {mark} {number:>2} {name:<38} {tier}  {state}" + (f"  ({note})" if note and state != BUILT else ""))
        for label, check in phase.checks:
            print(f"  {'[x]' if check() else '[ ]'} {label}")

    built = sum(1 for n in FEATURES if FEATURES[n][2]()[0] == BUILT)
    partial = sum(1 for n in FEATURES if FEATURES[n][2]()[0] == PARTIAL)
    tier1 = [n for n in FEATURES if FEATURES[n][1] == "T1"]
    tier1_built = sum(1 for n in tier1 if FEATURES[n][2]()[0] == BUILT)
    print(f"\nDaksh's 20 features: {built} built, {partial} partial, {20 - built - partial} not built")
    print(f"Tier 1 (the demo cannot run without them): {tier1_built} of {len(tier1)} built")
    print("\nTESTS: ALL PASS" if total_failed == 0 else f"\nTESTS: {total_failed} FAILED")
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
