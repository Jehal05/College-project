"""The whole heart attack story through the REAL login, from the patient's SOS to the handover (all simulated).

This is the path both apps use: patient creates and sends, the desk acknowledges, dispatches and moves it on,
and everyone who may hear about it does. One test, so a break anywhere shows up as one failing story.
"""
from sqlalchemy.orm import Session

from app.models.emergencies import Emergency, HospitalAlert
from app.seed.demo_data import DEMO_HOSPITAL_ID
from app.services import events

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")


def test_the_heart_attack_story(demo, engine):
    heard = []
    events.clear_subscribers()
    events.subscribe(heard.append)
    try:
        h = demo.headers
        made = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN", "SHORT_BREATH"]}, headers=h(*PATIENT)).json()
        eid = made["id"]
        assert made["state"] == "EMERGENCY_DETECTED"
        assert demo.get("/emergencies?status=active", headers=h(*STAFF)).json() == []          # nothing before the SOS

        sos = demo.post(f"/emergencies/{eid}/sos", json={}, headers=h(*PATIENT)).json()
        assert sos["state"] == "SOS_SENT" and sos["hospital"]["id"]
        with Session(engine) as s:                                   # the ranking may pick another hospital: use the desk's
            s.get(Emergency, eid).hospital_id = DEMO_HOSPITAL_ID
            for alert in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
                alert.hospital_id = DEMO_HOSPITAL_ID
            s.commit()
        assert [e["id"] for e in demo.get("/emergencies?status=active", headers=h(*STAFF)).json()] == [eid]

        assert demo.post(f"/emergencies/{eid}/ack", json={}, headers=h(*STAFF)).json()["state"] == "HOSPITAL_ACKNOWLEDGED"
        assert demo.post(f"/emergencies/{eid}/dispatch", json={"ambulance_id": "AMB-AMD-02", "eta_seconds": 300},
                         headers=h(*STAFF)).json()["state"] == "AMBULANCE_DISPATCHED"
        assert demo.post(f"/emergencies/{eid}/status", json={"state": "EN_ROUTE"}, headers=h(*STAFF)).status_code == 200
        assert demo.post("/ambulances/AMB-AMD-02/location",
                         json={"lat": 23.03, "lng": 72.56, "eta_seconds": 120, "emergency_id": eid},
                         headers=h(*STAFF)).status_code == 200
        assert demo.post(f"/emergencies/{eid}/status", json={"state": "ARRIVED"}, headers=h(*STAFF)).status_code == 200
        assert demo.post(f"/emergencies/{eid}/status", json={"state": "HANDOVER_DONE"}, headers=h(*STAFF)).status_code == 200

        assert demo.get("/emergencies?status=active", headers=h(*STAFF)).json() == []
        assert [e["id"] for e in demo.get("/emergencies?status=finished", headers=h(*STAFF)).json()] == [eid]

        mine = demo.get(f"/emergencies/{eid}", headers=h(*PATIENT)).json()
        assert [t["state"] for t in mine["timeline"]] == [
            "EMERGENCY_DETECTED", "SOS_SENT", "HOSPITAL_ACKNOWLEDGED", "AMBULANCE_DISPATCHED", "EN_ROUTE", "ARRIVED",
            "HANDOVER_DONE"]
        names = [e["event"] for e in heard]
        for expected in ("emergency.created", "emergency.sos_sent", "hospital.alerted", "hospital.acknowledged",
                         "ambulance.dispatched", "ambulance.location", "emergency.arrived", "emergency.handover_done"):
            assert expected in names, expected
        assert names.index("hospital.acknowledged") < names.index("ambulance.dispatched") < names.index("emergency.handover_done")
        summary = demo.get(f"/patients/{made['patient_id']}/emergencies/{eid}/summary", headers=h(*PATIENT)).json()
        assert summary["final_state"] == "HANDOVER_DONE" and summary["ambulance_id"] == "AMB-AMD-02"
        assert summary["durations"]["to_acknowledged"] is not None and summary["durations"]["to_handover"] is not None
    finally:
        events.clear_subscribers()
