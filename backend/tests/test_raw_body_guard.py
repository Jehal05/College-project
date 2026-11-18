"""No new route may take a raw dictionary body without someone deciding it on purpose.

Every route below reads `body: Dict[str, Any]` and hands it to a service function (`clean_*` and friends)
that checks each field and raises a plain error. They are listed here so that a NEW raw-body route makes this
test fail. The fix is either a Pydantic model for the new route, or adding it to the list after checking that
its service validates every field. Do not add a name here just to make the test pass.
"""
import ast
import glob
import os

API_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "api")

REVIEWED = {
    ("admin_users.py", "update_user"),
    ("contacts.py", "create_contact"),
    ("contacts.py", "update_contact"),
    ("content.py", "write_content"),
    ("demo_panel.py", "run_scenario"),
    ("demo_panel.py", "demo_speed"),
    ("emergencies.py", "create_emergency"),
    ("emergencies.py", "send_sos"),
    ("emergencies.py", "cancel_emergency"),
    ("family.py", "link"),
    ("family.py", "checkin"),
    ("feedback.py", "send_feedback"),
    ("feedback.py", "privacy_request"),
    ("hospital_desk.py", "_own_hospital_only"),
    ("hospital_desk.py", "acknowledge"),
    ("hospital_desk.py", "dispatch"),
    ("hospital_desk.py", "move_on"),
    ("hospital_desk.py", "add_note"),
    ("hospital_desk.py", "add_chat"),
    ("hospital_desk.py", "tick"),
    ("hospitals.py", "update_availability"),
    ("hospitals.py", "create_hospital"),
    ("hospitals.py", "edit_hospital"),
    ("hospitals.py", "verify_hospital"),
    ("hospitals.py", "ambulance_location"),
    ("location_shares.py", "share"),
    ("passport_links.py", "create_link"),
    ("patients.py", "update_patient"),
    ("reminders.py", "add_reminder"),
    ("reminders.py", "update_reminder"),
    ("reminders.py", "reminder_shown"),
    ("reminders.py", "reminder_taken"),
    ("reminders.py", "write_preferences"),
    ("responders.py", "register"),
}


def raw_body_functions():
    found = set()
    for path in sorted(glob.glob(os.path.join(API_DIR, "*.py"))):
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for arg in node.args.args:
                    if arg.arg == "body" and arg.annotation is not None and "Dict" in ast.unparse(arg.annotation):
                        found.add((os.path.basename(path), node.name))
    return found


def test_no_new_raw_body_route_without_review():
    new = raw_body_functions() - REVIEWED
    assert not new, f"new raw-body route(s) {sorted(new)}: use a Pydantic model, or review the service validator and list it"


def test_the_reviewed_list_has_no_stale_names():
    gone = REVIEWED - raw_body_functions()
    assert not gone, f"remove from REVIEWED, no longer raw-body: {sorted(gone)}"
