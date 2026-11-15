"""Runs the BACKEND ranking (app/services/hospital_match.py) and the PORTAL ranking (hospital-portal/src/services/ranking.js)
on the same hospitals and the same inputs, and prints where they first differ. Evidence for docs/DECISIONS_PHASE4.md.

Needs only Python and Node (no database, no web framework). From the backend folder:
    python scripts/compare_rankings.py            (markdown to the screen)
The hospitals are the backend seed (app/seed/data/hospitals.json); the portal sample data holds the same five hospitals
(same coordinates and capabilities), and the script checks that before it compares anything.
"""
import json
import os
import subprocess
import sys
import types
from types import SimpleNamespace

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(HERE, "..")
ROOT = os.path.join(BACKEND, "..")
sys.path.insert(0, BACKEND)

try:                                    # the real model needs SQLAlchemy; the ranking only needs its name
    from app.models.hospitals import Hospital  # noqa: F401
except Exception:                       # pragma: no cover - sandbox without the database libraries
    for name in ("sqlalchemy", "app.models", "app.models.hospitals"):
        sys.modules.setdefault(name, types.ModuleType(name))
    sys.modules["app.models.hospitals"].Hospital = object

from app.services import hospital_match  # noqa: E402

DEMO = {"lat": 23.0225, "lng": 72.5714}
CASES = [{"type": t, "label": "demo location", "location": DEMO} for t in ("HEART", "STROKE", "ASTHMA", "DIABETIC")] + [
    {"type": "HEART", "label": "near Navrangpura", "location": {"lat": 23.037, "lng": 72.55}},
    {"type": "HEART", "label": "near Maninagar", "location": {"lat": 22.997, "lng": 72.603}},
]


def load():
    with open(os.path.join(BACKEND, "app", "seed", "data", "hospitals.json"), encoding="utf-8") as fh:
        seed = json.load(fh)["hospitals"]
    with open(os.path.join(ROOT, "hospital-portal", "src", "data", "hospitals.json"), encoding="utf-8") as fh:
        portal = json.load(fh)
    return seed, portal


def check_same_data(seed, portal):
    by_id = {h["id"]: h for h in portal}
    problems = []
    for h in seed:
        p = by_id.get(h["portal_id"])
        if p is None:
            problems.append(f"{h['portal_id']} missing in the portal data")
            continue
        for key in ("lat", "lng", "verified", "capabilities", "availability"):
            if h.get(key) != p.get(key):
                problems.append(f"{h['portal_id']}.{key} differs: backend={h.get(key)} portal={p.get(key)}")
    return problems


def backend_rank(seed, case):
    objs = [SimpleNamespace(id=h["portal_id"], name=h["name"], lat=h["lat"], lng=h["lng"], verified=h["verified"],
                            cap_emergency=h["capabilities"]["emergency"], capabilities=h["capabilities"],
                            availability=h["availability"]) for h in seed]
    rows = hospital_match.rank_hospitals(objs, case["type"], case["location"])
    return [{"id": r["hospital"].id, "suitable": r["suitable"], "distance_km": r["distance_km"]} for r in rows]


def main():
    seed, portal = load()
    names = {h["id"]: h["name"].split(" ")[0] for h in portal}
    problems = check_same_data(seed, portal)
    print("## Data check\n")
    print("The backend seed and the portal sample data hold the same five hospitals: " + ("YES" if not problems else "NO"))
    for p in problems:
        print("- " + p)
    cases = [{"type": c["type"], "label": c["label"], "location": c["location"]} for c in CASES]
    node = subprocess.run(["node", os.path.join(ROOT, "hospital-portal", "scripts", "rank-for-compare.mjs"), json.dumps(cases)],
                          capture_output=True, text=True, check=True)
    portal_rows = json.loads(node.stdout)
    print("\n## Rankings on the same inputs\n")
    print("| type | patient at | backend order (suitable first, then nearest) | portal order (score) | first rank that differs |")
    print("|---|---|---|---|---|")
    differing = 0
    for case, prow in zip(CASES, portal_rows):
        b = backend_rank(seed, case)
        b_ids = [r["id"] for r in b if r["suitable"]] + [r["id"] for r in b if not r["suitable"]]
        p_ids = [r["id"] for r in prow["ranked"]]
        first = next((i + 1 for i, (x, y) in enumerate(zip(b_ids, p_ids)) if x != y), None)
        if first:
            differing += 1
        b_text = " > ".join(names[r["id"]] + ("" if r["suitable"] else "*") for r in b)
        p_text = " > ".join(f"{names[r['id']]} ({r['total']})" for r in prow["ranked"])
        if prow["ruled_out"]:
            p_text += "; ruled out: " + ", ".join(names[r["id"]] for r in prow["ruled_out"])
        print(f"| {case['type']} | {case['label']} | {b_text} | {p_text} | {first or 'same'} |")
    print("\n`*` = the backend lists it but marks it NOT suitable (it still gets a rank, after the suitable ones).")
    print(f"\nOrders that differ: {differing} of {len(CASES)}.")


if __name__ == "__main__":
    main()
