"""GET /cities: the list of cities the apps offer, read from the cities table (which is filled from cities.json).

Any logged-in role may read it. It holds no personal data.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.cities import City
from app.security.actor import Actor

router = APIRouter(tags=["cities"])


@router.get("/cities")
def list_cities(actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    return [c.as_dict() for c in db.query(City).order_by(City.city_id)]
