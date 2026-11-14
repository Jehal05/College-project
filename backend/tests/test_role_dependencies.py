"""require_role and the demo access rule, tried on small throw-away routes."""
import pytest
from fastapi import Depends
from fastapi.testclient import TestClient

from app.api.deps import get_current_actor, get_optional_actor, require_demo_access, require_role
from app.main import create_app
from app.models.enums import Role

LOGINS = {"patient": ("patient@demo.test", "demo1234"), "staff": ("staff1", "demo-password"),
          "admin": ("admin1", "demo-password"), "family": ("family1", "demo-password")}


@pytest.fixture
def routes(demo):
    application = create_app()

    @application.get("/_t/admin")
    def admin_only(actor=Depends(require_role("ADMIN"))):
        return {"who": actor.user_id}

    @application.get("/_t/staff-or-admin")
    def staff_or_admin(actor=Depends(require_role(Role.HOSPITAL_STAFF, Role.ADMIN))):
        return {"role": actor.role, "hospital": actor.hospital_id}

    @application.get("/_t/anyone")
    def anyone(actor=Depends(get_current_actor)):
        return {"role": actor.role, "patient": actor.patient_id}

    @application.get("/_t/maybe")
    def maybe(actor=Depends(get_optional_actor)):
        return {"who": actor.user_id if actor else None}

    @application.get("/_t/demo")
    def demo_only(actor=Depends(require_demo_access)):
        return {"role": actor.role}

    application.dependency_overrides.update(demo.client.app.dependency_overrides)
    demo.client = TestClient(application)
    return demo


def get(routes, path, who=None):
    headers = routes.headers(*LOGINS[who]) if who else {}
    return routes.client.get(path, headers=headers)


@pytest.mark.parametrize("who, status", [("admin", 200), ("patient", 403), ("staff", 403), ("family", 403), (None, 401)])
def test_a_route_for_one_role_only(routes, who, status):
    assert get(routes, "/_t/admin", who).status_code == status


@pytest.mark.parametrize("who, status", [("staff", 200), ("admin", 200), ("patient", 403), ("family", 403), (None, 401)])
def test_a_route_for_two_roles_accepts_enum_members(routes, who, status):
    assert get(routes, "/_t/staff-or-admin", who).status_code == status


def test_the_actor_carries_the_users_scope(routes):
    assert get(routes, "/_t/staff-or-admin", "staff").json() == {"role": "HOSPITAL_STAFF", "hospital": "HSP-AMD-002"}
    assert get(routes, "/_t/anyone", "patient").json() == {"role": "PATIENT", "patient": "PT-2026-0417"}


def test_a_403_has_the_shared_error_shape(routes):
    body = get(routes, "/_t/admin", "patient").json()
    assert body == {"error": "Not allowed", "detail": "Not allowed"}


def test_no_login_is_none_and_a_good_login_is_known(routes):
    assert get(routes, "/_t/maybe").json() == {"who": None}
    assert get(routes, "/_t/maybe", "staff").json() == {"who": "usr_005"}


def test_a_bad_login_is_never_treated_as_no_login(routes):
    assert routes.client.get("/_t/maybe", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_the_demo_rule_checks_demo_mode_before_the_login(routes, monkeypatch):
    assert get(routes, "/_t/demo", "patient").status_code == 200
    assert get(routes, "/_t/demo").status_code == 401
    monkeypatch.setenv("DEMO_MODE", "false")
    assert get(routes, "/_t/demo", "patient").status_code == 404
    assert get(routes, "/_t/demo").status_code == 404
