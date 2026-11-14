"""Who is making a request. Login (Phase 1, Task 3) will build this from the JWT."""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Actor:
    user_id: str
    role: str                      # PATIENT, HOSPITAL_STAFF, ADMIN, FAMILY, RESPONDER
    patient_id: Optional[str] = None  # set for PATIENT users, the patient they are
    hospital_id: Optional[str] = None  # set for hospital desk users (and the demo admin), the hospital they belong to
