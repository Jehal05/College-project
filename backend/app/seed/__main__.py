"""python -m app.seed    (needs DEMO_MODE=true). Prints counts only, never a password."""
from app.config import demo_mode
from app.db import get_session_factory, init_db
from app.seed.demo_data import SeedRefused, seed_demo


def main() -> int:
    if not demo_mode():
        print("Refused: set DEMO_MODE=true to load demo data. Demo data must never be loaded in a real deployment.")
        return 1
    init_db()
    with get_session_factory()() as session:
        try:
            print(seed_demo(session))
        except SeedRefused as exc:
            print(f"Refused: {exc}")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
