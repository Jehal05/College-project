"""Login accounts (feature 33)."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, String

from app.db import Base
from app.models.enums import Role

_ROLES = ", ".join(repr(r.value) for r in Role)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"role IN ({_ROLES})", name="ck_users_role"),
        # A patient account always belongs to a patient, and a hospital desk account always belongs to a hospital.
        CheckConstraint("role != 'PATIENT' OR patient_id IS NOT NULL", name="ck_users_patient_has_patient"),
        CheckConstraint("role != 'HOSPITAL_STAFF' OR hospital_id IS NOT NULL", name="ck_users_staff_has_hospital"),
    )

    id = Column(String, primary_key=True)                  # for example usr_001
    login = Column(String, nullable=False, unique=True)    # what the person types: a username or an email (lowercase)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)         # bcrypt hash only, never the password
    role = Column(String, nullable=False)
    # Shown as `role` in the LOGIN ANSWER only when set (the portal's own demo accounts use "staff" / "admin").
    # Permissions always use `role`, never this label.
    role_label = Column(String)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
