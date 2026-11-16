"""POST /reports/extract (Phase 3, PROPOSED in docs/API_CONTRACT.md): propose lab values from a TEXT PDF.

Nothing is saved by this call. The patient app shows the proposal, the person checks and corrects it, and only then
calls POST /patients/{id}/lab-values. The PATIENT, for their own record only.

The file is the raw body (not JSON), at most 2 MB, like the existing upload. A scanned image needs OCR, which this
server does not have, so JPG and PNG answer 400. Reading PDF text needs the optional `pypdf` package; when it is not
installed the route answers 503 and nothing else in the server is affected.
"""
import io

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.api.reports import _read_body
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit, lab_values as lab_svc, report_text
from app.services import reports as svc

router = APIRouter(tags=["reports"])

MAX_PAGES = 30
NEEDS_OCR = "Scanned images need OCR, which is not available yet. Use a PDF with selectable text, or type the values in."


def pdf_text(data: bytes) -> str:
    """The text layer of a PDF. HTTPException 503 if pypdf is missing, 400 if the file cannot be read."""
    try:
        from pypdf import PdfReader                      # optional; imported only when a PDF is really read
    except ImportError:
        raise HTTPException(status_code=503, detail="Text reading is not installed on this server") from None
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise HTTPException(status_code=400, detail="This PDF is protected and cannot be read")
        parts = []
        for page in reader.pages[:MAX_PAGES]:
            parts.append(page.extract_text() or "")
            if sum(len(p) for p in parts) > report_text.MAX_CHARS:
                break
        return "\n".join(parts)
    except HTTPException:
        raise
    except Exception:                                    # a damaged file: pypdf raises many kinds of error
        raise HTTPException(status_code=400, detail="This PDF cannot be read") from None


@router.post("/reports/extract")
async def extract_report(request: Request, actor: Actor = Depends(get_current_actor),
                         db: Session = Depends(get_db)) -> dict:
    # One check. Only a PATIENT with a record of their own passes; everyone else gets 403 (audited with id "none").
    own = actor.patient_id if actor.role == "PATIENT" and actor.patient_id else "none"
    authorize_patient_record(db, actor, own, "report.extract", "report")
    if db.get(Patient, actor.patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        content_type = svc.content_type_of(request.headers.get("content-type"))
        svc.check_type(content_type)                                  # 415, before the body is read
        if content_type != "application/pdf":
            raise svc.ReportError(NEEDS_OCR, 400)
        data = await _read_body(request)                              # 413 while it is still arriving
        svc.check_body(content_type, data)                            # 400 empty or not really a PDF
    except svc.ReportError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    text = pdf_text(data)
    if not text.strip():
        raise HTTPException(status_code=400, detail=NEEDS_OCR)
    found = report_text.parse_report_text(text)
    audit.record(db, action="report.extract", resource_type="report", resource_id=None, patient_id=actor.patient_id,
                 outcome="allowed", actor=actor,
                 fields_released=[lab_svc.audit_name(v["test"]) for v in found["values"]])
    return {"status": "proposed", "values": found["values"], "unreadable": found["unreadable"],
            "notice": report_text.NOTICE}
