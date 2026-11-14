"""The admin's user list and changes (J4). ADMIN only. A disabled or re-roled user is signed out at once,
because every request looks the user up again."""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.security.actor import Actor
from app.services import accounts as svc
from app.services import audit

router = APIRouter(tags=["admin"])


def _admin(db: Session, actor: Actor, action: str) -> None:
    if actor.role != "ADMIN":
        audit.record(db, action=action, resource_type="user", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/admin/users")
def list_users(role: Optional[str] = None, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _admin(db, actor, "admin.users")
    try:
        return svc.list_users(db, role)
    except svc.AccountError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None


@router.patch("/admin/users")
def update_user(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _admin(db, actor, "admin.update")
    try:
        row, changed = svc.update_user(db, actor.user_id, svc.clean_patch(body))
    except svc.AccountError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    db.commit()
    audit.record(db, action="admin.update", resource_type="user", resource_id=row["id"], outcome="allowed",
                 actor=actor, fields_released=changed)
    return row
