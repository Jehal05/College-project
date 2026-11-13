// In-memory data for the mock server. Everything resets when the server restarts
// (or when POST /demo/reset is called). All data here is FAKE.
const users = require('./data/users.json');
const hospitals = require('./data/hospitals.json').hospitals;
const ambulances = require('./data/ambulances.json').ambulances.map((a) => ({ ...a }));
const emergencyTypes = require('./data/emergencyTypes.json');
const baseline = require('./data/baseline.json');

const seedPatient = () => JSON.parse(JSON.stringify(require('./data/patient.json'))); // deep copy

const patients = { 'PT-2026-0417': seedPatient() };
const tokens = new Map(); // token -> user
const emergencies = new Map(); // id -> emergency
let emergencyCounter = 0;

// Phase 3 data, kept in memory only: uploaded reports (with their bytes) and the consent change log.
const reports = { 'PT-2026-0417': [] };
const consentChanges = { 'PT-2026-0417': [] };
const counters = { contact: 2, report: 0, reminder: 2 }; // C-1 and C-2 are in the seed
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
const reminders = { 'PT-2026-0417': seedReminders() };
const reminderLog = { 'PT-2026-0417': [] }; // { reminder_id, scheduled_for, taken_at | null }
const preferences = { 'PT-2026-0417': seedPreferences() };

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
  patients['PT-2026-0417'] = seedPatient();
  reports['PT-2026-0417'] = [];
  consentChanges['PT-2026-0417'] = [];
  counters.contact = 2;
  counters.report = 0;
  counters.reminder = 2;
  reminders['PT-2026-0417'] = seedReminders();
  reminderLog['PT-2026-0417'] = [];
  preferences['PT-2026-0417'] = seedPreferences();
  for (const k of Object.keys(passports)) delete passports[k];
  passportTokens.clear();
  accessLog.length = 0;
  hospitals.forEach((h, i) => { h.availability = { ...seedAvailability[i] }; });
}

module.exports = { users, hospitals, ambulances, emergencyTypes, patients, tokens, emergencies, nextEmergencyId, resetStore,
  baseline, reports, consentChanges, counters, passports, passportTokens, accessLog, reminders, reminderLog, preferences };
