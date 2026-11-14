"""Tables behind the family, volunteer-responder and admin apps (J4). New tables only: no existing table changes."""
from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint)

from app.db import Base
from app.models.idgen import new_id
from app.security.types import EncryptedJSON, EncryptedText


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FamilyInvite(Base):
    """A code the patient gives to a relative. Single use, valid 24 hours. The demo code never expires (demo mode)."""
    __tablename__ = "family_invites"

    code = Column(String, primary_key=True)                # FAM-XXXX-XXXX
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    expires_at = Column(DateTime)                          # empty = never (the demo code only)
    reusable = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime)
    created_at = Column(DateTime, nullable=False, default=_utcnow)


class FamilyLink(Base):
    """Feature 61: this relative may see the plain status of this patient (and nothing the patient has not shared)."""
    __tablename__ = "family_links"
    __table_args__ = (UniqueConstraint("user_id", "patient_id", name="uq_family_links_pair"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    linked_at = Column(DateTime, nullable=False, default=_utcnow)


class FamilyCheckin(Base):
    """A relative's one-tap reply during an emergency. A plain record: no free text."""
    __tablename__ = "family_checkins"
    __table_args__ = (CheckConstraint("message IN ('ON_MY_WAY', 'CALLING_NOW', 'CANNOT_REACH')", name="ck_checkin_message"),)

    id = Column(String, primary_key=True, default=lambda: new_id("FC"))
    emergency_id = Column(String, ForeignKey("emergencies.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_utcnow)


class ResponderProfile(Base):
    """A volunteer account starts unverified. Only an admin verifies it."""
    __tablename__ = "responder_profiles"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    verified = Column(Boolean, nullable=False, default=False)


class ResponderAcceptance(Base):
    __tablename__ = "responder_acceptances"
    __table_args__ = (UniqueConstraint("emergency_id", "user_id", name="uq_acceptance_pair"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    emergency_id = Column(String, ForeignKey("emergencies.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    accepted_at = Column(DateTime, nullable=False, default=_utcnow)


class ContentItem(Base):
    """Medical text shown in the apps. A changed text is NOT shown until an admin approves it."""
    __tablename__ = "content_items"

    type = Column(String, primary_key=True)                # for example emergency_numbers
    version = Column(Integer, nullable=False, default=1)
    approved = Column(Boolean, nullable=False, default=False)
    approved_by = Column(String)                           # a user id, or "seed"
    items = Column(JSON, nullable=False)                   # list of texts
    updated_at = Column(DateTime, nullable=False, default=_utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (
        UniqueConstraint("emergency_id", "user_id", name="uq_feedback_pair"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_feedback_rating"),
    )

    id = Column(String, primary_key=True, default=lambda: new_id("FB"))
    emergency_id = Column(String, ForeignKey("emergencies.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(EncryptedText)                        # encrypted: people may write anything here
    created_at = Column(DateTime, nullable=False, default=_utcnow)


class PrivacyRequest(Base):
    """A request to export or delete a patient's data. SIMULATED, so it is recorded, nothing is exported or deleted."""
    __tablename__ = "privacy_requests"
    __table_args__ = (CheckConstraint("type IN ('EXPORT', 'DELETE')", name="ck_privacy_type"),)

    id = Column(String, primary_key=True, default=lambda: new_id("PR"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="RECEIVED")
    created_at = Column(DateTime, nullable=False, default=_utcnow)


class LocationShare(Base):
    """The patient shares where they are with their linked relatives for a limited time. One live share at a time."""
    __tablename__ = "location_shares"

    id = Column(String, primary_key=True, default=lambda: new_id("LS"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    location = Column(EncryptedJSON, nullable=False)       # {lat, lng, accuracy?, source?}
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
