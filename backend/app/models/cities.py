"""The city network (a fictional simulation): Ahmedabad and Pune. Loaded from app/seed/data/cities.json."""
from sqlalchemy import Column, Float, Integer, String

from app.db import Base


class City(Base):
    __tablename__ = "cities"

    city_id = Column(String, primary_key=True)             # AMD, PNQ (opaque, also the middle part of hospital ids)
    city_name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    lat = Column(Float, nullable=False)                    # centre of the map
    lng = Column(Float, nullable=False)
    timezone = Column(String, nullable=False, default="Asia/Kolkata")
    zoom = Column(Integer, nullable=False, default=12)
    start_lat = Column(Float, nullable=False)              # where a simulated emergency begins
    start_lng = Column(Float, nullable=False)
    start_label = Column(String)

    def as_dict(self) -> dict:
        return {"city_id": self.city_id, "city_name": self.city_name, "state": self.state, "lat": self.lat, "lng": self.lng,
                "timezone": self.timezone, "zoom": self.zoom,
                "simulation_start": {"lat": self.start_lat, "lng": self.start_lng, "label": self.start_label},
                "simulated": True}
