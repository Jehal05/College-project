"""Feedback after an emergency, and privacy requests (J4)."""
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.apps import Feedback, PrivacyRequest

PRIVACY_TYPES = ("EXPORT", "DELETE")
MAX_COMMENT = 500


class FeedbackError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def clean_feedback(body) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise FeedbackError(400, "Send a JSON object")
    rating, comment, emergency_id = body.get("rating"), body.get("comment"), body.get("emergency_id")
    if not isinstance(emergency_id, str) or not emergency_id.strip():
        raise FeedbackError(400, "emergency_id is required")
    if isinstance(rating, bool) or not isinstance(rating, int) or not 1 <= rating <= 5:
        raise FeedbackError(400, "rating must be a whole number from 1 to 5")
    if comment is not None and (not isinstance(comment, str) or len(comment) > MAX_COMMENT):
        raise FeedbackError(400, f"comment must be text of {MAX_COMMENT} characters or less")
    return {"emergency_id": emergency_id.strip(), "rating": rating, "comment": (comment or "").strip() or None}


def add_feedback(session: Session, user_id: str, data: Dict[str, Any]) -> Feedback:
    if session.query(Feedback).filter_by(emergency_id=data["emergency_id"], user_id=user_id).first() is not None:
        raise FeedbackError(409, "You already sent feedback for this emergency")
    row = Feedback(emergency_id=data["emergency_id"], user_id=user_id, rating=data["rating"], comment=data["comment"])
    session.add(row)
    session.flush()
    return row


def clean_privacy(body) -> Dict[str, Optional[str]]:
    if not isinstance(body, dict):
        raise FeedbackError(400, "Send a JSON object")
    kind, patient_id = body.get("type"), body.get("patient_id")
    if kind not in PRIVACY_TYPES:
        raise FeedbackError(400, "type must be one of " + ", ".join(PRIVACY_TYPES))
    if patient_id is not None and (not isinstance(patient_id, str) or not patient_id.strip()):
        raise FeedbackError(400, "patient_id must be text")
    return {"type": kind, "patient_id": patient_id.strip() if patient_id else None}


def add_privacy_request(session: Session, user_id: str, patient_id: str, kind: str) -> PrivacyRequest:
    row = PrivacyRequest(patient_id=patient_id, user_id=user_id, type=kind)
    session.add(row)
    session.flush()
    return row
