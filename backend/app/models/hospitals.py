"""Hospitals and ambulances (features 7, 15, 42, 25). Names follow the hospital portal and the mock server."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String

from app.db import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String, primary_key=True)                  # for example HSP-AMD-001 (opaque)
    portal_id = Column(String)                             # the portal's own short id (H1..H5), kept for convenience
    name = Column(String, nullable=False)
    address = Column(String)
    phone = Column(String)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    verified = Column(Boolean, nullable=False, default=False)      # only verified hospitals are ever alerted
    # What the hospital can do (capabilities)
    cap_emergency = Column(Boolean, nullable=False, default=False)
    cap_cath_lab = Column(Boolean, nullable=False, default=False)
    cap_stroke_unit = Column(Boolean, nullable=False, default=False)
    cap_icu = Column(Boolean, nullable=False, default=False)
    # What is free right now (availability): the portal's key names
    beds_free = Column(Integer, nullable=False, default=0)
    icu_free = Column(Integer, nullable=False, default=0)
    cath_lab_ready = Column(Boolean, nullable=False, default=False)
    stroke_unit_ready = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    @property
    def capabilities(self) -> dict:
        return {"cath_lab": self.cap_cath_lab, "stroke_unit": self.cap_stroke_unit,
                "icu": self.cap_icu, "emergency": self.cap_emergency}

    @property
    def availability(self) -> dict:
        return {"beds_free": self.beds_free, "icu_free": self.icu_free,
                "cath_lab_ready": self.cath_lab_ready, "stroke_unit_ready": self.stroke_unit_ready}


class Ambulance(Base):
    __tablename__ = "ambulances"
    __table_args__ = (
        CheckConstraint("status IN ('available','dispatched','en_route')", name="ck_ambulances_status"),
    )

    id = Column(String, primary_key=True)                  # for example AMB-AMD-01 (opaque)
    portal_id = Column(String)
    call_sign = Column(String, nullable=False)
    crew_driver = Column(String)                           # fictional names
    crew_paramedic = Column(String)
    base_hospital_id = Column(String, ForeignKey("hospitals.id"))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="available")
