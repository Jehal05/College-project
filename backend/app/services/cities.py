"""The cities config. The file app/seed/data/cities.json is the truth: ensure_cities() copies it into the table."""
import json
from pathlib import Path
from typing import List

from sqlalchemy.orm import Session

from app.models.cities import City

CITIES_FILE = Path(__file__).resolve().parent.parent / "seed" / "data" / "cities.json"


def load_city_config() -> List[dict]:
    return json.loads(CITIES_FILE.read_text(encoding="utf-8"))["cities"]


def ensure_cities(session: Session) -> int:
    """Insert missing cities and bring existing ones in line with the file. Safe to call any number of times.

    The caller commits. Returns how many cities the file lists.
    """
    config = load_city_config()
    for c in config:
        start = c["simulation_start"]
        values = dict(city_name=c["city_name"], state=c["state"], lat=c["lat"], lng=c["lng"], timezone=c["timezone"],
                      zoom=c["zoom"], start_lat=start["lat"], start_lng=start["lng"], start_label=start.get("label"))
        row = session.get(City, c["city_id"])
        if row is None:
            session.add(City(city_id=c["city_id"], **values))
        else:
            for key, value in values.items():
                setattr(row, key, value)
    session.flush()
    return len(config)
