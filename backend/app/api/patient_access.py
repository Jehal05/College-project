"""Who may touch a patient's own record (Task 3).

The patient reads and changes their own record. An ADMIN may read the profile (what the patient agreed to share,
no phone numbers) and every such read is audited. Everybody else gets 403, and the attempt is audited.
The permission check always comes BEFORE the "does this patient exist" check, so a refusal never reveals
whether an id exists.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.security.actor import Actor
from app.services import audit


def is_owner(actor: Actor, patient_id: str) -> bool:
    return actor.role == "PATIENT" and actor.patient_id == patient_id


def authorize_patient_record(db: Session, actor: Actor, patient_id: str, action: str, resource: str,
                             *, admin_read: bool = False) -> str:
    """Returns "owner" or "admin", or raises 403 (and writes a denied audit row)."""
    if is_owner(actor, patient_id):
        return "owner"
    if admin_read and actor.role == "ADMIN":
        return "admin"
    audit.record(db, action=action, resource_type=resource, resource_id=patient_id, patient_id=patient_id,
                 outcome="denied", reason="forbidden_role", actor=actor)
    raise HTTPException(status_code=403, detail="Not allowed")
