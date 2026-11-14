"""Health reports: PDF, JPG or PNG files the patient keeps (feature 9). Stored encrypted, owner only.

The file is checked by its type, its size and its first bytes, so a text file cannot be saved as a PDF.
"""
import re
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.patient_data import Report

FILE_TYPES = ("application/pdf", "image/jpeg", "image/png")
MAX_BYTES = 2 * 1024 * 1024
MAX_REPORTS = 10
_MAGIC = {"application/pdf": (b"%PDF-",), "image/jpeg": (b"\xff\xd8\xff",), "image/png": (b"\x89PNG\r\n\x1a\n",)}


class ReportError(ValueError):
    """The upload cannot be saved. `status` is the HTTP code and the message never repeats what was sent."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def content_type_of(header: Optional[str]) -> str:
    return (header or "").split(";")[0].strip().lower()


def check_type(content_type: str) -> None:
    if content_type not in FILE_TYPES:
        raise ReportError("Only PDF, JPG and PNG files are allowed", 415)


def clean_name(raw: Optional[str]) -> str:
    """Letters, digits, space, dot, dash and underscore only, at most 80 characters, 'report' when nothing is left."""
    name = re.sub(r"[^A-Za-z0-9 .\-_]", "", raw or "").strip()[:80].strip()
    return name or "report"


def check_body(content_type: str, data: bytes) -> None:
    if not data:
        raise ReportError("The file is empty", 400)
    if len(data) > MAX_BYTES:
        raise ReportError("File is larger than 2 MB", 413)
    if not any(data.startswith(m) for m in _MAGIC[content_type]):
        raise ReportError("The file content does not match its type", 400)


def info(report: Report) -> Dict[str, object]:
    """What a list shows. Never the file bytes."""
    uploaded = report.uploaded_at
    return {"id": report.id, "name": report.file_name, "content_type": report.content_type, "size": report.size,
            "uploaded_at": uploaded.strftime("%Y-%m-%dT%H:%M:%SZ") if uploaded else None}


def list_reports(session: Session, patient_id: str) -> List[Report]:
    return (session.query(Report).filter(Report.patient_id == patient_id)
            .order_by(Report.uploaded_at, Report.id).all())


def add_report(session: Session, patient_id: str, name: Optional[str], content_type: str, data: bytes) -> Report:
    check_type(content_type)
    check_body(content_type, data)
    if session.query(Report).filter(Report.patient_id == patient_id).count() >= MAX_REPORTS:
        raise ReportError("You can keep at most %d reports" % MAX_REPORTS, 409)
    report = Report(patient_id=patient_id, file_name=clean_name(name), content_type=content_type, size=len(data),
                    content=data)
    session.add(report)
    session.flush()
    return report


def find(session: Session, patient_id: str, report_id: str) -> Optional[Report]:
    return session.query(Report).filter(Report.patient_id == patient_id, Report.id == report_id).first()
