"""CONTRACT.md and the real app must agree (release hygiene).

Three rules:
1. Nothing is served that the contract does not describe.
2. Every contract endpoint is built, or is on the NOT_BUILT_YET list below.
3. Nothing on that list is secretly built already (so the list stays honest).

When you build an endpoint, delete it from NOT_BUILT_YET. This list is the
real measure of how far the project is from a feature freeze.
"""
from app.main import app
from tests.contract_tools import _cell_endpoints, app_endpoints, contract_endpoints

NOT_BUILT_YET = {
    ("POST", "/reports"),
    ("POST", "/family/link"), ("GET", "/family/patients"), ("POST", "/family/checkin"),
    ("POST", "/location-shares"), ("GET", "/responders/alerts"), ("POST", "/responders/{}/accept"),
    ("POST", "/responders/register"), ("GET", "/admin/users"), ("PATCH", "/admin/users"),
    ("GET", "/content/{}"), ("PUT", "/content/{}"), ("POST", "/feedback"), ("POST", "/privacy-requests"),
}


def test_every_endpoint_the_app_serves_is_in_the_contract():
    assert app_endpoints(app) - contract_endpoints() == set()


def test_every_contract_endpoint_is_built_or_on_the_not_built_list():
    unbuilt = contract_endpoints() - app_endpoints(app)
    assert unbuilt - NOT_BUILT_YET == set(), "Documented but missing from the app and not on NOT_BUILT_YET"


def test_nothing_on_the_not_built_list_is_actually_built():
    assert NOT_BUILT_YET & app_endpoints(app) == set(), "Built now: delete it from NOT_BUILT_YET"


def test_the_not_built_list_only_holds_contract_endpoints():
    assert NOT_BUILT_YET <= contract_endpoints()


def test_the_contract_has_a_sensible_number_of_endpoints():
    assert len(contract_endpoints()) >= 36        # the contract must never silently shrink


# ------------------------------------------------------------ the parser itself

def test_parser_reads_two_methods_on_one_path():
    assert _cell_endpoints("GET, PATCH /patients/{id}") == {("GET", "/patients/{}"), ("PATCH", "/patients/{}")}


def test_parser_reads_a_shared_prefix():
    assert _cell_endpoints("POST /emergencies/{id}/ack, /dispatch, /status") == {
        ("POST", "/emergencies/{}/ack"), ("POST", "/emergencies/{}/dispatch"), ("POST", "/emergencies/{}/status")}


def test_parser_ignores_query_strings_and_parameter_names():
    assert _cell_endpoints("GET /hospitals?lat&lng&type ") == {("GET", "/hospitals")}
    assert _cell_endpoints("GET /passport/{id}?token") == {("GET", "/passport/{}")}


def test_parser_reads_two_full_endpoints_in_one_cell():
    assert _cell_endpoints("GET /admin/users, PATCH /admin/users") == {("GET", "/admin/users"), ("PATCH", "/admin/users")}
