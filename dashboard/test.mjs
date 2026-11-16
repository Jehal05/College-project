// Run: node test.mjs   (Node 18 or newer, no packages)
import assert from "node:assert/strict";
import * as L from "./lib.js";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok -", name); };

t("progress follows the main path", () => {
  assert.equal(L.progress("EMERGENCY_DETECTED").step, 1);
  assert.equal(L.progress("HANDOVER_DONE").pct, 100);
  assert.equal(L.progress("CANCELLED").tag, "CANCELLED");
  assert.equal(L.progress("ESCALATED").tag, "ESCALATED");
  assert.equal(L.progress("nonsense").step, 0);
});
t("isActive", () => {
  assert.equal(L.isActive({ state: "SOS_SENT" }), true);
  assert.equal(L.isActive({ state: "CANCELLED" }), false);
  assert.equal(L.isActive({ state: "HANDOVER_DONE" }), false);
  assert.equal(L.isActive(null), false);
});
t("timestamps without a zone are UTC", () => {
  assert.equal(L.parseTime("2026-11-16T12:00:00"), Date.parse("2026-11-16T12:00:00Z"));
  assert.equal(L.parseTime("2026-11-16T12:00:00Z"), Date.parse("2026-11-16T12:00:00Z"));
  assert.equal(L.parseTime("garbage"), null);
});
t("elapsed", () => {
  const now = Date.parse("2026-11-16T12:10:00Z");
  assert.equal(L.elapsed("2026-11-16T12:09:30Z", now), "30 s");
  assert.equal(L.elapsed("2026-11-16T12:00:00Z", now), "10 min");
  assert.equal(L.elapsed(null, now), "-");
});
t("mmss", () => { assert.equal(L.mmss(240), "4:00"); assert.equal(L.mmss(65), "1:05"); assert.equal(L.mmss(null), "-"); });
t("response times come from the timeline", () => {
  const e = { timeline: [
    { state: "SOS_SENT", seconds_since_start: 0 }, { state: "HOSPITAL_ACKNOWLEDGED", seconds_since_start: 26 },
    { state: "AMBULANCE_DISPATCHED", seconds_since_start: 40 }] };
  const r = L.responseTimes(e);
  assert.equal(r.toAck, 26); assert.equal(r.toDispatch, 40); assert.equal(r.toArrive, null); assert.equal(r.total, 40);
});
t("average ignores missing numbers", () => {
  assert.equal(L.average([10, null, 20, undefined]), 15);
  assert.equal(L.average([]), null);
});
t("tiles count only what the lists contain", () => {
  const em = [{ state: "SOS_SENT", severity: "EMERGENCY" }, { state: "EN_ROUTE", severity: "URGENT" }, { state: "CANCELLED" }];
  const hs = [{ availability: { beds_free: 3 } }, { availability: { beds_free: 0 } }, {}];
  assert.deepEqual(L.tiles(em, hs), { active: 2, critical: 1, enRoute: 1, hospitalsFree: 1 });
  assert.deepEqual(L.tiles(null, null), { active: 0, critical: 0, enRoute: 0, hospitalsFree: 0 });
});
t("vitals against the patient's own range", () => {
  const r = { min: 60, max: 85 };
  assert.equal(L.vsBaseline(72, r), "within"); assert.equal(L.vsBaseline(140, r), "above");
  assert.equal(L.vsBaseline(50, r), "below"); assert.equal(L.vsBaseline(72, null), "unknown");
  assert.equal(L.vsBaseline("x", r), "unknown");
  assert.equal(L.vsBaseline(60, r), "within", "the lower edge is inside the range");
  assert.equal(L.vsBaseline(85, r), "within", "the upper edge is inside the range");
});
t("the 60 second window keeps 20 points", () => {
  let a = []; for (let i = 0; i < 25; i++) a = L.pushWindow(a, i);
  assert.equal(a.length, 20); assert.equal(a[0], 5); assert.equal(a[19], 24);
});
t("hospital reasons use only returned fields", () => {
  const h = { capabilities: { cath_lab: true, emergency: true }, availability: { beds_free: 6, cath_lab_ready: true }, distance_km: 2.72 };
  const r = L.whyRanked(h, "HEART");
  assert.equal(r[0].ok, true); assert.match(r[0].text, /cath lab/);
  assert.ok(r.some(x => x.text === "2.7 km away")); assert.ok(r.some(x => x.text === "6 beds free"));
  const bad = L.whyRanked({ capabilities: { cath_lab: true }, availability: { cath_lab_ready: false } }, "HEART");
  assert.equal(bad[0].ok, false); assert.match(bad[0].text, /not ready/);
  assert.equal(L.whyRanked({ capabilities: {} }, "STROKE")[0].ok, false);
});
t("map projection keeps north up and stays inside the box", () => {
  const pts = [{ lat: 23.03, lng: 72.55 }, { lat: 23.04, lng: 72.57 }];
  const p = L.makeProjector(pts, 600, 400);
  const a = p(pts[0]), b = p(pts[1]);
  assert.ok(b.y < a.y, "more north is higher on screen");
  assert.ok(b.x > a.x, "more east is further right");
  for (const q of [a, b]) { assert.ok(q.x >= 0 && q.x <= 600 && q.y >= 0 && q.y <= 400); }
  assert.doesNotThrow(() => L.makeProjector([], 10, 10)({ lat: 1, lng: 1 }));
  const one = L.makeProjector([{ lat: 1, lng: 1 }], 100, 100)({ lat: 1, lng: 1 });
  assert.ok(Number.isFinite(one.x) && Number.isFinite(one.y), "a single point must not give NaN");
  const same = L.makeProjector([{ lat: 5, lng: 5 }, { lat: 5, lng: 5 }], 100, 100)({ lat: 5, lng: 5 });
  assert.ok(Number.isFinite(same.x) && Number.isFinite(same.y), "two identical points must not give NaN");
});
t("audit rows read both shapes and the CSV escapes", () => {
  assert.equal(L.auditRows({ rows: [1], items: [2] })[0], 1);
  assert.equal(L.auditRows({ items: [2] })[0], 2);
  assert.deepEqual(L.auditRows(null), []);
  const csv = L.auditCsv([{ timestamp: "t", action: 'a,"b"', fields_released: ["x"] }]).split("\n");
  assert.equal(csv.length, 2);
  assert.ok(csv[1].includes('"a,""b"""'));
  assert.ok(csv[1].includes('"[""x""]"'));
});

console.log("\n" + passed + " passed");
