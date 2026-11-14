"""Shared protection for tables that must never be edited or deleted
(consent ledger, audit log).

Three layers:
1. SQLite triggers abort any UPDATE or DELETE.
2. ORM events raise AppendOnlyError for update or delete of an object.
3. Services only ever insert.
The single exception is reset_table(), used by /demo/reset, and only when
DEMO_MODE=true.
"""
from typing import Optional

from sqlalchemy import DDL, event, text

from app.config import demo_mode


class AppendOnlyError(RuntimeError):
    """Someone tried to change or delete a row that must never change."""


def trigger_names(table_name: str) -> tuple:
    return (f"{table_name}_no_update", f"{table_name}_no_delete")


def trigger_sql(table_name: str, label: Optional[str] = None) -> tuple:
    update_name, delete_name = trigger_names(table_name)
    message = f"{label or table_name} is append-only"
    return (
        f"CREATE TRIGGER IF NOT EXISTS {update_name} BEFORE UPDATE ON {table_name} "
        f"BEGIN SELECT RAISE(ABORT, '{message}'); END;",
        f"CREATE TRIGGER IF NOT EXISTS {delete_name} BEFORE DELETE ON {table_name} "
        f"BEGIN SELECT RAISE(ABORT, '{message}'); END;",
    )


def protect(model, label: Optional[str] = None) -> None:
    """Make a mapped table append-only (triggers plus ORM guards)."""
    table = model.__table__
    name = label or table.name
    for sql in trigger_sql(table.name, label):
        event.listen(table, "after_create", DDL(sql).execute_if(dialect="sqlite"))

    @event.listens_for(model, "before_update")
    def _block_update(mapper, connection, target):
        raise AppendOnlyError(f"The {name} is append-only: rows cannot be changed.")

    @event.listens_for(model, "before_delete")
    def _block_delete(mapper, connection, target):
        raise AppendOnlyError(f"The {name} is append-only: rows cannot be deleted.")


def reset_table(session, table_name: str, label: Optional[str] = None) -> None:
    """Clear an append-only table. Allowed ONLY when DEMO_MODE=true. Caller commits."""
    if not demo_mode():
        raise AppendOnlyError(f"The {label or table_name} can only be cleared in DEMO_MODE")
    connection = session.connection()
    for name in trigger_names(table_name):
        connection.execute(text(f"DROP TRIGGER IF EXISTS {name}"))
    connection.execute(text(f"DELETE FROM {table_name}"))
    for sql in trigger_sql(table_name, label):
        connection.execute(text(sql))
