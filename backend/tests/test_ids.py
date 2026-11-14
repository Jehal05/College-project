"""Readable ids (EM-YYYYMMDD-nnnn) and random ids."""
import re
import threading
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app import db as db_module
from app.models.idgen import new_id
from app.services.ids import next_daily_id, reset_counters

DAY1 = datetime(2026, 11, 14, 9, 30, tzinfo=timezone.utc)
DAY2 = datetime(2026, 11, 15, 0, 5, tzinfo=timezone.utc)


def test_the_first_id_of_the_day_ends_in_0001(session):
    assert next_daily_id(session, when=DAY1) == "EM-20261114-0001"


def test_ids_count_up(session):
    ids = [next_daily_id(session, when=DAY1) for _ in range(12)]
    assert ids[0] == "EM-20261114-0001" and ids[-1] == "EM-20261114-0012"
    assert len(set(ids)) == 12


def test_each_day_has_its_own_counter(session):
    assert next_daily_id(session, when=DAY1) == "EM-20261114-0001"
    assert next_daily_id(session, when=DAY2) == "EM-20261115-0001"
    assert next_daily_id(session, when=DAY1) == "EM-20261114-0002"


def test_the_prefix_has_its_own_counter(session):
    assert next_daily_id(session, "EM", DAY1) == "EM-20261114-0001"
    assert next_daily_id(session, "XX", DAY1) == "XX-20261114-0001"


def test_the_format():
    with Session(db_module.make_engine("sqlite://")) as s:
        db_module.init_db(s.get_bind())
        assert re.fullmatch(r"EM-\d{8}-\d{4}", next_daily_id(s))


def test_a_reset_starts_the_counter_again(session):
    next_daily_id(session, when=DAY1); next_daily_id(session, when=DAY1)
    reset_counters(session)
    assert next_daily_id(session, when=DAY1) == "EM-20261114-0001"


def test_a_rolled_back_transaction_does_not_burn_a_number(session):
    session.commit()
    next_daily_id(session, when=DAY1)
    session.rollback()
    assert next_daily_id(session, when=DAY1) == "EM-20261114-0001"


def test_many_threads_at_once_never_get_the_same_number(tmp_path):
    engine = db_module.make_engine(f"sqlite:///{tmp_path / 'ids.db'}")
    db_module.init_db(engine)
    results, errors = [], []

    def worker():
        try:
            for _ in range(5):
                with Session(engine) as s:
                    value = next_daily_id(s, when=DAY1)
                    s.commit()
                    results.append(value)
        except Exception as exc:                    # pragma: no cover - only on failure
            errors.append(repr(exc))

    threads = [threading.Thread(target=worker) for _ in range(8)]
    [t.start() for t in threads]; [t.join() for t in threads]
    assert not errors, errors
    assert len(results) == 40 and len(set(results)) == 40
    assert sorted(results)[0] == "EM-20261114-0001" and sorted(results)[-1] == "EM-20261114-0040"
    engine.dispose()


def test_random_ids_have_the_prefix_and_are_unique():
    ids = [new_id("C") for _ in range(20000)]
    assert all(re.fullmatch(r"C-[0-9A-F]{16}", i) for i in ids)
    assert len(set(ids)) == 20000
