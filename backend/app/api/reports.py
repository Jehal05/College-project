"""Health reports (J3): upload, list, download, delete. The PATIENT, for their own record only.

The upload body is the raw file (not JSON), with the file name in `?name=`. A wrong type is refused BEFORE the body
is read (415), and an upload over 2 MB is refused while it is still arriving (413).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import reports as svc

router = APIRouter(tags=["reports"])


def _own(db: Session, actor: Actor, patient_id: str, action: str) -> None:
    authorize_patient_record(db, actor, patient_id, action, "report")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


async def _read_body(request: Request) -> bytes:
    """Read at most MAX_BYTES + 1 bytes, so a huge upload is cut off instead of filling memory."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > svc.MAX_BYTES:
        raise svc.ReportError("File is larger than 2 MB", 413)
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > svc.MAX_BYTES:
            raise svc.ReportError("File is larger than 2 MB", 413)
    return bytes(data)


async def _upload(request: Request, db: Session, patient_id: str, name: Optional[str]) -> dict:
    try:
        content_type = svc.content_type_of(request.headers.get("content-type"))
        svc.check_type(content_type)                              # before the body is read
        data = await _read_body(request)
        report = svc.add_report(db, patient_id, name, content_type, data)
    except svc.ReportError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    db.commit()
    return svc.info(report)


@router.get("/patients/{patient_id}/reports")
def list_reports(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _own(db, actor, patient_id, "report.read")
    return [svc.info(r) for r in svc.list_reports(db, patient_id)]


@router.post("/patients/{patient_id}/reports", status_code=201)
async def upload_report(patient_id: str, request: Request, name: Optional[str] = None,
                        actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "report.write")
    return await _upload(request, db, patient_id, name)


@router.post("/reports", status_code=201)
async def upload_own_report(request: Request, name: Optional[str] = None,
                            actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    """The contract's own upload call: the same as the one above, for the caller's own record."""
    if actor.role != "PATIENT" or not actor.patient_id:
        authorize_patient_record(db, actor, actor.patient_id or "none", "report.write", "report")
    _own(db, actor, actor.patient_id, "report.write")
    return await _upload(request, db, actor.patient_id, name)


@router.get("/patients/{patient_id}/reports/{report_id}/file")
def download_report(patient_id: str, report_id: str, actor: Actor = Depends(get_current_actor),
                    db: Session = Depends(get_db)) -> Response:
    _own(db, actor, patient_id, "report.read")
    report = svc.find(db, patient_id, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(content=report.content or b"", media_type=report.content_type,
                    headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"})


@router.delete("/patients/{patient_id}/reports/{report_id}", status_code=204)
def delete_report(patient_id: str, report_id: str, actor: Actor = Depends(get_current_actor),
                  db: Session = Depends(get_db)) -> Response:
    _own(db, actor, patient_id, "report.write")
    report = svc.find(db, patient_id, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return Response(status_code=204)
