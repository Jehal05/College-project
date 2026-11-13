"""Who may read a patient's wellbeing insights and trend warning (features 54 and 53).

- The patient reads their own data. Nothing is logged for that.
- A linked FAMILY member may read it ONLY while the patient's `vitals` consent is on.
- Everyone else is refused.
Every read by someone other than the patient is written to the audit log,
allowed or denied.

TODO(feature 61): the family link table does not exist yet, so nobody is
"linked" for now (see get_family_link_checker in app/api/deps.py). When
Shagun's feature 61 and your endpoints exist, return the real link check there.
"""
from dataclasses import dataclass
from typing import Mapping, Optional, Tuple

from app.security.actor import Actor


@dataclass(frozen=True)
class Access:
    allowed: bool
    status: int = 200
    reason: Optional[str] = None          # an audit reason code when denied
    audit: bool = False                   # write an audit row?
    released: Tuple[str, ...] = ()        # consent names released (names only)


def decide_access(actor: Actor, patient_id: str, consents: Mapping[str, bool], family_linked: bool) -> Access:
    if actor.role == "PATIENT" and actor.patient_id == patient_id:
        return Access(allowed=True)
    if actor.role == "FAMILY" and family_linked:
        if consents.get("vitals", False):
            return Access(allowed=True, audit=True, released=("vitals",))
        return Access(allowed=False, status=403, reason="consent_missing", audit=True)
    # Not the patient, not a linked relative. Do not reveal whether a link exists.
    return Access(allowed=False, status=403, reason="forbidden_role", audit=True)
