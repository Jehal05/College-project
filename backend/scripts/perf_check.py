"""Small performance check against a RUNNING backend. Standard library only (no installs).

    python backend/scripts/perf_check.py --base http://localhost:8000 --runs 20 --out perf-result.json

It logs in as the demo patient and demo staff, then times N requests for each of six calls:
login, GET vitals, POST emergency, GET emergency list (staff), POST /predictions/heart, GET organ.
Prints p50 / p95 / max in milliseconds and a description of the machine it ran on.

THIS IS A SINGLE-USER LOCAL CHECK, NOT A LOAD TEST. One client, one request at a time, one machine, a demo database.
The numbers say "nothing is accidentally slow", not "it will hold N users".

Notes: POST /emergencies is rate limited by the backend (EMERGENCY_MAX_PER_WINDOW, default 30 per 60 s per user). With
--runs above that, the extra requests answer 429 and are counted as failures, not timed. Emergencies it creates are
cancelled again (not timed). Needs DEMO_MODE seed accounts patient@demo.test and staff@demo.test (password demo1234).
"""
import argparse
import json
import math
import os
import platform
import statistics
import sys
import time
import urllib.error
import urllib.request

HEART_INPUTS = {"age": 58, "sex": 1, "resting_bp": 138, "cholesterol": 240, "fasting_blood_sugar": 0,
                "max_heart_rate": 150, "exercise_angina": 0, "st_depression": 1.0}


def call(base, method, path, token=None, body=None, timeout=20):
    """Returns (status, parsed_json_or_None, milliseconds). Status 0 = no answer."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            status = resp.status
    except urllib.error.HTTPError as err:
        raw, status = err.read(), err.code
    except (urllib.error.URLError, OSError):
        return 0, None, (time.perf_counter() - start) * 1000
    ms = (time.perf_counter() - start) * 1000
    try:
        return status, json.loads(raw) if raw else None, ms
    except ValueError:
        return status, None, ms


def percentile(sorted_values, p):
    """Nearest-rank percentile of an ascending list."""
    if not sorted_values:
        return None
    k = max(1, math.ceil(p / 100 * len(sorted_values)))
    return sorted_values[k - 1]


def summarise(times, failures):
    s = sorted(times)
    return {"ok": len(s), "failed": failures, "p50_ms": round(statistics.median(s), 1) if s else None,
            "p95_ms": round(percentile(s, 95), 1) if s else None, "max_ms": round(s[-1], 1) if s else None}


def machine():
    cpu = platform.processor() or ""
    try:
        with open("/proc/cpuinfo", encoding="utf-8") as f:
            for line in f:
                if line.startswith("model name"):
                    cpu = line.split(":", 1)[1].strip()
                    break
    except OSError:
        pass
    return {"os": platform.platform(), "python": platform.python_version(), "cpu": cpu or "unknown",
            "logical_cpus": os.cpu_count(), "note": "client and backend normally run on the same machine"}


def timed(name, runs, fn):
    times, failures = [], 0
    for _ in range(runs):
        ok, ms = fn()
        if ok:
            times.append(ms)
        else:
            failures += 1
    return name, summarise(times, failures)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--runs", type=int, default=20)
    ap.add_argument("--out", default="")
    args = ap.parse_args(argv)
    base, runs = args.base.rstrip("/"), max(1, args.runs)

    status, body, _ = call(base, "POST", "/auth/login", body={"username": "patient@demo.test", "password": "demo1234"})
    if status != 200 or not body or not body.get("token"):
        print("Cannot log in as patient@demo.test (status %s). Is the backend running with the demo seed?" % status)
        return 2
    ptoken, pid = body["token"], body.get("patient_id") or "PT-2026-0417"
    status, body, _ = call(base, "POST", "/auth/login", body={"username": "staff@demo.test", "password": "demo1234"})
    if status != 200 or not body or not body.get("token"):
        print("Cannot log in as staff@demo.test (status %s)." % status)
        return 2
    stoken = body["token"]

    created = []

    def login():
        st, _, ms = call(base, "POST", "/auth/login", body={"username": "patient@demo.test", "password": "demo1234"})
        return st == 200, ms

    def vitals():
        st, _, ms = call(base, "GET", "/patients/%s/vitals" % pid, ptoken)
        return st == 200, ms

    def emergency():
        st, js, ms = call(base, "POST", "/emergencies", ptoken,
                          {"patient_id": pid, "type": "HEART", "symptoms": ["CHEST_PAIN"]})
        if st == 201 and js and js.get("id"):
            created.append(js["id"])
        return st == 201, ms

    def listing():
        st, _, ms = call(base, "GET", "/emergencies", stoken)
        return st == 200, ms

    def predict():
        st, _, ms = call(base, "POST", "/predictions/heart", ptoken, {"inputs": HEART_INPUTS})
        return st == 200, ms

    def organ():
        st, _, ms = call(base, "GET", "/patients/%s/organs/kidneys" % pid, ptoken)
        return st == 200, ms

    results = {}
    for name, fn in (("POST /auth/login", login), ("GET vitals", vitals), ("POST /emergencies", emergency),
                     ("GET /emergencies (staff)", listing), ("POST /predictions/heart", predict), ("GET organ", organ)):
        key, res = timed(name, runs, fn)
        results[key] = res

    for eid in created:                      # tidy up; not timed
        call(base, "POST", "/emergencies/%s/cancel" % eid, ptoken)

    report = {"what": "single-user local check, not a load test", "base": base, "runs_each": runs,
              "machine": machine(), "results": results,
              "when_utc": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())}
    print("Single-user local check, not a load test. %d requests each, one at a time." % runs)
    print("Machine: %(os)s | Python %(python)s | %(cpu)s | %(logical_cpus)s logical CPUs" % report["machine"])
    print("%-28s %5s %6s %9s %9s %9s" % ("call", "ok", "failed", "p50 ms", "p95 ms", "max ms"))
    for name, r in results.items():
        print("%-28s %5d %6d %9s %9s %9s" % (name, r["ok"], r["failed"], r["p50_ms"], r["p95_ms"], r["max_ms"]))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print("Wrote " + args.out)
    return 1 if any(r["failed"] for r in results.values()) else 0


if __name__ == "__main__":
    sys.exit(main())
