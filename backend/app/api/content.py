"""Medical content with an approval step (J4). Any login reads APPROVED text; only an admin edits or sees the rest."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.security.actor import Actor
from app.services import audit
from app.services import content as svc

router = APIRouter(tags=["content"])


@router.get("/content/{content_type}")
def read_content(content_type: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    try:
        return svc.read(db, content_type, actor.role == "ADMIN")
    except svc.ContentError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None


@router.put("/content/{content_type}")
def write_content(content_type: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                  db: Session = Depends(get_db)) -> dict:
    if actor.role != "ADMIN":
        audit.record(db, action="content.update", resource_type="content", resource_id=content_type, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    try:
        answer = svc.write(db, content_type, actor.user_id, svc.clean_put(body))
    except svc.ContentError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    db.commit()
    audit.record(db, action="content.update", resource_type="content", resource_id=content_type, outcome="allowed", actor=actor)
    return answer
