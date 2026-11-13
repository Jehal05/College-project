"""Reads the endpoint tables in CONTRACT.md and compares them with the real app routes.

Path parameter names differ between the contract ({id}) and FastAPI ({patient_id}),
so every {name} is turned into {} before comparing.
"""
import re
from pathlib import Path
from typing import Set, Tuple

CONTRACT = Path(__file__).resolve().parent.parent / "CONTRACT.md"
METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE")
_ROW = re.compile(r"^\|\s*((?:GET|POST|PUT|PATCH|DELETE)\b[^|]*)\|")
Endpoint = Tuple[str, str]


def normalize(path: str) -> str:
    path = path.split("?")[0].strip().rstrip("/") or "/"
    return re.sub(r"\{[^}]*\}", "{}", path)


def _cell_endpoints(cell: str) -> Set[Endpoint]:
    """'GET, PATCH /patients/{id}' and 'POST /emergencies/{id}/ack, /dispatch, /status' both work."""
    found: Set[Endpoint] = set()
    pending: list = []
    last_path = None
    for token in [t.strip() for t in cell.split(",") if t.strip()]:
        words = token.split()
        if words[0] in METHODS and len(words) == 1:
            pending.append(words[0])
        elif words[0] in METHODS:
            methods, path = pending + [words[0]], words[1]
            pending, last_path = [], path
            found.update((m, normalize(path)) for m in methods)
            last_methods = methods
        elif words[0].startswith("/") and last_path is not None:
            base = last_path.rsplit("/", 1)[0]          # share the same method and parent path
            found.update((m, normalize(base + words[0])) for m in last_methods)
    return found


def contract_endpoints(path: Path = CONTRACT) -> Set[Endpoint]:
    found: Set[Endpoint] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        match = _ROW.match(line.strip())
        if match:
            found |= _cell_endpoints(match.group(1))
    return found


def app_endpoints(app) -> Set[Endpoint]:
    """Every endpoint the app really serves, read from its OpenAPI schema.

    (Walking app.routes is not reliable: newer FastAPI wraps included routers.)
    """
    found: Set[Endpoint] = set()
    for path, operations in app.openapi()["paths"].items():
        for method in operations:
            if method.upper() in METHODS:
                found.add((method.upper(), normalize(path)))
    return found


# ---------------------------------------------------------------- other parts of the contract

def _section(title: str) -> str:
    """The text of one heading of CONTRACT.md, up to the next heading of the same or higher level."""
    text = CONTRACT.read_text(encoding="utf-8")
    start = text.index(title)
    level = len(title) - len(title.lstrip("#"))
    rest = text[start + len(title):]
    match = re.search(rf"^#{{1,{level}}} ", rest, flags=re.MULTILINE)
    return rest[: match.start()] if match else rest


def contract_state_chain() -> list:
    """The nine states of section 1.1 in order."""
    line = next(l for l in _section("### 1.1 Emergency states (in order)").splitlines() if "→" in l)
    return re.findall(r"[A-Z][A-Z_]{3,}", line)


def contract_extra_states() -> set:
    line = next(l for l in _section("### 1.1 Emergency states (in order)").splitlines() if l.startswith("Extra states"))
    return set(re.findall(r"[A-Z][A-Z_]{3,}", line.split(":", 1)[1]))


def contract_transitions() -> dict:
    """Section 2's table: state -> set of allowed next states."""
    table = {}
    for line in _section("## 2. State transition table").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 2 and re.fullmatch(r"[A-Z][A-Z_]{3,}", cells[0]):
            table[cells[0]] = set(re.findall(r"[A-Z][A-Z_]{3,}", re.sub(r"\(.*?\)", "", cells[1]).replace("none", "")))
    return table


def contract_roles() -> set:
    line = next(l for l in _section("### 1.4 Roles").splitlines() if "`" in l)
    return set(re.findall(r"`([A-Z_]+)`", line))


def contract_tables() -> set:
    return set(re.findall(r"`([a-z_]+)`", _section("## 6. Data tables")))
