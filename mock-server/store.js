// In-memory data for the mock server. Everything resets when the server restarts
// (or when POST /demo/reset is called). All data here is FAKE.
const demoAccounts = require('./demoAccounts');
const users = [...require('./data/users.json'), ...demoAccounts.createUsers()]; // fixed logins + five demo patients with random passwords
const hospitals = require('./data/hospitals.json').hospitals;
const ambulances = require('./data/ambulances.json').ambulances.map((a) => ({ ...a }));
const emergencyTypes = require('./data/emergencyTypes.json');
const baseline = require('./data/baseline.json');
const cities = require('./data/cities.json').cities;
const morePatients = require('./data/patients_more.json').patients; // copied from the backend seed (same ids and names)

const seedPatient = () => JSON.parse(JSON.stringify(require('./data/patient.json'))); // deep copy

const seedAll = () => {
  const out = { 'PT-2026-0417': seedPatient() };
  const baselines = { 'PT-2026-0417': baseline };
  for (const p of JSON.parse(JSON.stringify(morePatients))) {
    const { baseline: b, ...rest } = p;
    out[p.id] = rest; baselines[p.id] = { ...b, updated_at: baseline.updated_at };
  }
  return { out, baselines };
};
const seeded = seedAll();
const patients = seeded.out;
const baselines = seeded.baselines; // patient id -> usual ranges
const tokens = new Map(); // token -> user
const emergencies = new Map(); // id -> emergency
let emergencyCounter = 0;

// Phase 3 data, kept in memory only: uploaded reports (with their bytes) and the consent change log.
const each = (make) => Object.fromEntries(Object.keys(patients).map((id) => [id, make()]));
const reports = each(() => []);
const consentChanges = each(() => []);
const counters = { contact: 12, report: 0, reminder: 2 }; // C-1 to C-12 are in the seed (C-1, C-2 for the first patient)
const passports = {}; // patient id -> passport (Phase 5)
const passportTokens = new Map(); // token -> passport
const accessLog = []; // Phase 9: who looked at or changed what (passport views, availability, consents). Never holds tokens.
const seedAvailability = hospitals.map((h) => ({ ...h.availability }));

// Phase 6: medication reminders (fake), their 7-day log and the patient's small preferences. In memory only.
const seedReminders = () => [
  { id: 'M-1', name: 'Metformin 500 mg', dose_note: 'as written by your doctor', times: ['08:00'], days: [0, 1, 2, 3, 4, 5, 6], paused: false },
  { id: 'M-2', name: 'Amlodipine 5 mg', dose_note: 'as written by your doctor', times: ['20:00'], days: [1, 2, 3, 4, 5], paused: false },
];
const seedPreferences = () => ({ safety_checkin: { enabled: false, minutes: 15 } });
const reminders = each(seedReminders);
const reminderLog = each(() => []); // { reminder_id, scheduled_for, taken_at | null }
const preferences = each(seedPreferences);

function nextEmergencyId() {
  emergencyCounter += 1;
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return 'EM-' + d + '-' + String(emergencyCounter).padStart(4, '0');
}

// Used by POST /demo/reset: forget all emergencies and restore the seed patient.
// Logins stay valid so the app does not log out.
function resetStore() {
  emergencies.clear();
  ambulances.forEach((a, i) => Object.assign(a, require('./data/ambulances.json').ambulances[i]));
  emergencyCounter = 0;
  const fresh = seedAll();
  for (const id of Object.keys(patients)) delete patients[id];
  Object.assign(patients, fresh.out);
  Object.assign(baselines, fresh.baselines);
  for (const id of Object.keys(patients)) {
    reports[id] = []; consentChanges[id] = []; reminders[id] = seedReminders(); reminderLog[id] = []; preferences[id] = seedPreferences();
  }
  counters.contact = 12;
  counters.report = 0;
  counters.reminder = 2;
  for (const k of Object.keys(passports)) delete passports[k];
  passportTokens.clear();
  accessLog.length = 0;
  hospitals.forEach((h, i) => { h.availability = { ...seedAvailability[i] }; });
}

const emergencyCounterValue = () => emergencyCounter;
const setEmergencyCounter = (n) => { emergencyCounter = n; };
const availability = () => hospitals.map((h) => h.availability);

module.exports = { emergencyCounterValue, setEmergencyCounter, availability, users, hospitals, ambulances, emergencyTypes, patients, tokens, emergencies, nextEmergencyId, resetStore,
  baseline, baselines, cities, reports, consentChanges, counters, passports, passportTokens, accessLog, reminders, reminderLog, preferences };
