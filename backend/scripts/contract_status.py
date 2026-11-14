r"""Prints how much of CONTRACT.md exists in the real app.

Run from the backend folder:   python scripts/contract_status.py
(Windows PowerShell:           $env:PYTHONPATH="."; python scripts\contract_status.py)

It reads the app's own OpenAPI schema, so the numbers are real, not estimated.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DEMO_MODE", "true")  # the app may be imported without keys; nothing is started here

from app.main import app  # noqa: E402
from tests.contract_tools import app_endpoints, contract_endpoints  # noqa: E402


def main() -> int:
    in_contract, in_app = contract_endpoints(), app_endpoints(app)
    built, not_built = in_contract & in_app, in_contract - in_app
    undocumented = in_app - in_contract

    print(f"Endpoints in CONTRACT.md : {len(in_contract)}")
    print(f"Built in the app         : {len(built)}")
    print(f"NOT built yet            : {len(not_built)}")
    print(f"Served but undocumented  : {len(undocumented)}")
    print()
    print("Built:")
    for method, path in sorted(built, key=lambda e: (e[1], e[0])):
        print(f"  [x] {method:<6} {path}")
    print("Not built:")
    for method, path in sorted(not_built, key=lambda e: (e[1], e[0])):
        print(f"  [ ] {method:<6} {path}")
    if undocumented:
        print("Undocumented (add to CONTRACT.md or remove):")
        for method, path in sorted(undocumented):
            print(f"  [!] {method:<6} {path}")
    print()
    print("FREEZE READY" if not not_built and not undocumented else "NOT READY TO FREEZE")
    return 0 if not not_built and not undocumented else 1


if __name__ == "__main__":
    raise SystemExit(main())
